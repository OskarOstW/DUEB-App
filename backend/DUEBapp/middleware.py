from django.http import HttpResponse

from .throttling import login_wait


class AdminLoginThrottleMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "POST" and request.path.rstrip("/") in {
            "/admin/login",
            "/django-admin/login",
        }:
            wait = login_wait(request, request.POST.get("username"), "admin")
            if wait:
                response = HttpResponse(
                    "Zu viele Anmeldeversuche. Bitte in einer Minute erneut versuchen.", status=429
                )
                response["Retry-After"] = str(wait)
                response["Cache-Control"] = "no-store"
                return response
        return self.get_response(request)


class PrivateResponseMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path.startswith(("/api/", "/media/")):
            response["Cache-Control"] = "private, no-store"
        return response
