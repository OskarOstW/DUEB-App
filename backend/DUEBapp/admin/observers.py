import logging

from django import forms
from django.contrib import admin
from django.contrib.auth.password_validation import validate_password
from django.utils.crypto import get_random_string

from ..admin_display import display_value
from ..models import ObserverAccount, VictimProfileResponse
from .readonly import ReadOnlyResponsesMixin

logger = logging.getLogger(__name__)


class ObserverAccountAdminForm(forms.ModelForm):
    """Formular ohne das Hash-Feld; Passwörter werden nur über 'Neues Passwort' gesetzt."""

    new_password = forms.CharField(
        label="Neues Passwort",
        required=False,
        widget=forms.PasswordInput(render_value=False),
        help_text=(
            "Leer lassen, um das bestehende Passwort zu behalten. "
            "Beim E-Mail-Versand der Zugangsdaten wird ohnehin ein neues "
            "Passwort erzeugt und verschickt."
        ),
    )

    def clean_new_password(self):
        password = self.cleaned_data.get("new_password", "")
        if password:
            validate_password(password)
        return password

    class Meta:
        model = ObserverAccount
        exclude = ["password", "api_token", "token_created_at", "data_revision"]


@admin.register(ObserverAccount)
class ObserverAccountAdmin(admin.ModelAdmin):
    form = ObserverAccountAdminForm
    list_display = [
        "username",
        "first_name",
        "last_name",
        "email",
        "show_patient_profiles",
    ]
    filter_horizontal = ["allowed_forms"]

    def save_model(self, request, obj, form, change):
        new_password = form.cleaned_data.get("new_password")
        if new_password:
            obj.set_password(new_password)
        elif not obj.password:
            obj.set_password(get_random_string(12))
        super().save_model(request, obj, form, change)


@admin.register(VictimProfileResponse)
class VictimProfileResponseAdmin(ReadOnlyResponsesMixin, admin.ModelAdmin):
    list_display = [
        "id",
        "button_number",
        "kh_intern",
        "_test_scenario",
        "observer_name",
        "observer_email",
        "soll_sichtung",
        "ist_sichtung",
        "erstellt_am",
        "aktualisiert_am",
    ]
    search_fields = [
        "button_number",
        "kh_intern",
        "observer_name",
        "observer_email",
        "soll_sichtung",
        "ist_sichtung",
    ]
    list_filter = [
        "erstellt_am",
        "ist_sichtung",
        "soll_sichtung",
        "observer_name",
        "test_scenario",
    ]
    readonly_fields = [
        "erstellt_am",
        "aktualisiert_am",
        "formatted_diagnostic_loaded",
        "formatted_vitalwerte",
        "formatted_sichtung_data",
        "formatted_diagnostik_data",
        "formatted_therapie_data",
        "formatted_op_team",
        "formatted_verlauf",
    ]

    fieldsets = (
        (
            "Grundinformationen",
            {
                "fields": (
                    "button_number",
                    "kh_intern",
                    "test_scenario",
                    "observer_name",
                    "observer_email",
                    "soll_sichtung",
                    "ist_sichtung",
                )
            },
        ),
        (
            "Bearbeitbare JSON-Daten",
            {
                "fields": (
                    "diagnostic_loaded",
                    "vitalwerte",
                    "sichtung_data",
                    "diagnostik_data",
                    "therapie_data",
                    "op_team",
                    "verlauf",
                ),
                "classes": ("collapse",),
                "description": "Diese JSON-Felder können direkt bearbeitet werden. Gültiges JSON-Format verwenden.",
            },
        ),
        (
            "Formatierte Übersichten (nur lesend)",
            {
                "fields": (
                    "formatted_diagnostic_loaded",
                    "formatted_vitalwerte",
                    "formatted_sichtung_data",
                    "formatted_diagnostik_data",
                    "formatted_therapie_data",
                    "formatted_op_team",
                    "formatted_verlauf",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Zeitstempel",
            {"fields": ("erstellt_am", "aktualisiert_am"), "classes": ("collapse",)},
        ),
    )

    def formfield_for_dbfield(self, db_field, request, **kwargs):
        """Größere Monospace-Textfelder für die JSON-Felder."""
        formfield = super().formfield_for_dbfield(db_field, request, **kwargs)

        if db_field.name in [
            "diagnostic_loaded",
            "vitalwerte",
            "sichtung_data",
            "diagnostik_data",
            "therapie_data",
            "op_team",
            "verlauf",
        ]:
            formfield.widget = forms.Textarea(
                attrs={
                    "rows": 15,
                    "cols": 100,
                    "style": "font-family: monospace; font-size: 12px;",
                }
            )

        return formfield

    def _test_scenario(self, obj):
        return obj.test_scenario.name if obj.test_scenario else "Kein Szenario"

    _test_scenario.short_description = "Testszenario"

    def formatted_diagnostic_loaded(self, obj):
        return display_value(obj.diagnostic_loaded)

    formatted_diagnostic_loaded.short_description = "Diagnostische Angaben (SOLL) - Formatiert"

    def formatted_vitalwerte(self, obj):
        return display_value(obj.vitalwerte)

    formatted_vitalwerte.short_description = "Vitalparameter (SOLL) - Formatiert"

    def formatted_sichtung_data(self, obj):
        return display_value(obj.sichtung_data)

    formatted_sichtung_data.short_description = "Sichtungsdaten (IST) - Formatiert"

    def formatted_diagnostik_data(self, obj):
        return display_value(obj.diagnostik_data)

    formatted_diagnostik_data.short_description = "Diagnostikdaten (IST) - Formatiert"

    def formatted_therapie_data(self, obj):
        return display_value(obj.therapie_data)

    formatted_therapie_data.short_description = "Therapiedaten (IST) - Formatiert"

    def formatted_op_team(self, obj):
        return display_value(obj.op_team)

    formatted_op_team.short_description = "OP-Team-Einträge - Formatiert"

    def formatted_verlauf(self, obj):
        return display_value(obj.verlauf)

    formatted_verlauf.short_description = "Verlaufseinträge - Formatiert"
