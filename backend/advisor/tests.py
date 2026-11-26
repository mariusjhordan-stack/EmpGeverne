import json
from decimal import Decimal
from unittest import mock
from urllib.error import HTTPError

from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from catalog.models import Brand, Collection, Watch

from . import gemini
from .currency import EUR, PEN, USD

URL = '/api/advisor/chat/'


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def read(self):
        return self.payload

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def gemini_body(text):
    """What the Gemini REST API returns, with `text` as the model output."""
    return FakeResponse(json.dumps({'candidates': [{'content': {'parts': [{'text': text}]}}]}).encode())


def model_answer(reply='Te recomiendo estos relojes.', on_topic=True, budget=0, currency='PEN', ids=()):
    return gemini_body(json.dumps({'reply': reply, 'onTopic': on_topic, 'budget': budget,
                                   'budgetCurrency': currency, 'productIds': [str(i) for i in ids]}))


def http_error(code):
    return HTTPError('https://example.invalid', code, 'error', {}, None)


@override_settings(GEMINI_API_KEY='', GEMINI_MODELS=['model-a', 'model-b'],
                   GEMINI_API_BASE_URL='https://gemini.test')
class AdvisorTestBase(TestCase):
    @classmethod
    def setUpTestData(cls):
        rolex = Brand.objects.create(name='Rolex', slug='rolex')
        omega = Brand.objects.create(name='Omega', slug='omega')
        seiko = Brand.objects.create(name='Seiko', slug='seiko')
        hamilton = Brand.objects.create(name='Hamilton', slug='hamilton')
        patek = Brand.objects.create(name='Patek Philippe', slug='patek-philippe')
        sport = Collection.objects.create(name='Deportiva', slug='deportiva')
        classic = Collection.objects.create(name='Clásica', slug='clasica')

        def watch(brand, name, price, **kw):
            slug = f'{brand.slug}-{name}'.lower().replace(' ', '-')
            defaults = dict(slug=slug, reference=kw.pop('reference', slug.upper()), brand=brand,
                            description=kw.pop('description', 'Reloj de lujo.'), price=Decimal(price),
                            stock=kw.pop('stock', 3))
            defaults.update(kw)
            return Watch.objects.create(name=name, **defaults)

        cls.submariner = watch(rolex, 'Submariner Date', '9150', collection=sport, water_resistance='300m',
                               reference='126610LN', description='El reloj de buceo de referencia.')
        cls.seamaster = watch(omega, 'Seamaster Diver 300M', '5400', collection=sport, water_resistance='300m',
                              description='Reloj de buceo con bisel cerámico.')
        cls.marinemaster = watch(seiko, 'Prospex Marinemaster', '3200', collection=sport, water_resistance='300m',
                                 description='Reloj de buceo profesional.')
        cls.khaki = watch(hamilton, 'Khaki Field Mechanical', '595', collection=classic, water_resistance='50m',
                          movement='manual', description='Reloj de campo militar con cuerda manual.')
        cls.nautilus = watch(patek, 'Nautilus 5711', '35000', collection=sport, water_resistance='120m',
                             description='Deportivo elegante de acero.')
        cls.inactive = watch(rolex, 'Daytona', '30000', is_active=False)
        cls.sold_out = watch(omega, 'Speedmaster Moonwatch', '7000', stock=0)

    def setUp(self):
        cache.clear()  # throttle history
        gemini.reset()
        patcher = mock.patch('advisor.gemini.urlopen')
        self.urlopen = patcher.start()
        self.urlopen.side_effect = AssertionError('no network in tests')
        self.addCleanup(patcher.stop)
        self.client = APIClient()

    def ask(self, text, currency='PEN', language='es', history=()):
        messages = list(history) + [{'role': 'user', 'content': text}]
        return self.client.post(URL, {'messages': messages, 'currency': currency, 'language': language},
                                format='json')

    def ids(self, response):
        return [w['id'] for w in response.data['watches']]


