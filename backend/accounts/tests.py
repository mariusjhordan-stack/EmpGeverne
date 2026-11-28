from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import Address

User = get_user_model()


class UserModelTest(TestCase):
    def test_create_user_with_email(self):
        user = User.objects.create_user(
            username='testuser', email='test@example.com', password='TestPass123!'
        )
        self.assertEqual(user.email, 'test@example.com')
        self.assertEqual(str(user), 'test@example.com')
        self.assertFalse(user.is_staff)

    def test_email_is_username_field(self):
        self.assertEqual(User.USERNAME_FIELD, 'email')

    def test_email_unique_constraint(self):
        User.objects.create_user(username='u1', email='dup@test.com', password='Pass123!')
        with self.assertRaises(Exception):
            User.objects.create_user(username='u2', email='dup@test.com', password='Pass123!')


class AddressModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='addruser', email='addr@test.com', password='Pass123!'
        )

    def test_create_address(self):
        addr = Address.objects.create(
            user=self.user, street='Calle 123', city='Lima',
            state='Lima', postal_code='15001'
        )
        self.assertEqual(addr.country, 'Perú')
        self.assertIn('Calle 123', str(addr))

    def test_default_address_uniqueness(self):
        addr1 = Address.objects.create(
            user=self.user, street='A', city='Lima', state='Lima',
            postal_code='15001', is_default=True
        )
        addr2 = Address.objects.create(
            user=self.user, street='B', city='Lima', state='Lima',
            postal_code='15002', is_default=True
        )
        addr1.refresh_from_db()
        self.assertFalse(addr1.is_default)
        self.assertTrue(addr2.is_default)


class RegisterViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_success(self):
        data = {
            'email': 'new@test.com', 'username': 'newuser',
            'first_name': 'Test', 'last_name': 'User',
            'password': 'StrongPass123!', 'password_confirm': 'StrongPass123!',
        }
        resp = self.client.post('/api/auth/register/', data, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', resp.data)
        self.assertIn('access', resp.data['tokens'])

    def test_register_password_mismatch(self):
        data = {
            'email': 'x@test.com', 'username': 'x',
            'first_name': 'A', 'last_name': 'B',
            'password': 'StrongPass123!', 'password_confirm': 'Different123!',
        }
        resp = self.client.post('/api/auth/register/', data, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_duplicate_email(self):
        User.objects.create_user(username='ex', email='dup@test.com', password='P123!')
        data = {
            'email': 'dup@test.com', 'username': 'new',
            'first_name': 'A', 'last_name': 'B',
            'password': 'StrongPass123!', 'password_confirm': 'StrongPass123!',
        }
        resp = self.client.post('/api/auth/register/', data, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class ProfileViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='profuser', email='prof@test.com', password='Pass123!',
            first_name='Original', last_name='Name'
        )
        self.client.force_authenticate(user=self.user)

    def test_get_profile(self):
        resp = self.client.get('/api/auth/profile/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['email'], 'prof@test.com')

    def test_update_profile(self):
        resp = self.client.patch('/api/auth/profile/', {'first_name': 'Updated'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'Updated')

    def test_profile_requires_auth(self):
        client = APIClient()
        resp = client.get('/api/auth/profile/')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class ChangePasswordViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='pwuser', email='pw@test.com', password='OldPass123!'
        )
        self.client.force_authenticate(user=self.user)

    def test_change_password_success(self):
        resp = self.client.post('/api/auth/change-password/', {
            'old_password': 'OldPass123!', 'new_password': 'NewPass456!'
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NewPass456!'))

    def test_change_password_wrong_old(self):
        resp = self.client.post('/api/auth/change-password/', {
            'old_password': 'WrongPass!', 'new_password': 'NewPass456!'
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class AddressViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='addrviewuser', email='av@test.com', password='Pass123!'
        )
        self.client.force_authenticate(user=self.user)

    def test_create_address(self):
        resp = self.client.post('/api/auth/addresses/', {
            'label': 'Casa', 'street': 'Av. Javier Prado 123',
            'city': 'Lima', 'state': 'Lima', 'postal_code': '15036'
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Address.objects.filter(user=self.user).count(), 1)

    def test_list_addresses(self):
        Address.objects.create(
            user=self.user, street='A', city='Lima', state='Lima', postal_code='15001'
        )
        resp = self.client.get('/api/auth/addresses/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data.get('results', resp.data) if isinstance(resp.data, dict) else resp.data
        self.assertEqual(len(results), 1)


# ---------------------------------------------------------------- Ingreso con Google
import time  # noqa: E402
from types import SimpleNamespace  # noqa: E402
from unittest import mock  # noqa: E402

import jwt  # noqa: E402
from cryptography.hazmat.primitives.asymmetric import rsa  # noqa: E402
from django.core.cache import cache  # noqa: E402
from django.test import override_settings  # noqa: E402

from .google import GoogleIdentity, GoogleTokenError, GoogleUnavailable, verify_google_token  # noqa: E402

PROJECT = 'cronos-test'
SIGNER = rsa.generate_private_key(public_exponent=65537, key_size=2048)
OTHER = rsa.generate_private_key(public_exponent=65537, key_size=2048)


def firebase_token(key=SIGNER, **changes):
    now = int(time.time())
    claims = {
        'iss': f'https://securetoken.google.com/{PROJECT}', 'aud': PROJECT, 'sub': 'g-123', 'iat': now, 'exp': now + 3600,
        'email': 'Ana.Lopez@Gmail.com', 'email_verified': True, 'name': 'Ana López Prado',
        'firebase': {'sign_in_provider': 'google.com'},
    }
    claims.update(changes)
    return jwt.encode({k: v for k, v in claims.items() if v is not None}, key, algorithm='RS256', headers={'kid': 'k1'})


class FakeKeys:
    def __init__(self, error=None):
        self.error = error

    def get_signing_key_from_jwt(self, token):
        if self.error:
            raise self.error
        return SimpleNamespace(key=SIGNER.public_key())


@override_settings(FIREBASE_PROJECT_ID=PROJECT)
class GoogleTokenVerifierTest(TestCase):
    def verify(self, token, keys=None):
        with mock.patch('accounts.google._keys', return_value=keys or FakeKeys()):
            return verify_google_token(token)

    def test_valid_token(self):
        identity = self.verify(firebase_token())
        self.assertEqual(identity, GoogleIdentity(subject='g-123', email='ana.lopez@gmail.com', name='Ana López Prado'))

    def test_rejects_bad_tokens(self):
        bad = {
            'otro proyecto': firebase_token(aud='otro-proyecto'),
            'otro emisor': firebase_token(iss='https://accounts.google.com'),
            'caducado': firebase_token(exp=int(time.time()) - 120),
            'sin correo verificado': firebase_token(email_verified=False),
            'no es Google': firebase_token(firebase={'sign_in_provider': 'password'}),
            'sin correo': firebase_token(email=None),
            'otra firma': firebase_token(key=OTHER),
            'basura': 'no-es-un-token',
        }
        for reason, token in bad.items():
            with self.subTest(reason), self.assertRaises(GoogleTokenError):
                self.verify(token)

    def test_keys_unreachable(self):
        with self.assertRaises(GoogleUnavailable):
            self.verify(firebase_token(), FakeKeys(jwt.PyJWKClientConnectionError('sin red')))


class GoogleLoginViewTest(TestCase):
    url = '/api/auth/google/'
    ana = GoogleIdentity(subject='g-123', email='ana.lopez@gmail.com', name='Ana López Prado')

    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def post(self, identity=None, error=None, token='token'):
        with mock.patch('accounts.views.verify_google_token', side_effect=error, return_value=identity or self.ana):
            return self.client.post(self.url, {'id_token': token}, format='json')

    def test_first_time_creates_the_account(self):
        res = self.post()
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', res.data['tokens'])
        user = User.objects.get(email='ana.lopez@gmail.com')
        self.assertEqual((user.first_name, user.last_name, user.google_sub), ('Ana', 'López Prado', 'g-123'))
        self.assertFalse(user.has_usable_password())

    def test_next_time_signs_in(self):
        self.post()
        res = self.post()
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['user']['email'], 'ana.lopez@gmail.com')
        self.assertEqual(User.objects.filter(email='ana.lopez@gmail.com').count(), 1)

    def test_email_with_password_is_not_taken_over(self):
        User.objects.create_user(email='ana.lopez@gmail.com', username='ana', first_name='Ana', last_name='L', password='Clave-segura-123')
        res = self.post()
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)
        self.assertIsNone(User.objects.get(email='ana.lopez@gmail.com').google_sub)

    def test_username_taken(self):
        User.objects.create_user(email='otra@correo.com', username='ana.lopez', first_name='O', last_name='T', password='Clave-segura-123')
        self.post()
        self.assertEqual(User.objects.get(email='ana.lopez@gmail.com').username, 'ana.lopez2')

    def test_inactive_account(self):
        self.post()
        User.objects.filter(google_sub='g-123').update(is_active=False)
        self.assertEqual(self.post().status_code, status.HTTP_401_UNAUTHORIZED)

    def test_errors(self):
        self.assertEqual(self.post(error=GoogleTokenError()).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.post(error=GoogleUnavailable()).status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(self.post(token='').status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.post(token='x' * 9000).status_code, status.HTTP_400_BAD_REQUEST)
