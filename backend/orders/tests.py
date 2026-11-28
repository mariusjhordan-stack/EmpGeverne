from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from catalog.models import Brand, Watch
from cart.models import Cart, CartItem
from .models import Order, OrderItem, Payment

User = get_user_model()


class OrderModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='orderuser', email='order@test.com', password='Pass123!'
        )

    def test_auto_order_number(self):
        order = Order.objects.create(
            user=self.user, shipping_street='Calle 1', shipping_city='Lima',
            shipping_state='Lima', shipping_postal_code='15001',
            subtotal=Decimal('1000.00'), tax=Decimal('180.00'), total=Decimal('1180.00')
        )
        self.assertTrue(order.order_number.startswith('CG-'))
        self.assertEqual(len(order.order_number), 11)

    def test_valid_transitions(self):
        order = Order(status='pending')
        self.assertTrue(order.can_transition_to('paid'))
        self.assertTrue(order.can_transition_to('cancelled'))
        self.assertFalse(order.can_transition_to('shipped'))

    def test_delivered_has_no_transitions(self):
        order = Order(status='delivered')
        self.assertFalse(order.can_transition_to('cancelled'))

    def test_cancelled_has_no_transitions(self):
        order = Order(status='cancelled')
        self.assertFalse(order.can_transition_to('paid'))


class OrderItemModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='oiu', email='oiu@test.com', password='Pass123!'
        )
        self.brand = Brand.objects.create(name='Rolex', slug='rolex')
        self.watch = Watch.objects.create(
            name='Sub', slug='sub', reference='REF-S',
            brand=self.brand, description='D', price=Decimal('10000.00'), stock=5
        )
        self.order = Order.objects.create(
            user=self.user, shipping_street='S', shipping_city='C',
            shipping_state='S', shipping_postal_code='P',
            subtotal=Decimal('20000.00'), tax=Decimal('3600.00'), total=Decimal('23600.00')
        )

    def test_subtotal_auto_calculated(self):
        item = OrderItem.objects.create(
            order=self.order, watch=self.watch,
            watch_name='Sub', watch_brand='Rolex', watch_reference='REF-S',
            unit_price=Decimal('10000.00'), quantity=2, subtotal=Decimal('0')
        )
        self.assertEqual(item.subtotal, Decimal('20000.00'))


class PaymentModelTest(TestCase):
    def setUp(self):
        user = User.objects.create_user(username='pu', email='pu@test.com', password='P123!')
        self.order = Order.objects.create(
            user=user, shipping_street='S', shipping_city='C',
            shipping_state='S', shipping_postal_code='P',
            subtotal=Decimal('1000'), tax=Decimal('180'), total=Decimal('1180')
        )

    def test_auto_reference(self):
        payment = Payment.objects.create(
            order=self.order, method='demo_card', amount=Decimal('1180')
        )
        self.assertTrue(payment.reference.startswith('PAY-'))
        self.assertTrue(payment.is_demo)


class CreateOrderViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='buyer', email='buyer@test.com', password='Pass123!'
        )
        self.client.force_authenticate(user=self.user)
        self.brand = Brand.objects.create(name='Omega', slug='omega')
        self.watch = Watch.objects.create(
            name='Seamaster', slug='seamaster', reference='REF-SEA',
            brand=self.brand, description='Dive', price=Decimal('6000.00'), stock=5
        )
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, watch=self.watch, quantity=2)

    def test_create_order_success(self):
        resp = self.client.post('/api/orders/create/', {
            'shipping_street': 'Av. Test 123',
            'shipping_city': 'Lima',
            'shipping_state': 'Lima',
            'shipping_postal_code': '15001',
            'payment_method': 'demo_card',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.watch.refresh_from_db()
        self.assertEqual(self.watch.stock, 3)
        order = Order.objects.get(order_number=resp.data['order_number'])
        self.assertEqual(order.status, 'paid')
        self.assertEqual(order.items.count(), 1)
        expected_subtotal = Decimal('12000.00')
        self.assertEqual(order.subtotal, expected_subtotal)

    def test_create_order_empty_cart(self):
        Cart.objects.filter(user=self.user).first().items.all().delete()
        resp = self.client.post('/api/orders/create/', {
            'shipping_street': 'A', 'shipping_city': 'B',
            'shipping_state': 'C', 'shipping_postal_code': 'D',
            'payment_method': 'demo_card',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_order_insufficient_stock(self):
        self.watch.stock = 1
        self.watch.save()
        resp = self.client.post('/api/orders/create/', {
            'shipping_street': 'A', 'shipping_city': 'B',
            'shipping_state': 'C', 'shipping_postal_code': 'D',
            'payment_method': 'demo_card',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_tax_calculation(self):
        resp = self.client.post('/api/orders/create/', {
            'shipping_street': 'A', 'shipping_city': 'B',
            'shipping_state': 'C', 'shipping_postal_code': 'D',
            'payment_method': 'demo_card',
        }, format='json')
        order = Order.objects.get(order_number=resp.data['order_number'])
        expected_tax = (order.subtotal * Decimal('0.18')).quantize(Decimal('0.01'))
        self.assertEqual(order.tax, expected_tax)
        self.assertEqual(order.total, order.subtotal + order.tax)

    def test_order_requires_auth(self):
        client = APIClient()
        resp = client.post('/api/orders/create/', {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class OrderListViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='listuser', email='lu@test.com', password='Pass123!'
        )
        self.client.force_authenticate(user=self.user)
        Order.objects.create(
            user=self.user, shipping_street='S', shipping_city='C',
            shipping_state='S', shipping_postal_code='P',
            subtotal=Decimal('1000'), tax=Decimal('180'), total=Decimal('1180')
        )

    def test_list_my_orders(self):
        resp = self.client.get('/api/orders/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_cannot_see_others_orders(self):
        other = User.objects.create_user(username='o', email='o@t.com', password='P123!')
        Order.objects.create(
            user=other, shipping_street='S', shipping_city='C',
            shipping_state='S', shipping_postal_code='P',
            subtotal=Decimal('1000'), tax=Decimal('180'), total=Decimal('1180')
        )
        resp = self.client.get('/api/orders/')
        results = resp.data.get('results', resp.data) if isinstance(resp.data, dict) else resp.data
        self.assertEqual(len(results), 1)


class AdminOrderStatusViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            username='adm', email='adm@t.com', password='Admin123!'
        )
        self.client.force_authenticate(user=self.admin)
        self.user = User.objects.create_user(
            username='cu', email='cu@t.com', password='P123!'
        )
        self.brand = Brand.objects.create(name='Rolex', slug='rolex')
        self.watch = Watch.objects.create(
            name='Sub', slug='sub', reference='RS',
            brand=self.brand, description='D', price=Decimal('10000'), stock=5
        )
        self.order = Order.objects.create(
            user=self.user, status='paid',
            shipping_street='S', shipping_city='C',
            shipping_state='S', shipping_postal_code='P',
            subtotal=Decimal('10000'), tax=Decimal('1800'), total=Decimal('11800')
        )
        OrderItem.objects.create(
            order=self.order, watch=self.watch,
            watch_name='Sub', watch_brand='Rolex', watch_reference='RS',
            unit_price=Decimal('10000'), quantity=1, subtotal=Decimal('10000')
        )

    def test_valid_transition(self):
        resp = self.client.patch(
            f'/api/orders/admin/{self.order.pk}/status/',
            {'status': 'preparing'}, format='json'
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'preparing')

    def test_invalid_transition(self):
        resp = self.client.patch(
            f'/api/orders/admin/{self.order.pk}/status/',
            {'status': 'delivered'}, format='json'
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cancel_restores_stock(self):
        self.client.patch(
            f'/api/orders/admin/{self.order.pk}/status/',
            {'status': 'cancelled'}, format='json'
        )
        self.watch.refresh_from_db()
        self.assertEqual(self.watch.stock, 6)


import shutil
import tempfile
from io import BytesIO
from unittest import mock

from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image

from catalog.models import WatchImage

_MEDIA = tempfile.mkdtemp(prefix='cronos-test-media-')


def _webp(color=(20, 20, 20)):
    out = BytesIO()
    Image.new('RGBA', (300, 300), color + (255,)).save(out, 'WEBP')
    return SimpleUploadedFile('pieza.webp', out.getvalue(), content_type='image/webp')


@override_settings(MEDIA_ROOT=_MEDIA, FRONTEND_URL='http://tienda.test')
class ReceiptEmailTest(TestCase):
    """Boleta por correo: sale al pagar, con fotos, IGV y total; se puede reenviar; nunca rompe la compra."""

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(_MEDIA, ignore_errors=True)

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='boleta', email='boleta@test.com', password='Pass123!', first_name='Ana', last_name='Ríos',
        )
        self.client.force_authenticate(user=self.user)
        brand = Brand.objects.create(name='Tudor', slug='tudor')
        self.watch = Watch.objects.create(
            name='Black Bay 58', slug='black-bay-58', reference='M79030N',
            brand=brand, description='D', price=Decimal('4150.00'), stock=3,
        )
        WatchImage.objects.create(watch=self.watch, image=_webp(), is_primary=True)
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, watch=self.watch, quantity=1)
        self.payload = {
            'shipping_street': 'Calle Mercaderes 101', 'shipping_city': 'Arequipa',
            'shipping_state': 'Arequipa', 'shipping_postal_code': '04001', 'payment_method': 'demo_card',
        }

    def test_paid_order_sends_receipt_with_igv_and_photo(self):
        resp = self.client.post('/api/orders/create/', self.payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(resp.data['receipt_sent'])
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        self.assertEqual(email.to, ['boleta@test.com'])
        self.assertIn(resp.data['order_number'], email.subject)
        for text in ('Black Bay 58', 'M79030N', 'USD 4,150.00', 'IGV (18 %)', 'USD 747.00', 'USD 4,897.00',
                     'Ana Ríos', 'Calle Mercaderes 101', 'http://tienda.test/pedidos/'):
            self.assertIn(text, email.body)
        html = email.alternatives[0][0]
        self.assertIn('USD 4,897.00', html)
        self.assertIn('cid:pieza-0@cronos', html)
        parts = [p.get_content_type() for p in email.message().walk()]
        self.assertEqual(parts, ['multipart/alternative', 'text/plain', 'multipart/related', 'text/html', 'image/jpeg'])

    def test_mail_failure_does_not_break_purchase(self):
        with mock.patch('orders.receipt.ReceiptEmail.send', side_effect=OSError('SMTP caído')):
            resp = self.client.post('/api/orders/create/', self.payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertFalse(resp.data['receipt_sent'])
        self.assertEqual(Order.objects.get(order_number=resp.data['order_number']).status, 'paid')

    def test_order_detail_includes_photo_and_payment_label(self):
        number = self.client.post('/api/orders/create/', self.payload, format='json').data['order_number']
        data = self.client.get(f'/api/orders/{number}/').data
        self.assertTrue(data['items'][0]['watch_image'].endswith('.webp'))
        self.assertEqual(data['items'][0]['watch_slug'], 'black-bay-58')
        self.assertEqual(data['payment']['method_display'], 'Tarjeta de demostración')

    def test_resend_receipt(self):
        number = self.client.post('/api/orders/create/', self.payload, format='json').data['order_number']
        mail.outbox.clear()
        resp = self.client.post(f'/api/orders/{number}/send-receipt/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data, {'sent': True, 'email': 'boleta@test.com'})
        self.assertEqual(len(mail.outbox), 1)

    def test_resend_only_for_own_paid_orders(self):
        pending = Order.objects.create(
            user=self.user, shipping_street='S', shipping_city='C', shipping_state='S', shipping_postal_code='P',
            subtotal=Decimal('100'), tax=Decimal('18'), total=Decimal('118'),
        )
        self.assertEqual(self.client.post(f'/api/orders/{pending.order_number}/send-receipt/').status_code, 400)
        other = APIClient()
        other.force_authenticate(User.objects.create_user(username='otro', email='otro@test.com', password='P123!'))
        pending.status = 'paid'
        pending.save()
        self.assertEqual(other.post(f'/api/orders/{pending.order_number}/send-receipt/').status_code, 404)
        self.assertEqual(len(mail.outbox), 0)

    def test_resend_without_mail_configured_says_so(self):
        number = self.client.post('/api/orders/create/', self.payload, format='json').data['order_number']
        mail.outbox.clear()
        with override_settings(EMAIL_BACKEND='django.core.mail.backends.console.EmailBackend'), \
                mock.patch('orders.receipt.ReceiptEmail.send') as send:
            resp = self.client.post(f'/api/orders/{number}/send-receipt/')
        self.assertEqual(resp.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        send.assert_not_called()

    def test_download_receipt_pdf(self):
        number = self.client.post('/api/orders/create/', self.payload, format='json').data['order_number']
        resp = self.client.get(f'/api/orders/{number}/receipt.pdf')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp['Content-Type'], 'application/pdf')
        self.assertIn(f'boleta-{number}.pdf', resp['Content-Disposition'])
        self.assertTrue(resp.content.startswith(b'%PDF'))
        self.assertGreater(len(resp.content), 3000)  # lleva la foto del reloj

    def test_receipt_pdf_only_owner_and_paid(self):
        number = self.client.post('/api/orders/create/', self.payload, format='json').data['order_number']
        other = APIClient()
        other.force_authenticate(User.objects.create_user(username='ajeno', email='ajeno@test.com', password='P123!'))
        self.assertEqual(other.get(f'/api/orders/{number}/receipt.pdf').status_code, 404)
        pending = Order.objects.create(
            user=self.user, shipping_street='S', shipping_city='C', shipping_state='S', shipping_postal_code='P',
            subtotal=Decimal('100'), tax=Decimal('18'), total=Decimal('118'),
        )
        self.assertEqual(self.client.get(f'/api/orders/{pending.order_number}/receipt.pdf').status_code, 400)
        self.assertEqual(APIClient().get(f'/api/orders/{number}/receipt.pdf').status_code, 401)