class CurrencyTest(TestCase):
    def test_formats_and_converts_like_the_shop(self):
        self.assertEqual(PEN.price(Decimal('9150')), 'S/ 30,927')
        self.assertEqual(USD.price(Decimal('9150')), 'US$ 9,150')
        self.assertEqual(EUR.price(Decimal('9150')), '€7,869')
        self.assertEqual(PEN.to_usd(Decimal('20000')), Decimal('5917.16'))
        self.assertEqual(EUR.to_usd(Decimal('5000')), Decimal('5813.95'))


class BasicModeTest(AdvisorTestBase):
    def test_budget_in_soles_with_spaces_filters_in_dollars(self):
        r = self.ask('Tengo 20 000 soles, busco un reloj de buceo')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['mode'], 'basic')
        self.assertEqual(r.data['budget'], {'amount': 20000, 'currency': 'PEN', 'amount_usd': 5917.16})
        self.assertIn('S/ 20,000', r.data['reply'])
        self.assertEqual(self.ids(r), [self.seamaster.id, self.marinemaster.id])
        first = r.data['watches'][0]
        self.assertEqual(first['price'], '5400.00')
        self.assertEqual(first['shown_price'], 'S/ 18,252')
        self.assertEqual(first['brand_name'], 'Omega')
        self.assertEqual(set(first), {'id', 'slug', 'name', 'brand_name', 'price', 'shown_price',
                                      'primary_image', 'reference'})

    def test_bare_number_is_in_the_chosen_currency(self):
        r = self.ask('Tengo 20000')
        self.assertEqual(r.data['budget']['currency'], 'PEN')
        self.assertTrue(r.data['watches'])
        self.assertTrue(all(Decimal(w['price']) <= Decimal('5917.16') for w in r.data['watches']))

    def test_euros_while_reading_soles(self):
        r = self.ask('Tengo 5000 euros para un reloj de buceo')
        self.assertEqual(r.data['budget'], {'amount': 5000, 'currency': 'EUR', 'amount_usd': 5813.95})
        self.assertIn('€5,000', r.data['reply'])
        self.assertEqual(self.ids(r), [self.seamaster.id, self.marinemaster.id])
        self.assertTrue(r.data['watches'][0]['shown_price'].startswith('S/ '))

    def test_thousands_in_dollars(self):
        r = self.ask('20k dólares, algo de buceo', currency='EUR')
        self.assertEqual(r.data['budget'], {'amount': 20000, 'currency': 'USD', 'amount_usd': 20000})
        self.assertIn(self.submariner.id, self.ids(r))
        self.assertTrue(r.data['watches'][0]['shown_price'].startswith('€'))

    def test_unsupported_currency_asks_again(self):
        r = self.ask('Tengo 10000 pesos')
        self.assertEqual(r.data['watches'], [])
        self.assertIn('soles', r.data['reply'])
        self.assertIsNone(r.data['budget']['amount'])
        r = self.ask('I have 500 pounds', currency='USD', language='en')
        self.assertIn('US dollars', r.data['reply'])

    def test_asks_for_the_budget_when_unknown(self):
        r = self.ask('Busco un reloj de buceo')
        self.assertIn('presupuesto', r.data['reply'])
        self.assertEqual(r.data['watches'], [])

    def test_budget_from_an_earlier_message(self):
        history = [{'role': 'user', 'content': 'Tengo 12000 soles'},
                   {'role': 'assistant', 'content': '¿Qué estilo buscas?'}]
        r = self.ask('De buceo', history=history)
        self.assertEqual(self.ids(r), [self.marinemaster.id])

    def test_nothing_within_budget(self):
        r = self.ask('Tengo 100 soles')
        self.assertEqual(r.data['watches'], [])
        self.assertIn('No tenemos relojes por S/ 100 o menos', r.data['reply'])
        self.assertIn('Hamilton Khaki Field Mechanical', r.data['reply'])

    def test_never_lists_inactive_or_sold_out_watches(self):
        r = self.ask('Tengo 50000 dólares, ¿qué relojes tienen?', currency='USD')
        names = r.data['reply']
        self.assertNotIn('Daytona', names)
        self.assertNotIn('Speedmaster', names)

    def test_questions_about_a_watch_and_faq(self):
        r = self.ask('¿Cuánto cuesta el Submariner?', currency='EUR')
        self.assertIn('€7,869', r.data['reply'])
        self.assertNotIn('diámetro', r.data['reply'])
        self.assertEqual(self.ids(r), [self.submariner.id])
        r = self.ask('¿Qué diferencia hay entre automático y cuarzo?')
        self.assertIn('pila', r.data['reply'])
        r = self.ask('¿Cómo compro?')
        self.assertIn('carrito', r.data['reply'])

    def test_off_topic_and_english(self):
        r = self.ask('Háblame de política')
        self.assertTrue(r.data['reply'].startswith('Solo puedo ayudarte'))
        r = self.ask('I have 6,000 dollars for a dive watch', currency='USD', language='en')
        self.assertIn('within your budget of US$ 6,000', r.data['reply'])
        self.assertEqual(self.ids(r), [self.seamaster.id, self.marinemaster.id])


