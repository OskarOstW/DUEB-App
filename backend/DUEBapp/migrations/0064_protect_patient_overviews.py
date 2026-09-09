from django.db import migrations, models


def protect_existing_overviews(apps, schema_editor):
    images = apps.get_model("DUEBapp", "HomeScreenImage")
    images.objects.using(schema_editor.connection.alias).filter(
        models.Q(image__startswith="homescreen/uebersicht_")
        | models.Q(description__startswith="Übersicht für Szenario ")
    ).update(requires_patient_profile_permission=True)


class Migration(migrations.Migration):
    dependencies = [("DUEBapp", "0063_backfill_observer_ownership")]
    operations = [
        migrations.AddField(
            model_name="homescreenimage",
            name="requires_patient_profile_permission",
            field=models.BooleanField(
                "Nur mit Patientenprofil-Berechtigung sichtbar", default=False
            ),
        ),
        migrations.RunPython(protect_existing_overviews, migrations.RunPython.noop),
    ]
