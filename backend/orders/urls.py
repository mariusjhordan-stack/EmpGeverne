from django.urls import path
from . import views

urlpatterns = [
    path('create/', views.CreateOrderView.as_view(), name='order_create'),
    path('<str:order_number>/confirm-payment/', views.ConfirmStripePaymentView.as_view(), name='order_confirm_payment'),
    path('', views.OrderListView.as_view(), name='order_list'),
    path('<str:order_number>/', views.OrderDetailView.as_view(), name='order_detail'),
    path('admin/list/', views.AdminOrderListView.as_view(), name='admin_order_list'),
    path('admin/<int:pk>/', views.AdminOrderDetailView.as_view(), name='admin_order_detail'),
    path('admin/<int:pk>/status/', views.AdminUpdateOrderStatusView.as_view(), name='admin_order_status'),
]
