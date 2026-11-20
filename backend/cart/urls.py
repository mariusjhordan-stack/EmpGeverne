from django.urls import path
from . import views

urlpatterns = [
    path('', views.CartView.as_view(), name='cart'),
    path('add/', views.AddToCartView.as_view(), name='cart_add'),
    path('items/<int:item_id>/', views.UpdateCartItemView.as_view(), name='cart_item'),
    path('clear/', views.ClearCartView.as_view(), name='cart_clear'),
]
