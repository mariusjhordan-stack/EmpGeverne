from decimal import Decimal
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import transaction
from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import APIException
from .models import Order, OrderItem, Payment
from .serializers import (
    OrderSerializer, OrderListSerializer, CreateOrderSerializer,
    UpdateOrderStatusSerializer, AdminOrderSerializer,
)
from .payment_gateway import get_payment_gateway
from cart.models import Cart
from config.permissions import IsAdminUser


class CreateOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CreateOrderSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        cart = Cart.objects.filter(user=request.user).prefetch_related('items__watch__brand').first()
        if not cart or cart.items.count() == 0:
            return Response({'error': 'El carrito está vacío.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            subtotal = Decimal('0.00')
            order_items_data = []

            for item in cart.items.select_related('watch__brand').all():
                watch = item.watch
                if not watch.is_active:
                    return Response(
                        {'error': f'El reloj "{watch.name}" ya no está disponible.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if watch.stock < item.quantity:
                    return Response(
                        {'error': f'Stock insuficiente para "{watch.name}". Disponible: {watch.stock}'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                item_subtotal = watch.price * item.quantity
                subtotal += item_subtotal
                order_items_data.append({
                    'watch': watch,
                    'watch_name': watch.name,
                    'watch_brand': watch.brand.name,
                    'watch_reference': watch.reference,
                    'unit_price': watch.price,
                    'quantity': item.quantity,
                    'subtotal': item_subtotal,
                })

            tax = (subtotal * Decimal('0.18')).quantize(Decimal('0.01'))
            total = subtotal + tax

            order = Order.objects.create(
                user=request.user,
                shipping_street=data['shipping_street'],
                shipping_city=data['shipping_city'],
                shipping_state=data['shipping_state'],
                shipping_postal_code=data['shipping_postal_code'],
                shipping_country=data.get('shipping_country', 'Perú'),
                subtotal=subtotal,
                tax=tax,
                total=total,
                notes=data.get('notes', ''),
            )

            for item_data in order_items_data:
                OrderItem.objects.create(order=order, **item_data)

            for item in cart.items.select_related('watch').all():
                item.watch.stock -= item.quantity
                item.watch.save()

            payment_method = data.get('payment_method', 'demo_card')
            gateway = get_payment_gateway(payment_method)
            result = gateway.process_payment(
                amount=total,
                method=payment_method,
                metadata={'order_number': order.order_number, 'user': request.user.email},
            )

            if not result.success:
                raise PaymentGatewayError(result.error or 'Error al procesar el pago.')

            is_stripe = result.gateway == 'stripe'
            Payment.objects.create(
                order=order,
                method=payment_method,
                amount=total,
                reference=result.reference,
                is_demo=not is_stripe,
            )
            if not is_stripe:
                order.status = 'paid'
                order.save()

            cart.items.all().delete()

        response_data = OrderSerializer(order).data
        if is_stripe:
            response_data['client_secret'] = result.raw_response['client_secret']
        return Response(response_data, status=status.HTTP_201_CREATED)


class PaymentGatewayError(APIException):
    status_code = status.HTTP_502_BAD_GATEWAY
    default_detail = 'No se pudo crear el pago.'
    default_code = 'payment_gateway_error'


class ConfirmStripePaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, order_number):
        import stripe

        order = get_object_or_404(
            Order.objects.select_related('payment'),
            order_number=order_number,
            user=request.user,
        )
        if not hasattr(order, 'payment') or order.payment.method != 'stripe_card':
            return Response({'error': 'El pedido no tiene un pago Stripe pendiente.'}, status=status.HTTP_400_BAD_REQUEST)

        stripe.api_key = settings.STRIPE_SECRET_KEY
        try:
            intent = stripe.PaymentIntent.retrieve(order.payment.reference)
        except stripe.StripeError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        if intent.status == 'succeeded':
            if order.status == 'pending':
                order.status = 'paid'
                order.save(update_fields=['status', 'updated_at'])
            return Response(OrderSerializer(order).data)
        return Response(
            {'error': f'Pago no completado (estado: {intent.status})'},
            status=status.HTTP_400_BAD_REQUEST,
        )


class OrderListView(generics.ListAPIView):
    serializer_class = OrderListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'order_number'

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related('items', 'payment')


class AdminOrderListView(generics.ListAPIView):
    serializer_class = AdminOrderSerializer
    permission_classes = [IsAdminUser]
    queryset = Order.objects.select_related('user').prefetch_related('items', 'payment')


class AdminOrderDetailView(generics.RetrieveAPIView):
    serializer_class = AdminOrderSerializer
    permission_classes = [IsAdminUser]
    queryset = Order.objects.select_related('user').prefetch_related('items', 'payment')


class AdminUpdateOrderStatusView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({'error': 'Pedido no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateOrderStatusSerializer(
            data=request.data, context={'order': order}
        )
        serializer.is_valid(raise_exception=True)

        old_status = order.status
        order.status = serializer.validated_data['status']

        if order.status == 'cancelled' and old_status in ('paid', 'preparing'):
            with transaction.atomic():
                for item in order.items.select_related('watch').all():
                    if item.watch:
                        item.watch.stock += item.quantity
                        item.watch.save()
                order.save()
        else:
            order.save()

        return Response(AdminOrderSerializer(order).data)
