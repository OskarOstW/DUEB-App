import secrets

from django.db import migrations, models

import DUEBapp.models


def populate_tokens(apps, schema_editor):
    """Vergibt jedem bestehenden Beobachterkonto ein eindeutiges API-Token."""
    ObserverAccount = apps.get_model("DUEBapp", "ObserverAccount")
    used = set()
    for account in ObserverAccount.objects.all():
        token = secrets.token_hex(20)
        while token in used:
            token = secrets.token_hex(20)
        used.add(token)
        account.api_token = token
        account.save(update_fields=["api_token"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("DUEBapp", "0059_alter_victimprofileresponse_unique_together"),
    ]

    operations = [
        # 1) Feld zunächst ohne unique anlegen (Bestandszeilen bekommen leeren Wert).
        migrations.AddField(
            model_name="observeraccount",
            name="api_token",
            field=models.CharField(blank=True, default="", max_length=64, verbose_name="API-Token"),
        ),
        # 2) Bestehende Konten mit eindeutigen Tokens befüllen.
        migrations.RunPython(populate_tokens, noop_reverse),
        # 3) Eindeutigkeit + Callable-Default aktivieren.
        migrations.AlterField(
            model_name="observeraccount",
            name="api_token",
            field=models.CharField(
                blank=True,
                default=DUEBapp.models.generate_observer_token,
                max_length=64,
                unique=True,
                verbose_name="API-Token",
            ),
        ),
    ]
