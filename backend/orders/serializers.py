from rest_framework import serializers
from .models import Order, OrderItem, Payment


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            'id', 'watch', 'watch_name', 'watch_brand',
            'watch_reference', 'unit_price', 'quantity', 'subtotal',
        ]
        read_only_fields = fields


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['id', 'method', 'amount', 'reference', 'is_demo', 'paid_at']
        read_only_fields = fields


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    payment = PaymentSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'status', 'status_display',
            'shipping_street', 'shipping_city', 'shipping_state',
            'shipping_postal_code', 'shipping_country',
            'subtotal', 'tax', 'total', 'notes',
            'items', 'payment', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'order_number', 'status', 'subtotal', 'tax', 'total',
            'created_at', 'updated_at',
        ]


class OrderListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    item_count = serializers.IntegerField(source='items.count', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'status', 'status_display',
            'total', 'item_count', 'created_at',
        ]


class CreateOrderSerializer(serializers.Serializer):
    address_id = serializers.IntegerField(required=False)
    shipping_street = serializers.CharField(max_length=255, required=False)
    shipping_city = serializers.CharField(max_length=100, required=False)
    shipping_state = serializers.CharField(max_length=100, required=False)
    shipping_postal_code = serializers.CharField(max_length=20, required=False)
    shipping_country = serializers.CharField(max_length=100, default='Perú')
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    payment_method = serializers.ChoiceField(
        choices=['demo_card', 'demo_transfer', 'stripe_card'],
        default='demo_card',
    )

    def validate(self, attrs):
        address_id = attrs.get('address_id')
        if address_id:
            from accounts.models import Address
            try:
                address = Address.objects.get(pk=address_id, user=self.context['request'].user)
                attrs['shipping_street'] = address.street
                attrs['shipping_city'] = address.city
                attrs['shipping_state'] = address.state
                attrs['shipping_postal_code'] = address.postal_code
                attrs['shipping_country'] = address.country
            except Address.DoesNotExist:
                raise serializers.ValidationError({'address_id': 'Dirección no encontrada.'})
        elif not all([attrs.get('shipping_street'), attrs.get('shipping_city'),
                      attrs.get('shipping_state'), attrs.get('shipping_postal_code')]):
            raise serializers.ValidationError('Proporcione una dirección de envío completa o un address_id.')
        return attrs


class UpdateOrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.STATUS_CHOICES)

    def validate_status(self, value):
        order = self.context['order']
        if not order.can_transition_to(value):
            raise serializers.ValidationError(
                f'No se puede cambiar de "{order.get_status_display()}" a "{dict(Order.STATUS_CHOICES).get(value)}".'
            )
        return value


class AdminOrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    payment = PaymentSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'user', 'user_email', 'user_name',
            'status', 'status_display',
            'shipping_street', 'shipping_city', 'shipping_state',
            'shipping_postal_code', 'shipping_country',
            'subtotal', 'tax', 'total', 'notes',
            'items', 'payment', 'created_at', 'updated_at',
        ]

    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username
