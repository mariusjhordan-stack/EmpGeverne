from rest_framework import serializers
from .models import Brand, Collection, Watch, WatchImage, Favorite


class BrandSerializer(serializers.ModelSerializer):
    watch_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Brand
        fields = ['id', 'name', 'slug', 'description', 'logo', 'country', 'is_active', 'watch_count']


class CollectionSerializer(serializers.ModelSerializer):
    watch_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Collection
        fields = ['id', 'name', 'slug', 'description', 'image', 'is_active', 'watch_count']


class WatchImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = WatchImage
        fields = ['id', 'image', 'alt_text', 'is_primary', 'order']


class WatchListSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    collection_name = serializers.CharField(source='collection.name', read_only=True, default=None)
    primary_image = serializers.SerializerMethodField()
    secondary_image = serializers.SerializerMethodField()
    is_available = serializers.BooleanField(read_only=True)

    class Meta:
        model = Watch
        fields = [
            'id', 'name', 'slug', 'reference', 'brand', 'brand_name',
            'collection', 'collection_name', 'price', 'stock',
            'movement', 'dial_color', 'is_active', 'is_featured', 'is_available',
            'primary_image', 'secondary_image', 'created_at',
        ]

    def _image_url(self, img):
        if img and img.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(img.image.url)
            return img.image.url
        return None

    def get_primary_image(self, obj):
        img = obj.images.filter(is_primary=True).first()
        if not img:
            img = obj.images.first()
        return self._image_url(img)

    def get_secondary_image(self, obj):
        # Second image by order (skipping the primary one), for hover swaps in listings.
        images = sorted(obj.images.all(), key=lambda i: (i.order, i.pk))
        primary = next((i for i in images if i.is_primary), images[0] if images else None)
        rest = [i for i in images if i is not primary]
        return self._image_url(rest[0]) if rest else None


class WatchDetailSerializer(serializers.ModelSerializer):
    brand = BrandSerializer(read_only=True)
    collection = CollectionSerializer(read_only=True)
    images = WatchImageSerializer(many=True, read_only=True)
    is_available = serializers.BooleanField(read_only=True)
    is_favorited = serializers.SerializerMethodField()
    related_watches = serializers.SerializerMethodField()

    class Meta:
        model = Watch
        fields = [
            'id', 'name', 'slug', 'reference', 'brand', 'collection',
            'description', 'price', 'stock', 'movement',
            'case_material', 'case_diameter', 'water_resistance',
            'crystal', 'strap_material', 'dial_color', 'warranty',
            'is_active', 'is_featured', 'is_available', 'is_favorited',
            'images', 'related_watches', 'created_at', 'updated_at',
        ]

    def get_is_favorited(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Favorite.objects.filter(user=request.user, watch=obj).exists()
        return False

    def get_related_watches(self, obj):
        related = Watch.objects.filter(
            brand=obj.brand, is_active=True
        ).exclude(pk=obj.pk).select_related('brand')[:4]
        return WatchListSerializer(related, many=True, context=self.context).data


class WatchAdminSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    images = WatchImageSerializer(many=True, read_only=True)

    class Meta:
        model = Watch
        fields = [
            'id', 'name', 'slug', 'reference', 'brand', 'brand_name',
            'collection', 'description', 'price', 'stock', 'movement',
            'case_material', 'case_diameter', 'water_resistance',
            'crystal', 'strap_material', 'dial_color', 'warranty',
            'is_active', 'is_featured', 'images', 'created_at', 'updated_at',
        ]


class FavoriteSerializer(serializers.ModelSerializer):
    watch = WatchListSerializer(read_only=True)
    watch_id = serializers.PrimaryKeyRelatedField(
        queryset=Watch.objects.all(), source='watch', write_only=True
    )

    class Meta:
        model = Favorite
        fields = ['id', 'watch', 'watch_id', 'created_at']

    def validate(self, attrs):
        user = self.context['request'].user
        watch = attrs['watch']
        if Favorite.objects.filter(user=user, watch=watch).exists():
            raise serializers.ValidationError('Este reloj ya está en favoritos.')
        return attrs

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
