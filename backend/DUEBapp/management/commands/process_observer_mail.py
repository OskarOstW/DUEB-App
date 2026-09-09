import time
from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.core.mail import EmailMessage
from django.core.management.base import BaseCommand
from django.db import close_old_connections, transaction
from django.utils import timezone
from django.utils.crypto import get_random_string
from DUEBapp.models import ObserverAccount, ObserverEmailDelivery


class Command(BaseCommand):
    help = "Verarbeitet gespeicherte E-Mail-Aufträge ohne automatische Wiederholung unklarer Zustellungen."

    def add_arguments(self, parser):
        parser.add_argument("--loop", action="store_true")

    def handle(self, *args, **options):
        while True:
            close_old_connections()
            Path("/tmp/dueb-mail-heartbeat").touch()
            ObserverEmailDelivery.objects.filter(
                status="sending", updated_at__lt=timezone.now() - timedelta(minutes=10)
            ).update(status="uncertain", error="Worker unterbrochen; Zustellung manuell prüfen.")
            with transaction.atomic():
                job = (
                    ObserverEmailDelivery.objects.select_for_update(skip_locked=True)
                    .filter(status="pending")
                    .order_by("pk")
                    .first()
                )
                if job:
                    job.status = "sending"
                    job.save(update_fields=["status", "updated_at"])
            if job:
                self.deliver(job)
            elif not options["loop"]:
                return
            else:
                time.sleep(2)

    def deliver(self, job):
        # The durable 'sending' marker survives crashes between SMTP and commit.
        smtp_started = False
        try:
            with transaction.atomic():
                observer = ObserverAccount.objects.select_for_update().get(pk=job.observer_id)
                if observer.email != job.recipient:
                    raise ValueError("Empfängeradresse wurde geändert.")
                password = get_random_string(
                    16, allowed_chars="abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"
                )
                body = job.template.format(
                    name=f"{observer.first_name} {observer.last_name}",
                    username=observer.username,
                    password=password,
                    login_url=job.login_url,
                )
                email = EmailMessage(
                    job.subject, body, settings.DEFAULT_FROM_EMAIL, [job.recipient]
                )
                smtp_started = True
                if email.send() != 1:
                    raise RuntimeError("Keine Versandbestätigung.")
                observer.set_password(password)
                observer.save(update_fields=["password"])
                job.status = "sent"
                job.save(update_fields=["status", "updated_at"])
        except Exception:
            # SMTP errors can occur after acceptance. Never silently send another password.
            job.status = "uncertain" if smtp_started else "failed"
            job.error = (
                "Zustellung manuell prüfen und bei Bedarf einen neuen Auftrag anlegen."
                if smtp_started
                else "Empfänger oder Textvorlage prüfen."
            )
            job.save(update_fields=["status", "error", "updated_at"])
