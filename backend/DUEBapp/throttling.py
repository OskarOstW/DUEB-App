from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.utils.crypto import salted_hmac
from rest_framework.throttling import BaseThrottle

from .models import LoginBucket


def login_wait(request, username, namespace):
    now = timezone.now()
    window = now.replace(second=0, microsecond=0)
    expires = window + timedelta(minutes=1)
    # Production is reachable only through Caddy, which replaces this header.
    source = (
        request.META.get("REMOTE_ADDR", "")
        if settings.DEBUG
        else request.META.get("HTTP_X_FORWARDED_FOR", "")
    )
    source = source.split(",")[-1].strip()
    username = username.strip().casefold()[:150] if isinstance(username, str) else ""
    limits = [(f"source:{source}", 300), (f"{namespace}:account:{username}", 10)]
    buckets = sorted(
        (
            salted_hmac(
                "login-limit", f"{window.isoformat()}:{key}", algorithm="sha256"
            ).hexdigest(),
            limit,
        )
        for key, limit in limits
    )
    LoginBucket.objects.filter(expires_at__lte=now).delete()
    blocked = False
    with transaction.atomic():
        for key, limit in buckets:
            LoginBucket.objects.get_or_create(key=key, defaults={"expires_at": expires})
            bucket = LoginBucket.objects.select_for_update().get(key=key)
            bucket.attempts += 1
            bucket.save(update_fields=["attempts"])
            blocked |= bucket.attempts > limit
    return max(1, int((expires - now).total_seconds()) + 1) if blocked else 0


class LoginThrottle(BaseThrottle):
    retry_after = 0

    def allow_request(self, request, view):
        namespace = "observer" if view.__class__.__name__ == "ObserverLoginView" else "admin"
        self.retry_after = login_wait(request, request.data.get("username"), namespace)
        return not self.retry_after

    def wait(self):
        return self.retry_after
