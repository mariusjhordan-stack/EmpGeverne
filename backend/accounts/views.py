from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
import re

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from .serializers import RegisterSerializer, UserSerializer, ChangePasswordSerializer, AddressSerializer
from .models import Address
from .google import GoogleTokenError, GoogleUnavailable, verify_google_token

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }
        }, status=status.HTTP_201_CREATED)



def _session(user, status_code=status.HTTP_200_OK):
    refresh = RefreshToken.for_user(user)
    return Response({
        'user': UserSerializer(user).data,
        'tokens': {'access': str(refresh.access_token), 'refresh': str(refresh)},
    }, status=status_code)


def _new_google_user(identity):
    """Cuenta nueva con el nombre de Google y sin contraseña (solo puede entrar con Google)."""
    base = re.sub(r'[^\w.@+-]', '', identity.email.split('@')[0])[:140] or 'cliente'
    username, n = base, 1
    while User.objects.filter(username=username).exists():
        n += 1
        username = f'{base}{n}'
    first, _, last = (identity.name or base).partition(' ')
    user = User(email=identity.email, username=username, first_name=first[:150], last_name=last.strip()[:150], google_sub=identity.subject)
    user.set_unusable_password()
    user.save()
    return user


class GoogleLoginView(APIView):
    """Ingreso (o registro la primera vez) con Google: recibe el token de Firebase y devuelve los tokens de la tienda."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        token = request.data.get('id_token')
        if not isinstance(token, str) or not token or len(token) > 8192:
            return Response({'detail': 'Falta el token de Google.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            identity = verify_google_token(token)
        except GoogleUnavailable:
            return Response({'detail': 'El ingreso con Google no está disponible ahora. Inténtelo en unos minutos.'},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except GoogleTokenError:
            return Response({'detail': 'No pudimos verificar su cuenta de Google.'}, status=status.HTTP_401_UNAUTHORIZED)

        user = User.objects.filter(google_sub=identity.subject).first()
        created = False
        if user is None:
            # Igual que en la versión Java: un correo que ya tiene contraseña no se une solo a Google.
            if User.objects.filter(email__iexact=identity.email).exists():
                return Response({'detail': 'Este correo ya tiene una cuenta. Ingrese con su contraseña.'},
                                status=status.HTTP_409_CONFLICT)
            try:
                with transaction.atomic():
                    user = _new_google_user(identity)
                created = True
            except IntegrityError:
                # Dos clics a la vez: la otra petición ya creó la cuenta.
                user = User.objects.filter(google_sub=identity.subject).first()
                if user is None:
                    return Response({'detail': 'Este correo ya tiene una cuenta. Ingrese con su contraseña.'},
                                    status=status.HTTP_409_CONFLICT)
        if not user.is_active:
            return Response({'detail': 'No pudimos verificar su cuenta de Google.'}, status=status.HTTP_401_UNAUTHORIZED)
        return _session(user, status.HTTP_201_CREATED if created else status.HTTP_200_OK)

class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'message': 'Contraseña actualizada correctamente.'})


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception:
            return Response(
                {'error': 'Token de refresco inválido o ya fue revocado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({'message': 'Sesión cerrada correctamente.'})


class AddressListCreateView(generics.ListCreateAPIView):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)


class AddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)
