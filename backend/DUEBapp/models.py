import logging
import secrets
import uuid

from django.contrib.auth.hashers import check_password, make_password
from django.core.exceptions import ValidationError
from django.db import models


def generate_observer_token():
    """Erzeugt ein zufälliges API-Token für ein Beobachterkonto."""
    return secrets.token_hex(20)


logger = logging.getLogger(__name__)


class Form(models.Model):
    """Grundmodell für dynamische Formulare"""

    name = models.CharField("Name des Formulars", max_length=100)
    note = models.TextField("Notiz", blank=True, null=True)
    description_form = models.TextField("Formularbeschreibung", blank=True, null=True)
    show_patient_profile_search = models.BooleanField(
        "Patientenprofil-Suche anzeigen", default=False
    )

    class Meta:
        verbose_name = "Formular"
        verbose_name_plural = "Formulare"

    def __str__(self):
        return self.name


class Question(models.Model):
    """Fragen innerhalb eines Formulars mit verschiedenen Antworttypen"""

    form = models.ForeignKey(
        Form,
        related_name="questions",
        on_delete=models.CASCADE,
        verbose_name="Zugehöriges Formular",
    )
    question_text = models.TextField("Fragetext", blank=True, null=True)
    option_type = models.CharField(
        "Antwort-Typ",
        max_length=50,
        choices=(
            ("none", "None"),
            ("checkbox", "Checkbox"),
            ("dropdown", "Dropdown"),
            ("scale", "Skala"),
            ("image", "Bild"),
        ),
    )
    input_field_added = models.BooleanField("Eingabefeld hinzugefügt?", default=False)
    image_upload_desired = models.BooleanField("Bild-Upload möglich?", default=False)
    description_question = models.TextField("Beschreibung der Frage", blank=True, null=True)
    hint = models.TextField("Hinweis", blank=True, null=True)

    class Meta:
        verbose_name = "Frage"
        verbose_name_plural = "Fragen"

    def __str__(self):
        return self.question_text or "Frage (unbenannt)"


class Option(models.Model):
    """Einzelne Antwortoptionen für Fragen mit Checkbox- oder Dropdown-Typ"""

    question = models.ForeignKey(
        Question,
        related_name="options",
        on_delete=models.CASCADE,
        verbose_name="Zugehörige Frage",
    )
    label = models.CharField("Antwort-Label", max_length=255)

    class Meta:
        verbose_name = "Antwort-Option"
        verbose_name_plural = "Antwort-Optionen"

    def save(self, *args, **kwargs):
        """Verhindert die Erstellung von Optionen für Skala-Fragen"""
        if self.question.option_type == "scale":
            raise ValidationError("Optionen mit Labels sind für Skala-Fragen nicht zulässig.")
        super().save(*args, **kwargs)

    def __str__(self):
        return self.label


class FormResponse(models.Model):
    """Speichert alle Antworten zu einem ausgefüllten Formular"""

    scenario_uuid = models.UUIDField(null=True, editable=False)
    template_version = models.CharField(max_length=64, blank=True, editable=False)
    template_snapshot = models.JSONField(default=dict, editable=False)
    observer = models.ForeignKey(
        "ObserverAccount",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="formresponse_records",
    )
    form = models.ForeignKey(
        Form,
        related_name="responses",
        on_delete=models.CASCADE,
        verbose_name="Formular",
    )
    test_scenario = models.ForeignKey(
        "TestScenario",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Testszenario",
        related_name="form_responses",
    )
    observer_name = models.CharField("Beobachter-Name", max_length=255, blank=True)
    observer_email = models.CharField("Beobachter-Email", max_length=255, blank=True)
    responses = models.JSONField("Antworten")
    picker_selections = models.JSONField("Picker-Auswahlen", blank=True, null=True)
    scale_values = models.JSONField("Skalen-Werte", blank=True, null=True)
    timestamps = models.JSONField("Zeitstempel", blank=True, null=True)
    note = models.TextField("Notiz", blank=True, null=True)
    submitted_at = models.DateTimeField("Eingereicht am", auto_now_add=True)
    note_timestamps = models.JSONField("Zeitstempel Notiz", blank=True, null=True)

    class Meta:
        verbose_name = "Formular-Antwort"
        verbose_name_plural = "Formular-Antworten"
        constraints = [
            models.UniqueConstraint(
                fields=["observer", "test_scenario", "form"],
                condition=models.Q(observer__isnull=False, test_scenario__isnull=False),
                name="unique_observer_scenario_form",
            )
        ]

    def __str__(self):
        return f"Response to {self.form.name} by {self.observer_name}"


