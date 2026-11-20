from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from catalog.models import Brand, Watch
from orders.models import Order

User = get_user_model()


class DashboardStatsViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            username='dashadmin', email='da@test.com', password='Admin123!'
        )
        self.client.force_authenticate(user=self.admin)
        brand = Brand.objects.create(name='Rolex', slug='rolex')
        Watch.objects.create(
            name='Sub', slug='sub', reference='R1',
            brand=brand, description='D', price=Decimal('10000'), stock=5
        )

    def test_get_stats(self):
        resp = self.client.get('/api/dashboard/stats/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('total_watches', resp.data)
        self.assertIn('total_orders', resp.data)

    def test_stats_requires_admin(self):
        user = User.objects.create_user(
            username='reg', email='reg@test.com', password='Pass123!'
        )
        client = APIClient()
        client.force_authenticate(user=user)
        resp = client.get('/api/dashboard/stats/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_stats_requires_auth(self):
        client = APIClient()
        resp = client.get('/api/dashboard/stats/')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class AdminCustomerListViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            username='ca', email='ca@test.com', password='Admin123!'
        )
        self.client.force_authenticate(user=self.admin)

    def test_list_customers(self):
        User.objects.create_user(username='c1', email='c1@test.com', password='P123!')
        resp = self.client.get('/api/dashboard/customers/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
