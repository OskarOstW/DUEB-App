import logging
from collections import defaultdict

from django.contrib import admin, messages
from django.core.exceptions import PermissionDenied, ValidationError
from django.http import Http404, HttpResponseNotAllowed, HttpResponseRedirect
from django.urls import path

from ..models import HomeScreenImage, TestScenario, TestScenarioVictim, VictimProfile
from ..pillow_utils import generate_overview_image

logger = logging.getLogger(__name__)


class TestScenarioVictimInline(admin.TabularInline):
    """Inline-Verwaltung für Opfer innerhalb eines Testszenarios"""

    model = TestScenarioVictim
    extra = 1
    fields = ("sequential_number", "victim_profile", "organization", "button_number")
    readonly_fields = ("button_number",)
    ordering = ("sequential_number",)

    def get_formset(self, request, obj=None, **kwargs):
        """Überschreibt Formset mit Validierung für Organizations und sequential_number"""
        formset = super().get_formset(request, obj, **kwargs)

        class ValidatedForm(formset.form):
            def clean(self):
                cleaned_data = super().clean()

                if cleaned_data.get("victim_profile") and not cleaned_data.get("organization"):
                    raise ValidationError("Eine Organisation muss ausgewählt werden.")

                seq_num = cleaned_data.get("sequential_number")
                org = cleaned_data.get("organization")

                if seq_num is not None and org:
                    if seq_num < 1:
                        raise ValidationError("Die fortlaufende Nummer muss größer als 0 sein.")

                    if seq_num > 99:
                        raise ValidationError(
                            "Die fortlaufende Nummer sollte nicht größer als 99 sein (zweistellig)."
                        )

                return cleaned_data

        formset.form = ValidatedForm
        widget = formset.form.base_fields["victim_profile"].widget
        widget.can_add_related = False
        widget.can_delete_related = False
        return formset

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Sortiert Opferprofile nach Kategorie und Profilnummer für die Auswahlbox"""
        if db_field.name == "victim_profile":
            kwargs["queryset"] = VictimProfile.objects.all().order_by("category", "profile_number")
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(TestScenario)
class TestScenarioAdmin(admin.ModelAdmin):
    list_display = ["_name", "_date", "get_total_profiles", "get_category_summary"]
    search_fields = ["name", "description"]
    fields = ["name", "date", "description"]
    inlines = [TestScenarioVictimInline]
    change_form_template = "admin/testscenario_change_form.html"

    def _name(self, obj):
        return obj.name

    _name.short_description = "Name"

    def _date(self, obj):
        return obj.date.strftime("%d.%m.%Y") if obj.date else "-"

    _date.short_description = "Datum der Krankenhausübung"

    def get_total_profiles(self, obj):
        """Gibt die Gesamtzahl der zugewiesenen Profile zurück"""
        return obj.assignments.count()

    get_total_profiles.short_description = "Anzahl Profile"

    def get_category_summary(self, obj):
        """Erzeugt eine Zusammenfassung der Profilkategorien"""
        stats = self.get_profile_stats(obj)
        return ", ".join([f"{cat}: {count}" for cat, count in stats.items()])

    get_category_summary.short_description = "Kategorien"

    def get_profile_stats(self, obj):
        """Berechnet Statistiken über die Verteilung der Profile nach Kategorien"""
        stats = defaultdict(int)
        for assignment in obj.assignments.all():
            category = assignment.victim_profile.category or "Ohne Kategorie"
            stats[category] += 1
        return dict(stats)

    def get_urls(self):
        """Fügt benutzerdefinierte URLs für die Übersichtserzeugung hinzu"""
        urls = super().get_urls()
        custom_urls = [
            path(
                "<int:scenario_id>/generate_overview/",
                self.admin_site.admin_view(self.generate_overview_view),
                name="scenario-generate-overview",
            ),
        ]
        return custom_urls + urls

    def generate_overview_view(self, request, scenario_id):
        """Erzeugt eine Bildübersicht für das Szenario als PNG-Datei"""
        if request.method != "POST":
            return HttpResponseNotAllowed(["POST"])
        scenario = self.get_object(request, scenario_id)
        if scenario is None:
            raise Http404
        if not self.has_change_permission(request, scenario) or not request.user.has_perm(
            "DUEBapp.add_homescreenimage"
        ):
            raise PermissionDenied
        try:
            entries_for_image = [
                {
                    "button_number": asn.button_number,
                    "profile_number": asn.victim_profile.profile_number or "",
                    "category": (asn.victim_profile.category or "").strip(),
                    "diagnosis": asn.victim_profile.diagnosis or "",
                    "visual": asn.victim_profile.visual_diagnosis or "",
                    "pcz": asn.victim_profile.pcz_ivena or "",
                }
                for asn in scenario.assignments.select_related("victim_profile").all()
            ]

            rel_path = generate_overview_image(
                entries_for_image,
                scenario_name=scenario.name,
                date_str=scenario.date or "nicht festgelegt",
            )

            HomeScreenImage.objects.create(
                image=rel_path,
                requires_patient_profile_permission=True,
                description=f"Übersicht für Szenario {scenario.name}"
                + (f" vom {scenario.date.strftime('%d.%m.%Y')}" if scenario.date else ""),
            )
            messages.success(request, "Verletztenübersicht wurde erstellt.")
        except Exception:
            logger.exception("Verletztenübersicht konnte nicht erstellt werden.")
            messages.error(
                request,
                "Die Verletztenübersicht konnte nicht erstellt werden. Details stehen im Serverlog.",
            )
        return HttpResponseRedirect("../change/")

    def has_add_permission(self, request):
        """Erlaubt nur ein Testszenario gleichzeitig"""
        if TestScenario.objects.exists():
            return False
        return super().has_add_permission(request)

    def add_view(self, request, form_url="", extra_context=None):
        """Zeigt eine Warnung, wenn bereits ein Testszenario existiert"""
        extra_context = extra_context or {}
        if TestScenario.objects.exists():
            messages.warning(
                request,
                "Es existiert bereits ein Testszenario. "
                "Löschen Sie dieses zuerst, bevor Sie ein neues anlegen.",
            )
        return super().add_view(request, form_url, extra_context=extra_context)

    def change_view(self, request, object_id, form_url="", extra_context=None):
        """Erweitert die Änderungsansicht mit statistischen Daten"""
        extra_context = extra_context or {}
        scenario = self.get_object(request, object_id)
        if scenario:
            total_count = scenario.assignments.count()
            category_stats = self.get_profile_stats(scenario)
            extra_context.update(
                {
                    "show_statistics": True,
                    "total_profiles": total_count,
                    "category_statistics": [
                        {
                            "category": cat,
                            "count": count,
                            "percentage": (count / total_count * 100) if total_count else 0,
                        }
                        for cat, count in category_stats.items()
                    ],
                    "has_profiles": total_count > 0,
                }
            )
        return super().change_view(request, object_id, form_url, extra_context=extra_context)

    def save_formset(self, request, form, formset, change):
        """Verarbeitet das Speichern von Inline-Formularen und generiert Button-Nummern"""
        instances = formset.save(commit=False)
        for deleted in formset.deleted_objects:
            deleted.delete()
        for instance in instances:
            instance.save()
        formset.save_m2m()
