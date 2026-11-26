from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed

from .serializers import ChatRequestSerializer
from .service import advise


class OptionalJWTAuthentication(JWTAuthentication):
    """A public endpoint: a valid JWT identifies the user (for throttling), an expired one is ignored."""

    def authenticate(self, request):
        try:
            return super().authenticate(request)
        except (InvalidToken, AuthenticationFailed):
            return None


class AdvisorChatView(APIView):
    """POST /api/advisor/chat/ — watch-buying advisor (Gemini, or basic mode without AI)."""
    authentication_classes = [OptionalJWTAuthentication]
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'advisor'

    def post(self, request):
        serializer = ChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        payload, _model = advise(data['messages'], currency=data['currency'], language=data['language'],
                                 build_url=request.build_absolute_uri)
        return Response(payload)
