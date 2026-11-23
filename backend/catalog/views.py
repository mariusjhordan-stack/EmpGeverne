from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count
from .models import Brand, Collection, Watch, WatchImage, Favorite
from .serializers import (
    BrandSerializer, CollectionSerializer, WatchListSerializer,
    WatchDetailSerializer, WatchAdminSerializer, WatchImageSerializer,
    FavoriteSerializer,
)
from .filters import WatchFilter
from config.permissions import IsAdminUser


class BrandViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = BrandSerializer
    pagination_class = None  # short public lists: return them whole for filters/menus
    permission_classes = [permissions.AllowAny]
    ordering = ['name']

    def get_queryset(self):
        return Brand.objects.filter(is_active=True).annotate(watch_count=Count('watches')).order_by('name')


class CollectionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CollectionSerializer
    pagination_class = None  # short public lists: return them whole for filters/menus
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Collection.objects.filter(is_active=True).annotate(watch_count=Count('watches'))


class WatchViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = WatchFilter
    search_fields = ['name', 'brand__name', 'reference']
    ordering_fields = ['price', 'created_at', 'name']
    ordering = ['-created_at']
    lookup_field = 'slug'

    def get_queryset(self):
        return Watch.objects.filter(
            is_active=True
        ).select_related('brand', 'collection').prefetch_related('images')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return WatchDetailSerializer
        return WatchListSerializer

    @action(detail=False, methods=['get'])
    def featured(self, request):
        watches = self.get_queryset().filter(is_featured=True)[:8]
        serializer = WatchListSerializer(watches, many=True, context={'request': request})
        return Response(serializer.data)


class FavoriteViewSet(viewsets.ModelViewSet):
    serializer_class = FavoriteSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'delete']

    def get_queryset(self):
        return Favorite.objects.filter(
            user=self.request.user
        ).select_related('watch__brand')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminBrandViewSet(viewsets.ModelViewSet):
    serializer_class = BrandSerializer
    permission_classes = [IsAdminUser]
    queryset = Brand.objects.annotate(watch_count=Count('watches'))


class AdminCollectionViewSet(viewsets.ModelViewSet):
    serializer_class = CollectionSerializer
    permission_classes = [IsAdminUser]
    queryset = Collection.objects.annotate(watch_count=Count('watches'))


class AdminWatchViewSet(viewsets.ModelViewSet):
    serializer_class = WatchAdminSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'brand__name', 'reference']
    ordering_fields = ['price', 'created_at', 'stock', 'name']

    def get_queryset(self):
        return Watch.objects.select_related('brand', 'collection').prefetch_related('images')

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_image(self, request, pk=None):
        watch = self.get_object()
        image = request.FILES.get('image')
        if not image:
            return Response({'error': 'No se proporcionó una imagen.'}, status=status.HTTP_400_BAD_REQUEST)

        is_primary = request.data.get('is_primary', 'false').lower() == 'true'
        watch_image = WatchImage.objects.create(
            watch=watch,
            image=image,
            alt_text=request.data.get('alt_text', ''),
            is_primary=is_primary,
        )
        return Response(WatchImageSerializer(watch_image).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='delete-image/(?P<image_id>[0-9]+)')
    def delete_image(self, request, pk=None, image_id=None):
        watch = self.get_object()
        try:
            image = watch.images.get(pk=image_id)
            image.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except WatchImage.DoesNotExist:
            return Response({'error': 'Imagen no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
