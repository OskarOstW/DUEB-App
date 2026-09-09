import logging

from django.contrib import admin

from ..models import Contact, HomeScreenImage, Organization, VictimProfile

logger = logging.getLogger(__name__)


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ["first_name", "last_name", "phone_number", "email"]
    search_fields = ["first_name", "last_name", "email"]


@admin.register(HomeScreenImage)
class HomeScreenImageAdmin(admin.ModelAdmin):
    list_display = ["id", "description", "requires_patient_profile_permission"]


@admin.register(VictimProfile)
class VictimProfileAdmin(admin.ModelAdmin):
    list_display = [
        "_profile_number",
        "_category",
        "_diagnosis",
        "_lastname",
        "_firstname",
        "_spare_col1_short",
        "_spare_col2_short",
    ]
    search_fields = [
        "profile_number",
        "category",
        "diagnosis",
        "lastname",
        "firstname",
        "spare_col1",
        "spare_col2",
    ]
    list_filter = ["category"]

    fieldsets = (
        (
            "Grundinformationen",
            {
                "fields": (
                    "profile_number",
                    "category",
                    "pcz_ivena",
                    "expected_med_action",
                )
            },
        ),
        (
            "Diagnose & Befunde",
            {
                "fields": (
                    "diagnosis",
                    "visual_diagnosis",
                    "findings",
                    "symptoms",
                    "actor_hints",
                    "required_specialty",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Vitalparameter",
            {
                "fields": ("gcs", "spo2", "rekap", "resp_rate", "sys_rr"),
                "classes": ("collapse",),
                "description": "Wichtige Vitalwerte für die medizinische Beurteilung",
            },
        ),
        (
            "Diagnostik",
            {
                "fields": (
                    "ekg_monitor",
                    "ro_thorax",
                    "fast_sono",
                    "e_fast",
                    "radiology_finds",
                    "hb_value",
                    "blood_units",
                ),
                "classes": ("collapse",),
                "description": "Diagnostische Verfahren und Laborwerte",
            },
        ),
        (
            "Behandlungsplätze",
            {
                "fields": (
                    "red_treatment_area",
                    "ventilation_place",
                    "icu_place",
                    "emergency_op",
                ),
                "classes": ("collapse",),
                "description": "Anforderungen an spezielle Behandlungsplätze",
            },
        ),
        (
            "OP & Ressourcen",
            {
                "fields": (
                    "op_sieve_special",
                    "op_sieve_basic",
                    "personal_resources",
                    "anesthesia_team",
                    "radiology_resources",
                    "op_achi_res",
                    "op_uchi_res",
                    "op_nchi_res",
                ),
                "classes": ("collapse",),
                "description": "OP-Siebe und Personalressourcen",
            },
        ),
        (
            "Medikation & Vorbehandlung",
            {
                "fields": ("medications", "pre_treatment_rd"),
                "classes": ("collapse",),
                "description": "Medikamentöse Therapie und Vorbehandlung durch den Rettungsdienst",
            },
        ),
        (
            "HiO-Hinweise",
            {
                "fields": ("spare_col1", "spare_col2"),
                "classes": ("collapse",),
                "description": "Spezielle Hinweise für Hilfeleistende Organisationen (HiO) - Excel-Spalten AM & AN",
            },
        ),
        (
            "Weitere Informationen",
            {
                "fields": (
                    "scenario_field",
                    "comment",
                    "lastname",
                    "firstname",
                    "birthdate",
                ),
                "classes": ("collapse",),
                "description": "Zusätzliche Informationen und Patientendaten",
            },
        ),
    )

    def _profile_number(self, obj):
        return obj.profile_number

    _profile_number.short_description = "Profilnr"

    def _category(self, obj):
        return obj.category

    _category.short_description = "Kategorie"

    def _diagnosis(self, obj):
        return (
            (obj.diagnosis[:50] + "...")
            if obj.diagnosis and len(obj.diagnosis) > 50
            else (obj.diagnosis or "-")
        )

    _diagnosis.short_description = "Diagnose"

    def _lastname(self, obj):
        return obj.lastname or "-"

    _lastname.short_description = "Name"

    def _firstname(self, obj):
        return obj.firstname or "-"

    _firstname.short_description = "Vorname"

    def _spare_col1_short(self, obj):
        if obj.spare_col1:
            return (obj.spare_col1[:30] + "...") if len(obj.spare_col1) > 30 else obj.spare_col1
        return "-"

    _spare_col1_short.short_description = "HiO-Hinweis 1"

    def _spare_col2_short(self, obj):
        if obj.spare_col2:
            return (obj.spare_col2[:30] + "...") if len(obj.spare_col2) > 30 else obj.spare_col2
        return "-"

    _spare_col2_short.short_description = "HiO-Hinweis 2"


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ["name", "short_code"]
    search_fields = ["name", "short_code"]
