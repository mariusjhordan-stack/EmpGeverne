from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('brands', views.BrandViewSet, basename='brand')
router.register('collections', views.CollectionViewSet, basename='collection')
router.register('watches', views.WatchViewSet, basename='watch')
router.register('favorites', views.FavoriteViewSet, basename='favorite')

admin_router = DefaultRouter()
admin_router.register('brands', views.AdminBrandViewSet, basename='admin-brand')
admin_router.register('collections', views.AdminCollectionViewSet, basename='admin-collection')
admin_router.register('watches', views.AdminWatchViewSet, basename='admin-watch')

urlpatterns = [
    path('', include(router.urls)),
    path('admin/', include(admin_router.urls)),
]
