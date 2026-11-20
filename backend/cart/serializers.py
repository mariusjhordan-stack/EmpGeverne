from rest_framework import serializers
from .models import Cart, CartItem
from catalog.models import Watch


class CartItemSerializer(serializers.ModelSerializer):
    watch_name = serializers.CharField(source='watch.name', read_only=True)
    watch_slug = serializers.CharField(source='watch.slug', read_only=True)
    watch_brand = serializers.CharField(source='watch.brand.name', read_only=True)
    watch_price = serializers.DecimalField(source='watch.price', max_digits=12, decimal_places=2, read_only=True)
    watch_stock = serializers.IntegerField(source='watch.stock', read_only=True)
    watch_image = serializers.SerializerMethodField()
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = CartItem
        fields = [
            'id', 'watch', 'watch_name', 'watch_slug', 'watch_brand',
            'watch_price', 'watch_stock', 'watch_image', 'quantity', 'subtotal',
        ]
        read_only_fields = ['id']

    def get_watch_image(self, obj):
        img = obj.watch.images.filter(is_primary=True).first()
        if not img:
            img = obj.watch.images.first()
        if img and img.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(img.image.url)
            return img.image.url
        return None

    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError('La cantidad debe ser al menos 1.')
        return value


class AddToCartSerializer(serializers.Serializer):
    watch_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, default=1)

    def validate_watch_id(self, value):
        try:
            watch = Watch.objects.get(pk=value, is_active=True)
        except Watch.DoesNotExist:
            raise serializers.ValidationError('Reloj no encontrado.')
        return value

    def validate(self, attrs):
        watch = Watch.objects.get(pk=attrs['watch_id'])
        if watch.stock < attrs['quantity']:
            raise serializers.ValidationError(
                {'quantity': f'Stock insuficiente. Disponible: {watch.stock}'}
            )
        attrs['watch'] = watch
        return attrs


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    item_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Cart
        fields = ['id', 'items', 'total', 'item_count', 'updated_at']
