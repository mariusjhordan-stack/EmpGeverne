from django.contrib import admin
from .models import Brand, Collection, Watch, WatchImage, Favorite


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ['name', 'country', 'is_active', 'created_at']
    search_fields = ['name']
    list_filter = ['is_active', 'country']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Collection)
class CollectionAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'created_at']
    search_fields = ['name']
    list_filter = ['is_active']
    prepopulated_fields = {'slug': ('name',)}


class WatchImageInline(admin.TabularInline):
    model = WatchImage
    extra = 1


@admin.register(Watch)
class WatchAdmin(admin.ModelAdmin):
    list_display = ['name', 'brand', 'reference', 'price', 'stock', 'is_active', 'is_featured']
    search_fields = ['name', 'reference', 'brand__name']
    list_filter = ['is_active', 'is_featured', 'brand', 'collection', 'movement']
    list_select_related = ['brand', 'collection']
    prepopulated_fields = {'slug': ('name',)}
    ordering = ['-created_at']
    inlines = [WatchImageInline]


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ['user', 'watch', 'created_at']
    list_select_related = ['user', 'watch']
