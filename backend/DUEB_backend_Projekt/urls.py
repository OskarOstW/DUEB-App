from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.generic import RedirectView
from DUEBapp.media import PrivateMediaView

admin.site.site_header = "DUEB App Administration"
admin.site.site_title = "DUEB App"
admin.site.index_title = "Übungsverwaltung"
admin.site.site_url = settings.SITE_URL.rstrip("/") + "/"

urlpatterns = [
    path("admin/", admin.site.urls),
    re_path(
        r"^django-admin/(?P<path>.*)$",
        RedirectView.as_view(url="/admin/%(path)s", query_string=True, permanent=False),
    ),
    path("_nested_admin/", include("nested_admin.urls")),
    path("api/", include("DUEBapp.urls")),
    path("media/<path:path>", PrivateMediaView.as_view()),
    path(
        "login", RedirectView.as_view(url=settings.SITE_URL.rstrip("/") + "/login", permanent=False)
    ),
    path(
        "beobachter",
        RedirectView.as_view(url=settings.SITE_URL.rstrip("/") + "/beobachter", permanent=False),
    ),
    path("", RedirectView.as_view(url="/admin/", permanent=False)),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
