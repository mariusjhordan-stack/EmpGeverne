from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Cart, CartItem
from .serializers import CartSerializer, AddToCartSerializer, CartItemSerializer
from catalog.models import Watch


class CartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        serializer = CartSerializer(cart, context={'request': request})
        return Response(serializer.data)


class AddToCartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = AddToCartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        cart, _ = Cart.objects.get_or_create(user=request.user)
        watch = serializer.validated_data['watch']
        quantity = serializer.validated_data['quantity']

        item, created = CartItem.objects.get_or_create(
            cart=cart, watch=watch, defaults={'quantity': quantity}
        )
        if created:
            if quantity > watch.stock:
                item.delete()
                return Response(
                    {'error': f'Stock insuficiente. Disponible: {watch.stock}'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            new_qty = item.quantity + quantity
            if new_qty > watch.stock:
                return Response(
                    {'error': f'Stock insuficiente. Disponible: {watch.stock}'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            item.quantity = new_qty
            item.save()

        return Response(
            CartSerializer(cart, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )


class UpdateCartItemView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, item_id):
        cart = Cart.objects.filter(user=request.user).first()
        if not cart:
            return Response({'error': 'Carrito no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            item = cart.items.select_related('watch').get(pk=item_id)
        except CartItem.DoesNotExist:
            return Response({'error': 'Producto no encontrado en el carrito.'}, status=status.HTTP_404_NOT_FOUND)

        raw_quantity = request.data.get('quantity')
        try:
            quantity = int(raw_quantity)
        except (TypeError, ValueError):
            return Response({'error': 'Cantidad inválida.'}, status=status.HTTP_400_BAD_REQUEST)
        if quantity < 1:
            return Response({'error': 'Cantidad inválida.'}, status=status.HTTP_400_BAD_REQUEST)
        if quantity > item.watch.stock:
            return Response(
                {'error': f'Stock insuficiente. Disponible: {item.watch.stock}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        item.quantity = quantity
        item.save()
        return Response(CartSerializer(cart, context={'request': request}).data)

    def delete(self, request, item_id):
        cart = Cart.objects.filter(user=request.user).first()
        if not cart:
            return Response({'error': 'Carrito no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            item = cart.items.get(pk=item_id)
            item.delete()
        except CartItem.DoesNotExist:
            return Response({'error': 'Producto no encontrado en el carrito.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(CartSerializer(cart, context={'request': request}).data)


class ClearCartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        cart = Cart.objects.filter(user=request.user).first()
        if cart:
            cart.items.all().delete()
        return Response({'message': 'Carrito vaciado.'})