@override_settings(GEMINI_API_KEY='test-key')
class GeminiModeTest(AdvisorTestBase):
    def sent(self, call_index=0):
        request = self.urlopen.call_args_list[call_index].args[0]
        return request, json.loads(request.data.decode())

    def test_budget_in_soles_is_compared_in_dollars(self):
        self.urlopen.side_effect = None
        self.urlopen.return_value = model_answer(
            reply='Te recomiendo el Omega Seamaster Diver 300M y el Seiko Prospex Marinemaster.',
            budget=20000, currency='PEN', ids=[self.seamaster.id, self.marinemaster.id])
        r = self.ask('Tengo 20 000 soles, busco un reloj de buceo')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['mode'], 'gemini')
        self.assertTrue(r.data['reply'].startswith('Te recomiendo'))
        self.assertEqual(self.ids(r), [self.seamaster.id, self.marinemaster.id])
        self.assertEqual(r.data['budget'], {'amount': 20000, 'currency': 'PEN', 'amount_usd': 5917.16})

        request, body = self.sent()
        self.assertEqual(request.full_url, 'https://gemini.test/v1beta/models/model-a:generateContent')
        self.assertEqual(request.get_header('X-goog-api-key'), 'test-key')
        self.assertEqual(body['contents'], [{'role': 'user', 'parts': [{'text': 'Tengo 20 000 soles, busco un reloj de buceo'}]}])
        self.assertEqual(body['generationConfig']['responseMimeType'], 'application/json')
        prompt = body['systemInstruction']['parts'][0]['text']
        self.assertIn('"shownPrice":"S/ 30,927"', prompt)
        self.assertIn('Spanish', prompt)
        self.assertNotIn('Daytona', prompt)
        self.assertNotIn('Speedmaster', prompt)

    def test_watches_over_budget_or_invented_are_dropped(self):
        self.urlopen.side_effect = None
        self.urlopen.return_value = model_answer(
            reply='El Submariner es perfecto.', budget=20000, currency='PEN',
            ids=[self.submariner.id, self.seamaster.id, 'invented', self.inactive.id])
        r = self.ask('Tengo 20000 soles')
        self.assertEqual(self.ids(r), [self.seamaster.id])
        self.assertIn('dentro de tu presupuesto de S/ 20,000', r.data['reply'])

    def test_nothing_affordable(self):
        self.urlopen.side_effect = None
        self.urlopen.return_value = model_answer(budget=3, currency='PEN', ids=[self.submariner.id])
        r = self.ask('Tengo 3 soles')
        self.assertEqual(r.data['watches'], [])
        self.assertIn('S/ 3 o menos', r.data['reply'])

    def test_missed_budget_still_limits_the_cards(self):
        self.urlopen.side_effect = None
        self.urlopen.return_value = model_answer(budget=0, ids=[self.submariner.id, self.marinemaster.id])
        r = self.ask('Tengo 5000 euros')
        self.assertEqual(self.ids(r), [self.marinemaster.id])
        self.assertEqual(r.data['budget']['currency'], 'EUR')

    def test_off_topic_is_replaced_by_the_fixed_refusal(self):
        self.urlopen.side_effect = None
        self.urlopen.return_value = model_answer(reply='Opinión política...', on_topic=False,
                                                 ids=[self.seamaster.id])
        r = self.ask('Háblame de política')
        self.assertTrue(r.data['reply'].startswith('Solo puedo ayudarte'))
        self.assertEqual(r.data['watches'], [])
        self.assertEqual(r.data['mode'], 'gemini')

    def test_invalid_json_falls_back_to_the_next_model(self):
        self.urlopen.side_effect = [gemini_body('esto no es JSON'),
                                    model_answer(budget=6000, currency='USD', ids=[self.seamaster.id])]
        r = self.ask('Tengo 6000 dólares')
        self.assertEqual(r.data['mode'], 'gemini')
        self.assertEqual(self.ids(r), [self.seamaster.id])
        self.assertEqual(self.urlopen.call_count, 2)
        self.assertTrue(self.sent(1)[0].full_url.endswith('/models/model-b:generateContent'))

    def test_rate_limited_model_falls_back_to_the_next_one(self):
        self.urlopen.side_effect = [http_error(429), model_answer(ids=[self.khaki.id], budget=1000, currency='USD')]
        r = self.ask('Tengo 1000 dólares')
        self.assertEqual(r.data['mode'], 'gemini')
        self.assertEqual(self.ids(r), [self.khaki.id])
        # The rested model is tried last next time.
        self.urlopen.side_effect = [model_answer(ids=[self.khaki.id], budget=1000, currency='USD')]
        self.ask('Tengo 1000 dólares')
        self.assertTrue(self.sent(2)[0].full_url.endswith('/models/model-b:generateContent'))

    def test_every_model_failing_answers_in_basic_mode(self):
        self.urlopen.side_effect = [gemini_body('{"broken'), http_error(503)]
        r = self.ask('Tengo 20 000 soles, busco un reloj de buceo')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['mode'], 'basic')
        self.assertEqual(self.ids(r), [self.seamaster.id, self.marinemaster.id])

    def test_timeout_and_empty_reply_fall_back(self):
        self.urlopen.side_effect = [TimeoutError(), model_answer(reply='  ')]
        r = self.ask('hola')
        self.assertEqual(r.data['mode'], 'basic')
        self.assertIn('presupuesto', r.data['reply'])

    def test_conversation_roles_are_mapped_for_gemini(self):
        self.urlopen.side_effect = None
        self.urlopen.return_value = model_answer(reply='¿Para qué uso?')
        history = [{'role': 'assistant', 'content': 'Hola, ¿en qué te ayudo?'},
                   {'role': 'user', 'content': 'Busco un reloj'},
                   {'role': 'assistant', 'content': '¿Qué presupuesto tienes?'}]
        self.ask('Unos 3000 dólares', history=history)
        roles = [c['role'] for c in self.sent()[1]['contents']]
        self.assertEqual(roles, ['user', 'model', 'user'])


