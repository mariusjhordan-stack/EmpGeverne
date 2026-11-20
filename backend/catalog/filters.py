import django_filters
from .models import Watch


class WatchFilter(django_filters.FilterSet):
    brand = django_filters.NumberFilter(field_name='brand__id')
    brand_slug = django_filters.CharFilter(field_name='brand__slug')
    collection = django_filters.NumberFilter(field_name='collection__id')
    collection_slug = django_filters.CharFilter(field_name='collection__slug')
    min_price = django_filters.NumberFilter(field_name='price', lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name='price', lookup_expr='lte')
    movement = django_filters.CharFilter(field_name='movement')
    is_featured = django_filters.BooleanFilter(field_name='is_featured')
    in_stock = django_filters.BooleanFilter(method='filter_in_stock')

    class Meta:
        model = Watch
        fields = ['brand', 'collection', 'movement', 'is_featured']

    def filter_in_stock(self, queryset, name, value):
        if value:
            return queryset.filter(stock__gt=0)
        return queryset.filter(stock=0)