class Contact(models.Model):
    """Speichert Kontaktdaten für wichtige Ansprechpartner im System"""

    first_name = models.CharField("Vorname", max_length=100)
    last_name = models.CharField("Nachname", max_length=100)
    phone_number = models.CharField("Telefonnummer", max_length=20)
    email = models.EmailField("E-Mail")
    general_info = models.TextField("Allgemeine Infos", blank=True, null=True)

    class Meta:
        verbose_name = "Kontakt"
        verbose_name_plural = "Kontakte"

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class HomeScreenImage(models.Model):
    """Bilder für den Startbildschirm der Anwendung"""

    image = models.ImageField("Bilddatei", upload_to="homescreen/")
    description = models.TextField("Beschreibung", blank=True, null=True)

    requires_patient_profile_permission = models.BooleanField(
        "Nur mit Patientenprofil-Berechtigung sichtbar", default=False
    )

    @classmethod
    def visible_to(cls, user):
        images = cls.objects.all()
        if getattr(user, "is_staff", False):
            return images
        if getattr(user, "is_observer", False):
            if user.account.show_patient_profiles:
                return images
            return images.filter(requires_patient_profile_permission=False)
        return images.none()

    class Meta:
        verbose_name = "Startbild"
        verbose_name_plural = "Startbilder"

    def __str__(self):
        return f"Image {self.id}"


class VictimProfile(models.Model):
    """Umfassendes Profil für simulierte Patienten in der Übung"""

    profile_number = models.CharField("Profilnr", max_length=50, unique=True, blank=True, null=True)
    category = models.CharField("Kategorie", max_length=200, blank=True, null=True)
    pcz_ivena = models.CharField("PCZ IVENA", max_length=200, blank=True, null=True)
    expected_med_action = models.TextField("Erwartete med. Handlung", blank=True, null=True)
    diagnosis = models.TextField("Diagnose", blank=True, null=True)
    visual_diagnosis = models.TextField("Blickdiagnose", blank=True, null=True)
    findings = models.TextField("Befund", blank=True, null=True)
    symptoms = models.TextField("Symptome", blank=True, null=True)
    actor_hints = models.TextField("Darstellerhinweise", blank=True, null=True)
    required_specialty = models.CharField(
        "erforderliche Fachrichtung", max_length=200, blank=True, null=True
    )

    gcs = models.CharField("GCS von 15", max_length=50, blank=True, null=True)
    spo2 = models.CharField("SpO2 in %", max_length=50, blank=True, null=True)
    rekap = models.CharField("Rekap in Sek.", max_length=50, blank=True, null=True)
    resp_rate = models.CharField("AF/min", max_length=50, blank=True, null=True)
    sys_rr = models.CharField("sys. RR in mmHg", max_length=50, blank=True, null=True)

    ekg_monitor = models.CharField("EKG Monitoring", max_length=200, blank=True, null=True)
    ro_thorax = models.CharField("Rö-Thorax", max_length=200, blank=True, null=True)
    fast_sono = models.CharField("FAST-Sono", max_length=200, blank=True, null=True)
    e_fast = models.CharField("(E-FAST)", max_length=200, blank=True, null=True)
    radiology_finds = models.TextField("Radiologiebefunde", blank=True, null=True)
    hb_value = models.CharField("Hb Wert mg/dl", max_length=50, blank=True, null=True)
    blood_units = models.CharField("Blutkonserven [Stk]", max_length=50, blank=True, null=True)

    red_treatment_area = models.CharField(
        "Roter Behandlungsbereich [J/N]", max_length=50, blank=True, null=True
    )
    ventilation_place = models.CharField(
        "Beatmungsplatz [J/N]", max_length=50, blank=True, null=True
    )
    icu_place = models.CharField("ITS-Platz [J/N]", max_length=50, blank=True, null=True)
    emergency_op = models.CharField("Not-OP [J/N]", max_length=50, blank=True, null=True)

    op_sieve_special = models.CharField("OP-Siebe Spezial", max_length=200, blank=True, null=True)
    op_sieve_basic = models.CharField("OP-Siebe Grundsiebe", max_length=200, blank=True, null=True)
    personal_resources = models.TextField(
        "Personalressource Schockraum etc.", blank=True, null=True
    )
    anesthesia_team = models.CharField("AnästhesieTeam", max_length=200, blank=True, null=True)
    radiology_resources = models.CharField(
        "Personalressource Radiologie", max_length=200, blank=True, null=True
    )
    op_achi_res = models.CharField(
        "Personalressource OP-Achi", max_length=200, blank=True, null=True
    )
    op_uchi_res = models.CharField(
        "Personalressource OP-Uchi", max_length=200, blank=True, null=True
    )
    op_nchi_res = models.CharField(
        "Personalressource OP-Nchi", max_length=200, blank=True, null=True
    )

    medications = models.TextField("Medikamente", blank=True, null=True)
    pre_treatment_rd = models.TextField("Vorversorgung RD", blank=True, null=True)

    spare_col1 = models.CharField("Hinweis 1 für HiO", max_length=255, blank=True, null=True)
    spare_col2 = models.CharField("Hinweis 2 für HiO", max_length=255, blank=True, null=True)

    scenario_field = models.TextField("Szenario", blank=True, null=True)
    comment = models.TextField("Bemerkung", blank=True, null=True)
    lastname = models.CharField("Name", max_length=100, blank=True, null=True)
    firstname = models.CharField("Vorname", max_length=100, blank=True, null=True)
    birthdate = models.CharField("Geburtsdatum", max_length=50, blank=True, null=True)

    class Meta:
        verbose_name = "Patientenprofil"
        verbose_name_plural = "Patientenprofile"

    def __str__(self):
        base = f"Profil {self.profile_number or self.pk}"
        if self.category:
            base += f" [{self.category}]"
        return base


