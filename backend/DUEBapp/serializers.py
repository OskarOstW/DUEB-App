from django.db import transaction
from rest_framework import serializers

from .catalog_versions import assignment_definition, fingerprint, form_definition
from .models import (
    Contact,
    ExcelUpload,
    Form,
    FormResponse,
    HomeScreenImage,
    ObserverAccount,
    Option,
    Organization,
    Question,
    TestScenario,
    TestScenarioVictim,
    VictimProfile,
    VictimProfileResponse,
)


class OptionSerializer(serializers.ModelSerializer):
    """Antwortoptionen einer Frage (Checkbox-Optionen oder Dropdown-Einträge)."""

    id = serializers.IntegerField(required=False)

    class Meta:
        model = Option
        fields = ["id", "label"]


class StandaloneOptionSerializer(OptionSerializer):
    id = serializers.IntegerField(read_only=True)

    class Meta(OptionSerializer.Meta):
        fields = ["id", "label", "question"]

    def validate(self, attrs):
        question = attrs.get("question", getattr(self.instance, "question", None))
        if self.instance and question != self.instance.question:
            raise serializers.ValidationError(
                "Eine Option darf nicht in eine andere Frage verschoben werden."
            )
        if not self.instance and question and question.form.responses.exists():
            raise serializers.ValidationError(
                "Beantworteten Formularen dürfen keine Optionen hinzugefügt werden."
            )
        return attrs


class QuestionSerializer(serializers.ModelSerializer):
    """Frage mit allen Attributen und den zugehörigen Optionen (verschachtelt)."""

    id = serializers.IntegerField(required=False)
    options = OptionSerializer(many=True, required=False)
    form = serializers.PrimaryKeyRelatedField(queryset=Form.objects.all(), required=False)

    class Meta:
        model = Question
        fields = [
            "id",
            "form",
            "question_text",
            "option_type",
            "input_field_added",
            "image_upload_desired",
            "options",
            "description_question",
            "hint",
        ]

    def validate(self, attrs):
        if self.parent is None and not self.instance:
            form = attrs.get("form")
            if form is None:
                raise serializers.ValidationError({"form": "Ein Formular muss ausgewählt werden."})
            if form.responses.exists():
                raise serializers.ValidationError(
                    "Beantworteten Formularen dürfen keine Fragen hinzugefügt werden."
                )
        kind = attrs.get("option_type", getattr(self.instance, "option_type", None))
        if kind == "scale" and attrs.get("options"):
            raise serializers.ValidationError(
                "Skala-Fragen dürfen keine Antwortoptionen enthalten."
            )
        if self.instance and self.instance.form.responses.exists():
            if (
                kind != self.instance.option_type
                or attrs.get("form", self.instance.form) != self.instance.form
            ):
                raise serializers.ValidationError(
                    "Antworttyp und Formular einer beantworteten Frage dürfen nicht geändert werden."
                )
            if "options" in attrs and {o.get("id") for o in attrs["options"]} != set(
                self.instance.options.values_list("pk", flat=True)
            ):
                raise serializers.ValidationError(
                    "Antwortoptionen eines beantworteten Formulars dürfen nicht entfernt oder ergänzt werden."
                )
        return attrs

    @transaction.atomic
    def update(self, instance, validated_data):
        options = validated_data.pop("options", None)
        validated_data.pop("id", None)
        instance = super().update(instance, validated_data)
        if options is not None:
            existing = {o.pk: o for o in instance.options.all()}
            retained = []
            for data in options:
                pk = data.pop("id", None)
                if pk is not None and pk not in existing:
                    raise serializers.ValidationError("Die Option gehört nicht zu dieser Frage.")
                obj = existing.get(pk) or Option(question=instance)
                obj.label = data["label"]
                obj.save()
                retained.append(obj.pk)
            instance.options.exclude(pk__in=retained).delete()
        return instance

    @transaction.atomic
    def create(self, validated_data):
        validated_data.pop("id", None)
        options_data = validated_data.pop("options", [])
        question = Question.objects.create(**validated_data)
        for option_data in options_data:
            option_data.pop("id", None)
            Option.objects.create(question=question, **option_data)
        return question


class FormSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True)

    class Meta:
        model = Form
        fields = [
            "id",
            "name",
            "note",
            "description_form",
            "show_patient_profile_search",
            "questions",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["version"] = fingerprint(form_definition(instance))
        if "active_scenario_uuid" not in self.context:
            scenario = TestScenario.objects.first()
            self.context["active_scenario_uuid"] = str(scenario.public_id) if scenario else None
        data["scenarioId"] = self.context["active_scenario_uuid"]
        return data

    @transaction.atomic
    def create(self, validated_data):
        questions_data = validated_data.pop("questions")
        form = Form.objects.create(**validated_data)
        for question_data in questions_data:
            options_data = question_data.pop("options", [])
            question_data.pop("id", None)
            question_data.pop("form", None)
            question = Question.objects.create(form=form, **question_data)
            for option_data in options_data:
                option_data.pop("id", None)
                Option.objects.create(question=question, **option_data)
        return form

    @transaction.atomic
    def update(self, instance, validated_data):
        questions = validated_data.pop("questions", None)
        if questions is not None:
            existing = {q.pk: q for q in instance.questions.all()}
            incoming = {q.get("id") for q in questions}
            if instance.responses.exists() and incoming != set(existing):
                raise serializers.ValidationError(
                    "Ein beantwortetes Formular darf strukturell nicht verändert werden. Bitte ein neues Formular erstellen."
                )
            retained = []
            for data in questions:
                options = data.pop("options", [])
                question_id = data.pop("id", None)
                data.pop("form", None)
                if question_id is not None and question_id not in existing:
                    raise serializers.ValidationError("Die Frage gehört nicht zu diesem Formular.")
                question = existing.get(question_id)
                if question is None:
                    question = Question.objects.create(form=instance, **data)
                else:
                    if instance.responses.exists() and question.option_type != data.get(
                        "option_type", question.option_type
                    ):
                        raise serializers.ValidationError(
                            "Der Antworttyp einer beantworteten Frage darf nicht geändert werden."
                        )
                    for key, value in data.items():
                        setattr(question, key, value)
                    question.save()
                retained.append(question.pk)
                old_options = {o.pk: o for o in question.options.all()}
                if instance.responses.exists() and {o.get("id") for o in options} != set(
                    old_options
                ):
                    raise serializers.ValidationError(
                        "Antwortoptionen eines beantworteten Formulars dürfen nicht entfernt oder ergänzt werden."
                    )
                kept = []
                for option in options:
                    option_id = option.pop("id", None)
                    if option_id is not None and option_id not in old_options:
                        raise serializers.ValidationError(
                            "Die Option gehört nicht zu dieser Frage."
                        )
                    obj = old_options.get(option_id) or Option(question=question)
                    obj.label = option["label"]
                    obj.save()
                    kept.append(obj.pk)
                question.options.exclude(pk__in=kept).delete()
            instance.questions.exclude(pk__in=retained).delete()
        return super().update(instance, validated_data)


class FormResponseSerializer(serializers.ModelSerializer):
    """Vom Beobachter ausgefülltes Formular samt Bildverweisen."""

    images = serializers.SerializerMethodField()
    test_scenario_name = serializers.CharField(source="test_scenario.name", read_only=True)

    def get_images(self, obj):
        return [
            {"questionId": image.question_key, "name": image.name, "url": image.image.url}
            for image in obj.images.all()
        ]

    class Meta:
        model = FormResponse
        fields = [
            "id",
            "scenario_uuid",
            "template_version",
            "template_snapshot",
            "form",
            "test_scenario",
            "test_scenario_name",
            "observer_name",
            "observer_email",
            "responses",
            "picker_selections",
            "scale_values",
            "timestamps",
            "note",
            "note_timestamps",
            "images",
            "submitted_at",
        ]


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = [
            "id",
            "first_name",
            "last_name",
            "phone_number",
            "email",
            "general_info",
        ]


class HomeScreenImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    image = serializers.ImageField(write_only=True)

    class Meta:
        model = HomeScreenImage
        fields = ["id", "image", "image_url", "description", "requires_patient_profile_permission"]

    def get_image_url(self, obj):
        request = self.context.get("request")
        if obj.image:
            return request.build_absolute_uri(obj.image.url)
        return None


class VictimProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = VictimProfile
        fields = "__all__"


class ExcelUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExcelUpload
        fields = "__all__"


class VictimProfileShortSerializer(serializers.ModelSerializer):
    class Meta:
        model = VictimProfile
        fields = [
            "id",
            "profile_number",
            "category",
            "diagnosis",
            "gcs",
            "spo2",
            "lastname",
            "firstname",
        ]


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ["id", "name", "short_code"]


class TestScenarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestScenario
        fields = ["id", "public_id", "name", "date"]


class TestScenarioVictimSerializer(serializers.ModelSerializer):
    victim_profile_data = VictimProfileSerializer(source="victim_profile", read_only=True)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["scenarioId"] = str(instance.scenario.public_id)
        data["version"] = fingerprint(assignment_definition(instance))
        return data

    def validate(self, attrs):
        if self.instance and any(
            key in attrs and attrs[key] != getattr(self.instance, key)
            for key in (
                "scenario",
                "victim_profile",
                "organization",
                "sequential_number",
                "button_number",
            )
        ):
            if VictimProfileResponse.objects.filter(
                test_scenario=self.instance.scenario, button_number=self.instance.button_number
            ).exists():
                raise serializers.ValidationError(
                    "Eine beantwortete Patientenzuordnung darf nicht geändert werden."
                )
        return attrs

    class Meta:
        model = TestScenarioVictim
        fields = [
            "id",
            "scenario",
            "victim_profile",
            "victim_profile_data",
            "organization",
            "sequential_number",
            "button_number",
        ]


class ObserverAccountSerializer(serializers.ModelSerializer):
    allowed_forms = serializers.PrimaryKeyRelatedField(queryset=Form.objects.all(), many=True)
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = ObserverAccount
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "password",
            "allowed_forms",
            "show_patient_profiles",
        ]

    def validate_password(self, value):
        from django.contrib.auth.password_validation import validate_password

        validate_password(value)
        return value


class VictimProfileResponseSerializer(serializers.ModelSerializer):
    test_scenario_name = serializers.CharField(source="test_scenario.name", read_only=True)

    class Meta:
        model = VictimProfileResponse
        fields = [
            "id",
            "scenario_uuid",
            "template_version",
            "template_snapshot",
            "button_number",
            "kh_intern",
            "soll_sichtung",
            "test_scenario",
            "test_scenario_name",
            "diagnostic_loaded",
            "vitalwerte",
            "ist_sichtung",
            "sichtung_data",
            "diagnostik_data",
            "therapie_data",
            "op_team",
            "verlauf",
            "observer_name",
            "observer_email",
            "erstellt_am",
            "aktualisiert_am",
        ]
