from django.db import migrations
from django.db.models import Count


def assign_unambiguous_owners(apps, schema_editor):
    Account = apps.get_model('DUEBapp', 'ObserverAccount')
    unique = Account.objects.values('email').annotate(total=Count('id')).filter(total=1).exclude(email='')
    for item in unique.iterator():
        account = Account.objects.get(email=item['email'])
        for model in ['FormResponse', 'VictimProfileResponse']:
            apps.get_model('DUEBapp', model).objects.filter(observer_email=account.email, observer__isnull=True).update(observer=account)


class Migration(migrations.Migration):
    dependencies = [('DUEBapp', '0062_secure_observer_ownership')]
    operations = [migrations.RunPython(assign_unambiguous_owners, migrations.RunPython.noop)]