class ExcelUpload(models.Model):
    """Speichert hochgeladene Excel-Dateien für den Import von Patientenprofilen"""

    file = models.FileField("Excel-Datei", upload_to="excel_uploads/")
    uploaded_at = models.DateTimeField("Hochgeladen am", auto_now_add=True)

    class Meta:
        verbose_name = "Excel-Upload"
        verbose_name_plural = "Excel-Uploads"

    def __str__(self):
        return f"ExcelUpload #{self.pk} vom {self.uploaded_at.strftime('%Y-%m-%d %H:%M:%S')}"


class Organization(models.Model):
    """Organisationen, die an der Digitale Übungsbeobachtung teilnehmen"""

    name = models.CharField("Name", max_length=100, unique=True)
    short_code = models.CharField("Kürzel", max_length=10, unique=True)

    class Meta:
        verbose_name = "Organisation"
        verbose_name_plural = "Organisationen"

    def __str__(self):
        return f"{self.name} ({self.short_code})"

    def clean(self):
        """Validiert, dass das Kürzel nur aus Buchstaben besteht"""
        if not self.short_code.isalpha():
            raise ValidationError({"short_code": "Das Kürzel darf nur aus Buchstaben bestehen."})


class TestScenario(models.Model):
    """Übungsszenario für die Digitale Übungsbeobachtung"""

    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    singleton = models.PositiveSmallIntegerField(default=1, unique=True, editable=False)
    name = models.CharField("Name", max_length=200)
    date = models.DateField("Datum", blank=True, null=True)
    description = models.TextField("Beschreibung", blank=True, null=True)

    selected_profiles = models.ManyToManyField(
        "VictimProfile",
        through="TestScenarioVictim",
        related_name="scenarios",
        verbose_name="Zugewiesene Profile",
    )

    class Meta:
        verbose_name = "Testszenario"
        verbose_name_plural = "Testszenarien"
        constraints = [
            models.CheckConstraint(condition=models.Q(singleton=1), name="one_active_scenario")
        ]

    def __str__(self):
        return f"{self.name} ({self.date})" if self.date else self.name

    def clean(self):
        if not self.pk and TestScenario.objects.exists():
            raise ValidationError(
                "Es existiert bereits ein Testszenario. Bitte löschen Sie es erst, "
                "bevor Sie ein neues anlegen."
            )
        super().clean()

    def save(self, *args, **kwargs):
        """Erzwingt die Einzelszenario-Regel auch bei direktem save() / Shell / Imports."""
        if not self.pk and TestScenario.objects.exists():
            raise ValidationError(
                "Es existiert bereits ein Testszenario. Bitte löschen Sie es erst, "
                "bevor Sie ein neues anlegen."
            )
        super().save(*args, **kwargs)


