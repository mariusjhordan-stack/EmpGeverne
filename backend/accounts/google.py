"""
Verifica el token de identidad que entrega Firebase después de "Continuar con Google".

Comprueba la firma con las claves públicas de Google, el proyecto, el emisor y la caducidad,
y que la cuenta sea de Google con el correo verificado. No usa ninguna clave secreta.
"""
from dataclasses import dataclass

import jwt
from django.conf import settings

from config.tls import verified_ssl_context

KEYS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
_client = None


class GoogleTokenError(Exception):
    """El token no es válido (firma, proyecto, caducidad, proveedor o correo)."""


class GoogleUnavailable(Exception):
    """No se pudieron obtener las claves públicas de Google, o falta configurar el proyecto."""


@dataclass(frozen=True)
class GoogleIdentity:
    subject: str
    email: str
    name: str


def _keys():
    """Cliente de claves de Google; las guarda una hora y vuelve a pedirlas si llega una que no conoce."""
    global _client
    if _client is None:
        _client = jwt.PyJWKClient(
            KEYS_URL, cache_keys=True, lifespan=3600, timeout=5,
            # El Python de python.org en macOS no trae certificados: ver config/tls.py.
            ssl_context=verified_ssl_context(),
        )
    return _client


def verify_google_token(token):
    project = settings.FIREBASE_PROJECT_ID
    if not project:
        raise GoogleUnavailable('Falta FIREBASE_PROJECT_ID.')
    try:
        key = _keys().get_signing_key_from_jwt(token)
    except jwt.PyJWKClientConnectionError as exc:
        raise GoogleUnavailable('No se pudieron descargar las claves de Google.') from exc
    except (jwt.PyJWKClientError, jwt.PyJWKError, jwt.DecodeError) as exc:
        raise GoogleTokenError('Clave desconocida o token mal formado.') from exc
    try:
        claims = jwt.decode(
            token, key.key, algorithms=['RS256'], audience=project,
            issuer=f'https://securetoken.google.com/{project}', leeway=30,
            options={'require': ['exp', 'iat', 'sub', 'aud', 'iss']},
        )
    except jwt.InvalidTokenError as exc:
        raise GoogleTokenError('Token inválido.') from exc
    provider = (claims.get('firebase') or {}).get('sign_in_provider')
    email = (claims.get('email') or '').strip().lower()
    subject = claims.get('sub') or ''
    if provider != 'google.com' or not email or not subject or claims.get('email_verified') is not True:
        raise GoogleTokenError('No es una cuenta de Google con correo verificado.')
    return GoogleIdentity(subject=subject, email=email, name=(claims.get('name') or '').strip())
