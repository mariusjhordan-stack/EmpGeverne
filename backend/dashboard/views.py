from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from datetime import timedelta

from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from catalog.models import Watch, Brand
from orders.models import Order, OrderItem
from orders.serializers import primary_image
from config.permissions import IsAdminUser

User = get_user_model()


class DashboardStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        total_watches = Watch.objects.count()
        active_watches = Watch.objects.filter(is_active=True).count()
        out_of_stock = Watch.objects.filter(stock=0, is_active=True).count()
        total_orders = Order.objects.count()
        pending_orders = Order.objects.filter(status='pending').count()
        total_customers = User.objects.filter(is_staff=False).count()
        total_revenue = Order.objects.filter(
            status__in=['paid', 'preparing', 'shipped', 'delivered']
        ).aggregate(total=Sum('total'))['total'] or 0
        total_brands = Brand.objects.filter(is_active=True).count()

        recent_orders = Order.objects.select_related('user').order_by('-created_at')[:5]
        recent_orders_data = [
            {
                'order_number': o.order_number,
                'customer': o.user.email,
                'customer_name': f"{o.user.first_name} {o.user.last_name}".strip(),
                'total': str(o.total),
                'status': o.status,
                'status_display': o.get_status_display(),
                'created_at': o.created_at.isoformat(),
            }
            for o in recent_orders
        ]

        orders_by_status = dict(
            Order.objects.values_list('status').annotate(count=Count('id')).values_list('status', 'count')
        )

        # Ventas confirmadas de los últimos 14 días (un punto por día, también los días sin ventas).
        paid = Order.objects.filter(status__in=['paid', 'preparing', 'shipped', 'delivered'])
        today = timezone.localdate()
        start = today - timedelta(days=13)
        per_day = {
            row['day']: row for row in paid.filter(created_at__date__gte=start)
            .annotate(day=TruncDate('created_at')).values('day')
            .annotate(revenue=Sum('total'), orders=Count('id'))
        }
        sales_by_day = [
            {
                'date': (start + timedelta(days=i)).isoformat(),
                'revenue': str(per_day.get(start + timedelta(days=i), {}).get('revenue') or 0),
                'orders': per_day.get(start + timedelta(days=i), {}).get('orders') or 0,
            }
            for i in range(14)
        ]
        paid_count = paid.count()
        avg_ticket = (total_revenue / paid_count) if paid_count else 0

        def image_url(watch):
            img = primary_image(watch)
            return request.build_absolute_uri(img.image.url) if img else None

        top = (OrderItem.objects.filter(order__status__in=['paid', 'preparing', 'shipped', 'delivered'], watch__isnull=False)
               .values('watch').annotate(units=Sum('quantity'), revenue=Sum('subtotal')).order_by('-units', '-revenue')[:5])
        watches = Watch.objects.prefetch_related('images').select_related('brand').in_bulk([t['watch'] for t in top])
        top_watches = [
            {
                'id': t['watch'], 'name': watches[t['watch']].name, 'brand': watches[t['watch']].brand.name,
                'units': t['units'], 'revenue': str(t['revenue']), 'image': image_url(watches[t['watch']]),
            }
            for t in top if t['watch'] in watches
        ]
        low_stock = [
            {'id': w.id, 'name': w.name, 'brand': w.brand.name, 'stock': w.stock, 'image': image_url(w)}
            for w in Watch.objects.filter(is_active=True, stock__lte=2).select_related('brand')
            .prefetch_related('images').order_by('stock', 'name')[:6]
        ]

        return Response({
            'sales_by_day': sales_by_day,
            'avg_ticket': str(round(avg_ticket, 2)),
            'paid_orders': paid_count,
            'top_watches': top_watches,
            'low_stock': low_stock,
            'total_watches': total_watches,
            'active_watches': active_watches,
            'out_of_stock': out_of_stock,
            'total_orders': total_orders,
            'pending_orders': pending_orders,
            'total_customers': total_customers,
            'total_revenue': str(total_revenue),
            'total_brands': total_brands,
            'recent_orders': recent_orders_data,
            'orders_by_status': orders_by_status,
        })


class AdminCustomerListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        customers = User.objects.filter(is_staff=False).annotate(
            order_count=Count('orders')
        ).order_by('-date_joined')

        data = [
            {
                'id': c.id,
                'email': c.email,
                'first_name': c.first_name,
                'last_name': c.last_name,
                'date_joined': c.date_joined.isoformat(),
                'order_count': c.order_count,
                'is_active': c.is_active,
            }
            for c in customers
        ]
        return Response(data)