class TestScenarioVictim(models.Model):
    """Verknüpfungsmodell für die Zuordnung von Patientenprofilen zu Testszenarien"""

    scenario = models.ForeignKey(
        TestScenario,
        on_delete=models.CASCADE,
        related_name="assignments",
        verbose_name="Szenario",
    )
    victim_profile = models.ForeignKey(
        "VictimProfile", on_delete=models.CASCADE, verbose_name="Patientenprofil"
    )
    organization = models.ForeignKey(
        "Organization",
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        verbose_name="Organisation",
    )

    sequential_number = models.PositiveIntegerField("fortlaufende Nummer")
    button_number = models.CharField("Button-Code", max_length=50)

    class Meta:
        verbose_name = "Zuweisung Profil–Szenario"
        verbose_name_plural = "Zuweisungen Profil–Szenario"
        ordering = ["sequential_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["scenario", "organization", "sequential_number"],
                name="unique_scenario_org_number",
            ),
            models.UniqueConstraint(
                fields=["scenario", "button_number"], name="unique_scenario_button"
            ),
        ]

    def __str__(self):
        return (
            f"{self.scenario.name} | {self.victim_profile.profile_number} => {self.button_number}"
        )

    def clean(self):
        super().clean()

        if self.organization and self.sequential_number:
            existing = TestScenarioVictim.objects.filter(
                scenario=self.scenario,
                organization=self.organization,
                sequential_number=self.sequential_number,
            ).exclude(pk=self.pk)

            if existing.exists():
                raise ValidationError(
                    {
                        "sequential_number": f"Die Nummer {self.sequential_number} ist für die Organisation {self.organization.short_code} bereits vergeben."
                    }
                )

            potential_button_number = f"{self.organization.short_code}{self.sequential_number:02d}"
            existing_button = TestScenarioVictim.objects.filter(
                scenario=self.scenario, button_number=potential_button_number
            ).exclude(pk=self.pk)

            if existing_button.exists():
                raise ValidationError(
                    {
                        "sequential_number": f"Die Button-Nummer {potential_button_number} existiert bereits in diesem Szenario."
                    }
                )

    def save(self, *args, **kwargs):
        if not self.sequential_number and self.organization:
            max_org = (
                TestScenarioVictim.objects.filter(
                    scenario=self.scenario, organization=self.organization
                )
                .exclude(pk=self.pk)
                .aggregate(models.Max("sequential_number"))["sequential_number__max"]
                or 0
            )
            self.sequential_number = max_org + 1

        if self.organization and self.sequential_number:
            self.button_number = f"{self.organization.short_code}{self.sequential_number:02d}"

        if self.pk:
            previous = type(self).objects.get(pk=self.pk)
            changed = any(
                getattr(previous, key) != getattr(self, key)
                for key in ("button_number", "scenario_id", "victim_profile_id", "organization_id")
            )
            if (
                changed
                and VictimProfileResponse.objects.filter(
                    test_scenario_id=previous.scenario_id, button_number=previous.button_number
                ).exists()
            ):
                raise ValidationError(
                    "Eine beantwortete Patientenzuordnung darf nicht geändert werden."
                )
        super().save(*args, **kwargs)


