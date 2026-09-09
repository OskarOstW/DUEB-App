from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework import authentication
from rest_framework.exceptions import AuthenticationFailed

from .models import AdminTokenBinding, ObserverAccount


class ObserverPrincipal:
    """Auth-Principal für eingeloggte Beobachter (request.user)."""

    is_authenticated = True
    is_active = True
    is_staff = False
    is_superuser = False
    is_observer = True

    def __init__(self, account: ObserverAccount):
        self.account = account
        self.id = account.id
        self.pk = account.id
        self.username = account.username
        self.email = account.email
        self.first_name = account.first_name
        self.last_name = account.last_name

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def get_username(self):
        return self.username

    def __str__(self):
        return self.username


class ObserverTokenAuthentication(authentication.BaseAuthentication):
    """Authentifiziert Beobachter anhand ihres api_token (Keyword "Token")."""

    keyword = "Token"

    def authenticate(self, request):
        auth = authentication.get_authorization_header(request).split()
        if not auth or auth[0].lower() != self.keyword.lower().encode():
            return None
        if len(auth) != 2:
            return None
        try:
            token = auth[1].decode()
        except UnicodeError:
            return None
        try:
            account = ObserverAccount.objects.get(api_token=token)
        except ObserverAccount.DoesNotExist:
            return None
        if (
            not account.token_created_at
            or account.token_created_at + timedelta(seconds=settings.AUTH_TOKEN_SECONDS)
            <= timezone.now()
        ):
            raise AuthenticationFailed("Sitzung abgelaufen. Bitte erneut anmelden.")
        return (ObserverPrincipal(account), token)

    def authenticate_header(self, request):
        return self.keyword


class ExpiringAdminTokenAuthentication(authentication.TokenAuthentication):
    def authenticate_credentials(self, key):
        user, token = super().authenticate_credentials(key)
        if (
            not user.is_superuser
            or not AdminTokenBinding.objects.filter(
                token=token, auth_hash=user.get_session_auth_hash()
            ).exists()
            or token.created + timedelta(seconds=settings.AUTH_TOKEN_SECONDS) <= timezone.now()
        ):
            raise AuthenticationFailed("Sitzung abgelaufen oder nicht berechtigt.")
        return user, token
