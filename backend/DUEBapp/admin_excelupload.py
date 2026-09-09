import logging

from django import forms
from django.contrib import admin, messages
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from .models import ExcelUpload
from .services.excel import import_profiles, read_profiles

logger = logging.getLogger(__name__)


class ExcelUploadForm(forms.ModelForm):
    class Meta:
        model = ExcelUpload
        fields = ['file']

    def clean(self):
        data = super().clean()
        if data.get('file'):
            data['_profile_rows'] = read_profiles(data['file'])
        return data


@admin.register(ExcelUpload)
class ExcelUploadAdmin(admin.ModelAdmin):
    form = ExcelUploadForm
    list_display = ["_id", "_file", "_uploaded_at", "_file_size", "_status"]
    readonly_fields = ["uploaded_at"]
    change_list_template = "admin/change_list.html"

    def _id(self, obj):
        """Gibt die ID des ExcelUpload-Objekts zurück (für list_display)"""
        return obj.id

    _id.short_description = "ID"

    def _file(self, obj):
        """Gibt den Dateinamen des Uploads zurück (für list_display)"""
        return obj.file.name.split("/")[-1] if obj.file else "Keine Datei"

    _file.short_description = "Datei"

    def _uploaded_at(self, obj):
        """Gibt den Zeitpunkt des Uploads zurück (für list_display)"""
        return obj.uploaded_at.strftime("%d.%m.%Y %H:%M")

    _uploaded_at.short_description = "Hochgeladen am"

    def _file_size(self, obj):
        """Gibt die Dateigröße zurück"""
        try:
            if obj.file:
                size = obj.file.size
                if size < 1024:
                    return f"{size} B"
                elif size < 1024 * 1024:
                    return f"{size / 1024:.1f} KB"
                else:
                    return f"{size / (1024 * 1024):.1f} MB"
            return "Unbekannt"
        except (OSError, ValueError):
            return "Fehler"

    _file_size.short_description = "Dateigröße"

    def _status(self, obj):
        """Zeigt den Status der Datei an"""
        try:
            if obj.file and obj.file.name:
                return format_html('<span>{}</span>', 'Verfügbar')
            else:
                return format_html('<span>{}</span>', 'Nicht verfügbar')
        except (OSError, ValueError):
            return format_html('<span>{}</span>', 'Unbekannt')

    _status.short_description = "Status"

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}

        column_mapping = [
            ("A", "Button-Nr. (wird nicht importiert)"),
            ("B", "Lfd. Nr. (wird nicht importiert)"),
            ("C", "Profilnr → profile_number"),
            ("D", "PCZ IVENA → pcz_ivena"),
            ("E", "Kategorie → category"),
            ("F", "Erwartete med. Handlung → expected_med_action"),
            ("G", "Diagnose → diagnosis"),
            ("H", "Blickdiagnose → visual_diagnosis"),
            ("I", "Befund → findings"),
            ("J", "Symptome → symptoms"),
            ("K", "Darstellerhinweise → actor_hints"),
            ("L", "Erforderliche Fachrichtung → required_specialty"),
            ("M", "GCS von 15 → gcs"),
            ("N", "SpO2 in % → spo2"),
            ("O", "Rekap in Sec. → rekap"),
            ("P", "AF/min → resp_rate"),
            ("Q", "sys. RR in mmHg → sys_rr"),
            ("R", "EKG Monitoring → ekg_monitor"),
            ("S", "Rö-Thorax → ro_thorax"),
            ("T", "Fast-Sono → fast_sono"),
            ("U", "(E-FAST) → e_fast"),
            ("V", "Radiologiebefunde → radiology_finds"),
            ("W", "Hb Wert mg/dl → hb_value"),
            ("X", "Blutkonserven [Stk] → blood_units"),
            ("Y", "Roter Behandlungsbereich [J/N] → red_treatment_area"),
            ("Z", "Beatmungsplatz [J/N] → ventilation_place"),
            ("AA", "ITS-Platz [J/N] → icu_place"),
            ("AB", "Not-OP [J/N] → emergency_op"),
            ("AC", "OP-Siebe Spezial → op_sieve_special"),
            ("AD", "OP-Siebe Grundsiebe → op_sieve_basic"),
            ("AE", "Personalressource Schockraum → personal_resources"),
            ("AF", "AnästhesieTeam → anesthesia_team"),
            ("AG", "Personalressource Radiologie → radiology_resources"),
            ("AH", "Personalressource OP-Achi → op_achi_res"),
            ("AI", "Personalressource OP-Uchi → op_uchi_res"),
            ("AJ", "Personalressource OP-Nchi → op_nchi_res"),
            ("AK", "Medikamente → medications"),
            ("AL", "Vorversorgung RD → pre_treatment_rd"),
            ("AM", "Hinweis 1 für HiO → spare_col1"),
            ("AN", "Hinweis 2 für HiO → spare_col2"),
            ("AO-AT", "Übergabe RD (wird übersprungen)"),
            ("AU", "Szenario → scenario_field"),
            ("AV", "Bemerkung → comment"),
            ("AW", "Name → lastname"),
            ("AX", "Vorname → firstname"),
            ("AY", "Geburtsdatum → birthdate"),
        ]

        mapping_html = """
        <div style="margin: 20px 0; padding: 20px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 5px;">
            <h3 style="color: #495057; margin-top: 0;">📋 Excel-Spalten-Zuordnung</h3>
            <p style="color: #6c757d; margin-bottom: 15px;">
                <strong>Wichtig:</strong> Die Excel-Datei muss exakt diese Spaltenreihenfolge einhalten,
                damit die Daten korrekt importiert werden. Die erste Zeile sollte die Überschriften enthalten.
            </p>
            <div style="max-height: 400px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 3px;">
                <table style="width: 100%; border-collapse: collapse; background: white;">
                    <thead style="background: #e9ecef; position: sticky; top: 0;">
                        <tr>
                            <th style="padding: 8px 12px; border-bottom: 2px solid #dee2e6; text-align: left; font-weight: 600;">Excel-Spalte</th>
                            <th style="padding: 8px 12px; border-bottom: 2px solid #dee2e6; text-align: left; font-weight: 600;">Erwarteter Inhalt → Datenbankfeld</th>
                        </tr>
                    </thead>
                    <tbody>
        """

        for col, desc in column_mapping:
            if "wird nicht importiert" in desc or "wird übersprungen" in desc:
                color = "#dc3545"  # Rot für nicht importierte Spalten
            elif "→" in desc:
                color = "#28a745"  # Grün für importierte Spalten
            else:
                color = "#6c757d"  # Grau für Kommentare

            mapping_html += f"""
                        <tr>
                            <td style="padding: 6px 12px; border-bottom: 1px solid #dee2e6; font-weight: 500; color: {color};">{col}</td>
                            <td style="padding: 6px 12px; border-bottom: 1px solid #dee2e6; color: {color};">{desc}</td>
                        </tr>
            """

        mapping_html += """
                    </tbody>
                </table>
            </div>
            <div style="margin-top: 15px; padding: 10px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 3px;">
                <strong style="color: #856404;">⚠️ Hinweise:</strong>
                <ul style="margin: 5px 0; color: #856404;">
                    <li>Spalten AO bis AT (Übergabe RD) werden automatisch übersprungen</li>
                    <li>Leere Zellen werden als leere Strings gespeichert</li>
                    <li>Die Profilnummer (Spalte C) muss eindeutig sein oder wird überschrieben</li>
                    <li>Die Verarbeitung beginnt ab Zeile 2 (Zeile 1 = Header)</li>
                </ul>
            </div>
        </div>
        """

        extra_context["mapping_info"] = format_html('{}', mark_safe(mapping_html))
        return super().changelist_view(request, extra_context=extra_context)

    def save_model(self, request, obj, form, change):
        rows = form.cleaned_data['_profile_rows']
        super().save_model(request, obj, form, change)
        count = import_profiles(rows)
        messages.success(request, f'{count} Patientenprofile importiert.')