class ObserverAccount(models.Model):
    """Beobachterkonten mit eingeschränktem Zugriff auf bestimmte Formulare"""

    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    data_revision = models.PositiveIntegerField(default=0, editable=False)
    token_created_at = models.DateTimeField(null=True, blank=True, editable=False)
    username = models.CharField("Benutzername", max_length=150, unique=True)
    first_name = models.CharField("Vorname", max_length=150)
    last_name = models.CharField("Nachname", max_length=150)
    email = models.EmailField("E-Mail")
    password = models.CharField("Passwort", max_length=128)
    api_token = models.CharField(
        "API-Token",
        max_length=64,
        unique=True,
        blank=True,
        default=generate_observer_token,
    )
    allowed_forms = models.ManyToManyField(Form, blank=True, verbose_name="Zugängliche Formulare")
    show_patient_profiles = models.BooleanField("Patientenprofile anzeigen", default=False)

    class Meta:
        verbose_name = "Beobachterkonto"
        verbose_name_plural = "Beobachterkonten"

    HASH_PREFIXES = ("pbkdf2_sha256$", "bcrypt$", "argon2")

    def set_password(self, raw_password):
        """Passwort hashen und ablegen (PBKDF2-SHA256, Django-Standard)."""
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        """Eingegebenes Passwort gegen den gespeicherten Hash prüfen."""
        return check_password(raw_password, self.password)

    def save(self, *args, **kwargs):
        if self.password and not self.password.startswith(self.HASH_PREFIXES):
            self.password = make_password(self.password)
        if self.pk:
            previous = type(self).objects.filter(pk=self.pk).values("password").first()
            if previous and previous["password"] != self.password:
                self.api_token = generate_observer_token()
                self.token_created_at = None
                if kwargs.get("update_fields"):
                    kwargs["update_fields"] = set(kwargs["update_fields"]) | {
                        "api_token",
                        "token_created_at",
                    }
        if not self.api_token:
            self.api_token = generate_observer_token()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.username} ({self.first_name} {self.last_name})"


class VictimProfileResponse(models.Model):
    """
    Vom Beobachter erfasster Patientenbegleitbogen zu einem Patienten der Übung:
    Sichtung, Diagnostik, Therapie, OP-Team und Verlauf. Jeder Bogen gehört zu
    genau einem Testszenario.
    """

    scenario_uuid = models.UUIDField(null=True, editable=False)
    template_version = models.CharField(max_length=64, blank=True, editable=False)
    template_snapshot = models.JSONField(default=dict, editable=False)

    observer = models.ForeignKey(
        "ObserverAccount",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="victimprofileresponse_records",
    )
    button_number = models.CharField("Button-Nr", max_length=50)
    kh_intern = models.CharField("KH interne Pat.-Nr", max_length=50, blank=True, null=True)
    soll_sichtung = models.CharField(
        "SOLL-Sichtungskategorie", max_length=100, blank=True, null=True
    )

    test_scenario = models.ForeignKey(
        "TestScenario",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Testszenario",
        related_name="victim_profile_responses",
    )

    diagnostic_loaded = models.JSONField("Diagnostische Angaben (SOLL)", blank=True, null=True)
    vitalwerte = models.JSONField("Vitalparameter (SOLL)", blank=True, null=True)

    ist_sichtung = models.CharField("IST-Sichtungskategorie", max_length=100, blank=True, null=True)
    sichtung_data = models.JSONField("Sichtungspunkt-Daten", blank=True, null=True)
    diagnostik_data = models.JSONField("Diagnostik-Daten", blank=True, null=True)
    therapie_data = models.JSONField("Therapie-Daten", blank=True, null=True)

    op_team = models.JSONField(
        "OP-Team",
        blank=True,
        null=True,
        help_text="Liste der OP-Team-Einträge (max. 10)",
    )
    verlauf = models.JSONField(
        "Verlaufseinträge",
        blank=True,
        null=True,
        help_text="Liste der Verlaufseinträge (max. 10)",
    )

    sichtung_locked = models.BooleanField("Sichtung gesperrt", default=False)
    diagnostik_locked = models.BooleanField("Diagnostik gesperrt", default=False)
    therapie_locked = models.BooleanField("Therapie gesperrt", default=False)

    is_completed = models.BooleanField("Abgeschlossen", default=False)

    observer_name = models.CharField("Beobachter-Name", max_length=255, blank=True, null=True)
    observer_email = models.EmailField("Beobachter-Email", blank=True, null=True)

    erstellt_am = models.DateTimeField("Erstellt am", auto_now_add=True)
    aktualisiert_am = models.DateTimeField("Aktualisiert am", auto_now=True)

    class Meta:
        verbose_name = "Antwort Patientenbegleitbogen"
        verbose_name_plural = "Antworten Patientenbegleitbogen"
        ordering = ["-erstellt_am"]
        constraints = [
            models.UniqueConstraint(
                fields=["observer", "test_scenario", "button_number"],
                condition=models.Q(observer__isnull=False, test_scenario__isnull=False),
                name="unique_observer_scenario_patient",
            )
        ]

    def __str__(self):
        return f"VictimProfileResponse ({self.button_number}) - {self.observer_name}"