class ValidationTest(AdvisorTestBase):
    def post(self, body):
        return self.client.post(URL, body, format='json')

    def test_invalid_requests_are_rejected(self):
        ok = {'role': 'user', 'content': 'hola'}
        cases = [
            {},
            {'messages': []},
            {'messages': [{'role': 'assistant', 'content': 'hola'}]},
            {'messages': [{'role': 'system', 'content': 'hola'}]},
            {'messages': [{'role': 'user', 'content': '   '}]},
            {'messages': [{'role': 'user', 'content': 'x' * 1001}]},
            {'messages': [ok] * 21},
            {'messages': [ok], 'currency': 'GBP'},
            {'messages': 'hola'},
        ]
        for body in cases:
            with self.subTest(body=str(body)[:60]):
                self.assertEqual(self.post(body).status_code, 400)
        self.urlopen.assert_not_called()

    def test_defaults_and_java_shape(self):
        r = self.post({'messages': [{'role': 'user', 'text': 'Tengo 20000'}]})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['budget']['currency'], 'PEN')
        r = self.post({'messages': [{'role': 'user', 'content': 'x' * 1000}] * 20, 'currency': 'usd'})
        self.assertEqual(r.status_code, 200)

    def test_throttled_after_fifteen_requests_a_minute(self):
        for _ in range(15):
            self.assertEqual(self.ask('hola').status_code, 200)
        self.assertEqual(self.ask('hola').status_code, 429)

    def test_expired_token_is_ignored(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer not-a-valid-token')
        self.assertEqual(self.ask('hola').status_code, 200)
