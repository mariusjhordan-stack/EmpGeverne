from django.urls import path
from . import views

urlpatterns = [
    path('stats/', views.DashboardStatsView.as_view(), name='dashboard_stats'),
    path('customers/', views.AdminCustomerListView.as_view(), name='admin_customers'),
]
