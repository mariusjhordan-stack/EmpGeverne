from django.contrib import admin
from .models import Order, OrderItem, Payment


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['watch_name', 'watch_brand', 'watch_reference', 'unit_price', 'quantity', 'subtotal']


class PaymentInline(admin.StackedInline):
    model = Payment
    extra = 0
    readonly_fields = ['method', 'amount', 'reference', 'is_demo', 'paid_at']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'user', 'status', 'total', 'created_at']
    search_fields = ['order_number', 'user__email']
    list_filter = ['status', 'created_at']
    list_select_related = ['user']
    ordering = ['-created_at']
    readonly_fields = ['order_number', 'subtotal', 'tax', 'total']
    inlines = [OrderItemInline, PaymentInline]
