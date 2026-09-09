import logging
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.db import transaction
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import AdminTokenBinding, ObserverAccount, generate_observer_token
from ..throttling import LoginThrottle

logger = logging.getLogger(__name__)


class CustomAuthToken(ObtainAuthToken):
    throttle_classes = [LoginThrottle]

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        if not user.is_superuser:
            return Response({"detail": "Ungültige Zugangsdaten."}, status=401)
        token, _ = Token.objects.get_or_create(user=user)
        if (
            not AdminTokenBinding.objects.filter(
                token=token, auth_hash=user.get_session_auth_hash()
            ).exists()
            or token.created + timedelta(seconds=settings.AUTH_TOKEN_SECONDS) <= timezone.now()
        ):
            token.delete()
            token = Token.objects.create(user=user)
        AdminTokenBinding.objects.update_or_create(
            token=token, defaults={"auth_hash": user.get_session_auth_hash()}
        )
        return Response(
            {
                "account_id": f"admin:{user.pk}",
                "token": token.key,
                "email": user.email,
                "username": user.username,
                "expires_at": token.created + timedelta(seconds=settings.AUTH_TOKEN_SECONDS),
            }
        )


class ObserverLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [LoginThrottle]

    def post(self, request, *args, **kwargs):
        username = request.data.get("username")
        password = request.data.get("password")
        if not isinstance(username, str) or not isinstance(password, str):
            return Response({"detail": "Benutzername und Passwort erforderlich."}, status=400)
        with transaction.atomic():
            observer = (
                ObserverAccount.objects.select_for_update()
                .filter(username=username.strip())
                .first()
            )
            if observer is None:
                make_password(password)
            if observer is None or not observer.check_password(password):
                return Response({"detail": "Ungültige Zugangsdaten."}, status=401)
            if (
                not observer.token_created_at
                or observer.token_created_at + timedelta(seconds=settings.AUTH_TOKEN_SECONDS)
                <= timezone.now()
            ):
                observer.api_token = generate_observer_token()
                observer.token_created_at = timezone.now()
                observer.save(update_fields=["api_token", "token_created_at"])
            return Response(
                {
                    "account_id": str(observer.public_id),
                    "token": observer.api_token,
                    "username": observer.username,
                    "first_name": observer.first_name,
                    "last_name": observer.last_name,
                    "email": observer.email,
                    "show_patient_profiles": observer.show_patient_profiles,
                    "allowed_forms": list(observer.allowed_forms.values_list("id", flat=True)),
                    "data_revision": observer.data_revision,
                    "expires_at": observer.token_created_at
                    + timedelta(seconds=settings.AUTH_TOKEN_SECONDS),
                }
            )
