from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db.models import Sum, Count
from catalog.models import Watch, Brand
from orders.models import Order
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

        return Response({
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
