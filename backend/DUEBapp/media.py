from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from .models import FormResponse, HomeScreenImage
from .observer_auth import ExpiringAdminTokenAuthentication, ObserverTokenAuthentication


class PrivateMediaView(APIView):
    authentication_classes = [
        ObserverTokenAuthentication,
        ExpiringAdminTokenAuthentication,
        SessionAuthentication,
    ]
    permission_classes = [IsAuthenticated]

    def get(self, request, path):
        root = Path(settings.MEDIA_ROOT).resolve()
        target = (root / path).resolve()
        if not target.is_relative_to(root) or not target.is_file():
            raise Http404
        user = request.user
        allowed = bool(getattr(user, "is_superuser", False))
        if user.is_staff and not allowed:
            allowed = (
                user.has_perm("DUEBapp.view_homescreenimage")
                and HomeScreenImage.objects.filter(image=path).exists()
            ) or (
                user.has_perm("DUEBapp.view_formresponse")
                and FormResponse.objects.filter(images__image=path).exists()
            )
        if getattr(request.user, "is_observer", False):
            allowed = HomeScreenImage.visible_to(request.user).filter(image=path).exists()
            allowed = (
                allowed
                or FormResponse.objects.filter(
                    images__image=path,
                    observer=request.user.account,
                    form__in=request.user.account.allowed_forms.all(),
                ).exists()
            )
        if not allowed:
            raise Http404
        response = FileResponse(
            target.open("rb"),
            as_attachment=target.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp"},
        )
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        response["Content-Security-Policy"] = "default-src 'none'; sandbox"
        return response
