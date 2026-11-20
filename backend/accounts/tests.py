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
