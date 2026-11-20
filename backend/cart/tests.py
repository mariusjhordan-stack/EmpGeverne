from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from catalog.models import Brand, Watch
from .models import Cart, CartItem

User = get_user_model()


class CartModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='cartuser', email='cart@test.com', password='Pass123!'
        )
        self.brand = Brand.objects.create(name='Rolex', slug='rolex')
        self.watch = Watch.objects.create(
            name='Sub', slug='sub', reference='REF-SUB',
            brand=self.brand, description='Dive', price=Decimal('12000.00'), stock=5
        )

    def test_cart_total(self):
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, watch=self.watch, quantity=2)
        self.assertEqual(cart.total, Decimal('24000.00'))

    def test_cart_item_count(self):
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, watch=self.watch, quantity=3)
        self.assertEqual(cart.item_count, 1)

    def test_cart_str(self):
        cart = Cart.objects.create(user=self.user)
        self.assertIn(self.user.email, str(cart))

    def test_cart_item_subtotal(self):
        cart = Cart.objects.create(user=self.user)
        item = CartItem.objects.create(cart=cart, watch=self.watch, quantity=2)
        self.assertEqual(item.subtotal, Decimal('24000.00'))


class CartViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='cv', email='cv@test.com', password='Pass123!'
        )
        self.client.force_authenticate(user=self.user)
        self.brand = Brand.objects.create(name='Omega', slug='omega')
        self.watch = Watch.objects.create(
            name='Speedmaster', slug='speedmaster', reference='REF-SPD',
            brand=self.brand, description='Moon', price=Decimal('6000.00'), stock=5
        )

    def test_get_empty_cart(self):
        resp = self.client.get('/api/cart/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_add_to_cart(self):
        resp = self.client.post('/api/cart/add/', {
            'watch_id': self.watch.pk, 'quantity': 1
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_add_to_cart_exceeds_stock(self):
        resp = self.client.post('/api/cart/add/', {
            'watch_id': self.watch.pk, 'quantity': 100
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_to_cart_accumulates(self):
        self.client.post('/api/cart/add/', {'watch_id': self.watch.pk, 'quantity': 1}, format='json')
        self.client.post('/api/cart/add/', {'watch_id': self.watch.pk, 'quantity': 2}, format='json')
        cart = Cart.objects.get(user=self.user)
        item = cart.items.first()
        self.assertEqual(item.quantity, 3)

    def test_update_cart_item(self):
        self.client.post('/api/cart/add/', {'watch_id': self.watch.pk, 'quantity': 1}, format='json')
        item = CartItem.objects.get(cart__user=self.user)
        resp = self.client.patch(f'/api/cart/items/{item.pk}/', {'quantity': 3}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        item.refresh_from_db()
        self.assertEqual(item.quantity, 3)

    def test_delete_cart_item(self):
        self.client.post('/api/cart/add/', {'watch_id': self.watch.pk, 'quantity': 1}, format='json')
        item = CartItem.objects.get(cart__user=self.user)
        resp = self.client.delete(f'/api/cart/items/{item.pk}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_clear_cart(self):
        self.client.post('/api/cart/add/', {'watch_id': self.watch.pk, 'quantity': 1}, format='json')
        resp = self.client.delete('/api/cart/clear/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        cart = Cart.objects.get(user=self.user)
        self.assertEqual(cart.items.count(), 0)

    def test_cart_requires_auth(self):
        client = APIClient()
        resp = client.get('/api/cart/')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
