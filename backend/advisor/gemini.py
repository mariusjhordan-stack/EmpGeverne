"""Google Gemini over its REST API, standard library only. Port of GeminiAdapter (Java).

The API key travels only in the x-goog-api-key header and is never logged or returned. The configured models
are tried in turn: when one is rate limited, fails, times out or returns invalid JSON, the next one answers.
Models that failed rest for a while and are only used as a last resort.
"""
import json
import logging
import re
import socket
import threading
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings

from config.tls import verified_ssl_context

log = logging.getLogger(__name__)

# Same chain as the Java project (app.gemini.models); override with GEMINI_MODELS in .env.
DEFAULT_MODELS = [
    'gemini-3.5-flash-lite', 'gemini-3-flash-preview', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.8-flash',
    'gemini-3.7-flash', 'gemini-3.1-flash-lite', 'gemini-4-hydrogen', 'gemma-4-26b-a4b-it', 'gemma-4-31b-it',
    'gemini-3.1-pro-preview', 'gemini-4-neon', 'gemini-4-argon', 'gemini-4-carbon',
]

_resting = {}  # model -> monotonic time until which it is rested
_lock = threading.Lock()


_SSL = verified_ssl_context()  # ver config/tls.py


class GeminiUnavailable(Exception):
    """No key, or no model gave a usable answer."""


def reset():
    """Forget which models are resting (used by tests)."""
    with _lock:
        _resting.clear()


def _rest(model, seconds):
    with _lock:
        _resting[model] = time.monotonic() + seconds


def _setting(name, default):
    return getattr(settings, name, default) or default


def generate_json(instructions, conversation, schema, accept=None):
    """conversation: [{'role': 'user'|'model', 'text': str}]. Returns (parsed JSON dict, model name).

    accept: optional predicate on the parsed dict; a model whose answer it rejects counts as failed.
    """
    key = (getattr(settings, 'GEMINI_API_KEY', '') or '').strip()
    if not key:
        raise GeminiUnavailable('no API key')
    body = {
        'systemInstruction': {'parts': [{'text': instructions}]},
        'contents': [{'role': m['role'], 'parts': [{'text': m['text']}]} for m in conversation],
        'generationConfig': {
            'temperature': 0.3, 'maxOutputTokens': 2048,
            'thinkingConfig': {'thinkingLevel': 'low'},
            'responseMimeType': 'application/json', 'responseSchema': schema,
        },
    }
    models = list(_setting('GEMINI_MODELS', DEFAULT_MODELS))
    per_call = float(_setting('GEMINI_TIMEOUT', 20))
    now = time.monotonic()
    deadline = now + float(_setting('GEMINI_TOTAL_TIMEOUT', 30))
    with _lock:
        # Healthy models in their configured order; resting ones last, soonest to recover first.
        order = sorted(models, key=lambda m: max(now, _resting.get(m, 0)))
    for model in order:
        remaining = deadline - time.monotonic()
        if remaining < 1:
            break
        data = _try_model(model, body, key, min(per_call, remaining))
        if data is None:
            continue
        if accept is not None and not accept(data):
            log.warning('Gemini model %s returned an unusable answer', model)
            continue
        log.info('Gemini model %s answered', model)
        return data, model
    raise GeminiUnavailable('no model answered')


def _request_for(model, body):
    if not model.startswith('gemma'):
        return body
    # Gemma rejects the thinking level and system instructions: put the instructions in the first turn.
    config = {k: v for k, v in body['generationConfig'].items() if k != 'thinkingConfig'}
    contents = [dict(c) for c in body['contents']]
    if contents:
        first = contents[0]
        first['parts'] = [{'text': body['systemInstruction']['parts'][0]['text'] + '\n\nCUSTOMER:\n'}] + first['parts']
    return {'contents': contents, 'generationConfig': config}


def _try_model(model, body, key, timeout):
    base = str(_setting('GEMINI_API_BASE_URL', 'https://generativelanguage.googleapis.com')).rstrip('/')
    url = f'{base}/v1beta/models/{model}:generateContent'
    req = Request(url, data=json.dumps(_request_for(model, body)).encode('utf-8'), method='POST',
                  headers={'Content-Type': 'application/json', 'x-goog-api-key': key})
    try:
        with urlopen(req, timeout=timeout, context=_SSL) as resp:
            raw = resp.read()
    except HTTPError as e:
        code = e.code
        log.warning('Gemini model %s answered with status %s', model, code)
        _rest(model, 600 if code == 429 else 45 if code >= 500 else 3600)
        return None
    except (URLError, TimeoutError, socket.timeout, ConnectionError, OSError) as e:
        log.warning('Gemini model %s could not be reached: %s', model, type(e).__name__)
        _rest(model, 45)
        return None
    try:
        response = json.loads(raw.decode('utf-8'))
        parts = response['candidates'][0]['content']['parts']
        text = ''.join(p.get('text', '') for p in parts if not p.get('thought'))
        data = json.loads(_strip_fences(text))
    except (ValueError, KeyError, IndexError, TypeError, AttributeError):
        log.warning('Gemini model %s returned invalid JSON', model)
        return None
    if not isinstance(data, dict):
        log.warning('Gemini model %s returned invalid JSON', model)
        return None
    return data


def _strip_fences(text):
    text = text.strip()
    m = re.fullmatch(r'```(?:json)?\s*(.*?)\s*```', text, re.DOTALL)
    return m.group(1) if m else text
