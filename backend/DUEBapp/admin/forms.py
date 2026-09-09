import json
import logging

import nested_admin
from django.contrib import admin
from django.core.exceptions import ValidationError
from django.utils.html import format_html_join

from ..admin_display import display_value
from ..models import Form, FormResponse, Option, Question
from .readonly import ReadOnlyResponsesMixin

logger = logging.getLogger(__name__)


class OptionInlineFormSet(nested_admin.NestedInlineFormSet):
    def clean(self):
        super().clean()
        if any(self.errors):
            return
        active = [
            form for form in self.forms if form.cleaned_data and not form.cleaned_data.get("DELETE")
        ]
        if self.instance.option_type == "scale" and active:
            raise ValidationError(
                "Skala-Fragen dürfen keine Antwortoptionen enthalten. Bitte die Optionen entfernen."
            )
        if (
            self.instance.form_id
            and FormResponse.objects.filter(form_id=self.instance.form_id).exists()
        ):
            if {form.instance.pk for form in active} != set(
                self.instance.options.values_list("pk", flat=True)
            ):
                raise ValidationError(
                    "Antwortoptionen eines beantworteten Formulars dürfen nicht entfernt oder ergänzt werden."
                )


class QuestionInlineFormSet(nested_admin.NestedInlineFormSet):
    def clean(self):
        super().clean()
        if any(self.errors) or not self.instance.pk or not self.instance.responses.exists():
            return
        active = [
            form for form in self.forms if form.cleaned_data and not form.cleaned_data.get("DELETE")
        ]
        if {form.instance.pk for form in active} != set(
            self.instance.questions.values_list("pk", flat=True)
        ):
            raise ValidationError(
                "Ein beantwortetes Formular darf strukturell nicht verändert werden. Bitte ein neues Formular erstellen."
            )
        if any("option_type" in form.changed_data for form in active):
            raise ValidationError(
                "Der Antworttyp einer beantworteten Frage darf nicht geändert werden."
            )


class OptionInline(nested_admin.NestedTabularInline):
    """Inline-Verwaltung für Antwortoptionen innerhalb einer Frage"""

    model = Option
    formset = OptionInlineFormSet
    extra = 1


class QuestionInline(nested_admin.NestedStackedInline):
    """Inline-Verwaltung für Fragen innerhalb eines Formulars"""

    model = Question
    formset = QuestionInlineFormSet
    extra = 0
    inlines = [OptionInline]


@admin.register(Form)
class FormAdmin(nested_admin.NestedModelAdmin):
    inlines = [QuestionInline]
    list_display = ["name", "note"]
    search_fields = ["name"]

    def has_delete_permission(self, request, obj=None):
        return super().has_delete_permission(request, obj) and not (
            FormResponse.objects.filter(form=obj).exists() if obj else FormResponse.objects.exists()
        )


@admin.register(FormResponse)
class FormResponseAdmin(ReadOnlyResponsesMixin, admin.ModelAdmin):
    list_display = [
        "_form",
        "_test_scenario",
        "_observer_name",
        "_observer_email",
        "_submitted_at",
        "_has_responses",
    ]
    readonly_fields = [
        "submitted_at",
        "formatted_complete_responses",
        "get_image_download_links",
    ]
    search_fields = ["observer_name", "observer_email", "form__name"]
    list_filter = ["submitted_at", "form", "test_scenario"]

    fields = (
        "form",
        "test_scenario",
        "scenario_uuid",
        "observer_name",
        "observer_email",
        "submitted_at",
        "template_version",
        "formatted_complete_responses",
        "get_image_download_links",
    )
    list_select_related = ("form", "test_scenario")

    def _normalize_json_value(self, raw_value, expected_type):
        """Normalisiert JSON-Felder robust für die Admin-Anzeige."""
        if raw_value in (None, ""):
            return expected_type()

        parsed_value = raw_value
        if isinstance(raw_value, str):
            try:
                parsed_value = json.loads(raw_value)
            except (json.JSONDecodeError, TypeError, ValueError):
                return expected_type()

        if isinstance(parsed_value, expected_type):
            return parsed_value
        return expected_type()

    def _normalize_json_map(self, raw_value):
        return self._normalize_json_value(raw_value, dict)

    def get_image_download_links(self, obj):
        return format_html_join(
            "",
            '<p><a href="{}">Bild {}</a></p>',
            ((image.image.url, image.position) for image in obj.images.all()),
        )

    get_image_download_links.short_description = "Bild-Downloads"

    def _form(self, obj):
        return obj.form.name if obj.form else "-"

    _form.short_description = "Formular"

    def _test_scenario(self, obj):
        return obj.test_scenario.name if obj.test_scenario else "Kein Szenario"

    _test_scenario.short_description = "Testszenario"

    def _observer_name(self, obj):
        return obj.observer_name

    _observer_name.short_description = "Beobachter"

    def _observer_email(self, obj):
        return obj.observer_email

    _observer_email.short_description = "E-Mail"

    def _submitted_at(self, obj):
        return obj.submitted_at.strftime("%d.%m.%Y %H:%M")

    _submitted_at.short_description = "Eingereicht am"

    def _has_responses(self, obj):
        responses = self._normalize_json_map(obj.responses)
        if responses:
            count = len([k for k, v in responses.items() if v])
            return f"✓ {count} Antworten"
        return "Keine Antworten"

    _has_responses.short_description = "Status"

    def formatted_complete_responses(self, obj):
        return display_value(
            {
                "Antworten": obj.responses,
                "Auswahl": obj.picker_selections,
                "Skalen": obj.scale_values,
                "Zeitstempel": obj.timestamps,
                "Notiz": obj.note,
                "Notizzeiten": obj.note_timestamps,
            }
        )

    formatted_complete_responses.short_description = (
        "Antworten, Auswahl, Skalen, Zeitstempel und Notizen"
    )