class SubmissionReceipt(models.Model):
    observer = models.ForeignKey(ObserverAccount, on_delete=models.CASCADE)
    request_id = models.UUIDField()
    digest = models.CharField(max_length=64)
    result = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["observer", "request_id"], name="unique_observer_submission"
            )
        ]


class EmailConfig(models.Model):
    subject = models.CharField(
        max_length=100,
        default="Zugangsdaten für die DUEB-Übung",
        verbose_name="Betreff",
    )

    email_text = models.TextField(
        default="""Sehr geehrte(r) {name},

hiermit erhalten Sie Ihre Zugangsdaten für die digitale Übungsbeobachtung (DUEB):

Benutzername: {username}
Passwort: {password}

Bitte melden Sie sich unter folgendem Link an:
{login_url}

Ihre erhobenen Daten sind über das Webportal abrufbar. Bitte melden Sie sich unter dem oben genannten Link an.

Mit freundlichen Grüßen,
Ihr DUEB-Team""",
        verbose_name="E-Mail-Text",
    )

    selected_observers = models.ManyToManyField(
        ObserverAccount, verbose_name="Ausgewählte Beobachter", blank=True
    )

    def __str__(self):
        return f"E-Mail-Konfiguration ({self.subject})"

    class Meta:
        verbose_name = "E-Mail-Konfiguration"
        verbose_name_plural = "E-Mail-Konfigurationen"
        app_label = "DUEBapp"


class ObserverNotification(ObserverAccount):
    class Meta:
        proxy = True
        verbose_name = "Beobachter-Benachrichtigung"
        verbose_name_plural = "Beobachter-Benachrichtigungen"
        app_label = "DUEBapp"  # Expliziter App-Label


class FormResponseImage(models.Model):
    response = models.ForeignKey(FormResponse, on_delete=models.CASCADE, related_name="images")
    question = models.ForeignKey(Question, on_delete=models.SET_NULL, null=True, blank=True)
    question_key = models.CharField(max_length=50, blank=True)
    image = models.ImageField(upload_to="uploads/")
    name = models.CharField(max_length=150, blank=True)
    position = models.PositiveSmallIntegerField()

    class Meta:
        ordering = ["position", "pk"]
        constraints = [
            models.UniqueConstraint(
                fields=["response", "position"], name="unique_response_image_position"
            )
        ]


class AdminTokenBinding(models.Model):
    token = models.OneToOneField("authtoken.Token", on_delete=models.CASCADE, primary_key=True)
    auth_hash = models.CharField(max_length=64)


class LoginBucket(models.Model):
    key = models.CharField(max_length=64, primary_key=True)
    attempts = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField(db_index=True)


class ObserverEmailDelivery(models.Model):
    observer = models.ForeignKey(ObserverAccount, on_delete=models.CASCADE)
    batch_id = models.UUIDField()
    subject = models.CharField(max_length=100)
    template = models.TextField()
    recipient = models.EmailField()
    login_url = models.URLField()
    status = models.CharField(
        max_length=12,
        default="pending",
        choices=[
            ("pending", "Ausstehend"),
            ("sending", "In Zustellung"),
            ("sent", "Gesendet"),
            ("failed", "Fehlgeschlagen"),
            ("uncertain", "Zustellung unklar"),
        ],
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    error = models.CharField(max_length=200, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["observer", "batch_id"], name="unique_observer_mail_batch"
            )
        ]
        verbose_name = "E-Mail-Versandauftrag"
        verbose_name_plural = "E-Mail-Versandaufträge"
