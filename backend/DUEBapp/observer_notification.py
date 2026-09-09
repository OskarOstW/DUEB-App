import uuid

from django import forms
from django.conf import settings
from django.contrib import admin, messages
from django.core import signing
from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.http import HttpResponseNotAllowed, HttpResponseRedirect
from django.shortcuts import render
from django.urls import path
from django.utils.crypto import get_random_string

from .admin.readonly import ReadOnlyResponsesMixin
from .models import EmailConfig, ObserverAccount, ObserverEmailDelivery, ObserverNotification


@admin.register(ObserverNotification)
class ObserverNotificationAdmin(admin.ModelAdmin):
    def changelist_view(self, request, extra_context=None):
        return HttpResponseRedirect("./email_form/")

    def add_view(self, request, form_url="", extra_context=None):
        return HttpResponseRedirect("./email_form/")

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                "email_form/",
                self.admin_site.admin_view(self.email_form_view),
                name="observer_email_form",
            ),
            path(
                "send_emails/",
                self.admin_site.admin_view(self.send_emails_view),
                name="send_observer_emails",
            ),
        ]
        return custom_urls + urls

    def has_add_permission(self, request):
        return request.user.has_perm("DUEBapp.change_observeraccount") and request.user.has_perm(
            "DUEBapp.change_emailconfig"
        )

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return request.user.has_perm("DUEBapp.change_observeraccount") and request.user.has_perm(
            "DUEBapp.change_emailconfig"
        )

    def email_form_view(self, request):
        if not self.has_change_permission(request):
            raise PermissionDenied

        config, _ = EmailConfig.objects.get_or_create(pk=1)

        class EmailConfigForm(forms.ModelForm):
            class Meta:
                model = EmailConfig
                fields = ["selected_observers", "subject", "email_text"]
                widgets = {
                    "subject": forms.TextInput(attrs={"size": "80", "class": "vTextField"}),
                    "email_text": forms.Textarea(
                        attrs={
                            "rows": 20,
                            "cols": 80,
                            "class": "vLargeTextField",
                            "style": "height: 300px;",  # Größeres Textfeld
                        }
                    ),
                }

        if request.method == "POST":
            form = EmailConfigForm(request.POST, instance=config)

            if form.is_valid():
                form.save()

                if "_send_emails" in request.POST:
                    return self.send_emails_view(request)

                messages.success(request, "Konfiguration erfolgreich gespeichert.")
        else:
            form = EmailConfigForm(instance=config)

        observers = ObserverAccount.objects.all().order_by("last_name", "first_name")

        opts = EmailConfig._meta
        context = {
            **self.admin_site.each_context(request),
            "title": "E-Mails an Beobachter senden",
            "app_label": opts.app_label,
            "opts": opts,
            "form": form,
            "observers": observers,
            "config": config,
            "send_token": signing.dumps(
                {"user": request.user.pk, "nonce": get_random_string(32)}, salt="observer-mail"
            ),
        }

        return render(request, "admin/observer_email_form.html", context)

    def send_emails_view(self, request):
        if request.method != "POST":
            return HttpResponseNotAllowed(["POST"])
        if not self.has_change_permission(request):
            raise PermissionDenied

        try:
            send_token = request.POST.get("send_token", "")
            token_data = signing.loads(send_token, salt="observer-mail", max_age=86400)
            if token_data["user"] != request.user.pk:
                raise signing.BadSignature()
        except (signing.BadSignature, KeyError):
            messages.error(
                request, "Der Versandauftrag ist abgelaufen. Bitte die Versandseite neu öffnen."
            )
            return HttpResponseRedirect("../email_form/")

        try:
            config = EmailConfig.objects.get(pk=1)
        except EmailConfig.DoesNotExist:
            messages.error(request, "E-Mail-Konfiguration nicht gefunden.")
            return HttpResponseRedirect("../email_form/")

        observer_count = config.selected_observers.count()
        if observer_count == 0:
            messages.error(request, "Keine Beobachter ausgewählt.")
            return HttpResponseRedirect("../email_form/")

        try:
            config.email_text.format(
                name="Name",
                username="Benutzername",
                password="Passwort",
                login_url=settings.SITE_URL,
            )
        except (KeyError, ValueError, IndexError, AttributeError):
            messages.error(
                request,
                "Ungültige Platzhalter im E-Mail-Text. Erlaubt sind name, username, password und login_url.",
            )
            return HttpResponseRedirect("../email_form/")

        batch_id = uuid.uuid5(
            uuid.NAMESPACE_URL, f"observer-mail:{request.user.pk}:{token_data['nonce']}"
        )
        with transaction.atomic():
            created = 0
            for observer in config.selected_observers.all():
                _, is_new = ObserverEmailDelivery.objects.get_or_create(
                    observer=observer,
                    batch_id=batch_id,
                    defaults={
                        "subject": config.subject,
                        "template": config.email_text,
                        "recipient": observer.email,
                        "login_url": settings.SITE_URL.rstrip("/") + "/login",
                    },
                )
                created += is_new
        messages.success(
            request,
            f"{created} Versandauftrag/-aufträge gespeichert. Den Fortschritt finden Sie unter E-Mail-Versandaufträge.",
        )
        return HttpResponseRedirect("../email_form/")


@admin.register(ObserverEmailDelivery)
class ObserverEmailDeliveryAdmin(ReadOnlyResponsesMixin, admin.ModelAdmin):
    list_display = ["created_at", "observer", "recipient", "status", "error"]
    list_filter = ["status", "created_at"]
    search_fields = ["observer__username", "recipient"]
    list_select_related = ["observer"]
    fields = [
        "observer",
        "recipient",
        "subject",
        "status",
        "error",
        "batch_id",
        "created_at",
        "updated_at",
    ]
    readonly_fields = fields
