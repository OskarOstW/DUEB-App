# Einmalige Datenmigration: vorhandene Klartext-Passwörter der Beobachterkonten
# werden gehasht (PBKDF2-SHA256). Ab dieser Version speichert ObserverAccount.save()
# Passwörter ausschließlich gehasht.

from django.contrib.auth.hashers import make_password
from django.db import migrations

HASH_PREFIXES = ('pbkdf2_sha256$', 'bcrypt$', 'argon2')


def hash_plaintext_passwords(apps, schema_editor):
    ObserverAccount = apps.get_model('DUEBapp', 'ObserverAccount')
    for account in ObserverAccount.objects.all():
        password = account.password or ''
        if password and not password.startswith(HASH_PREFIXES):
            account.password = make_password(password)
            account.save(update_fields=['password'])


class Migration(migrations.Migration):

    dependencies = [
        ('DUEBapp', '0060_observeraccount_api_token'),
    ]

    operations = [
        # Rückwärts: noop — gehashte Passwörter lassen sich nicht zurückrechnen.
        migrations.RunPython(hash_plaintext_passwords, migrations.RunPython.noop),
    ]
