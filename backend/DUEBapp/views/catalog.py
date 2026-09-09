import logging

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Max
from rest_framework import filters, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as ApiValidationError
from rest_framework.permissions import SAFE_METHODS, BasePermission
from rest_framework.response import Response

from ..models import (
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
from ..permissions import IsSuperuser
from ..serializers import (
    ContactSerializer,
    ExcelUploadSerializer,
    FormResponseSerializer,
    FormSerializer,
    HomeScreenImageSerializer,
    ObserverAccountSerializer,
    OrganizationSerializer,
    QuestionSerializer,
    StandaloneOptionSerializer,
    TestScenarioSerializer,
    TestScenarioVictimSerializer,
    VictimProfileResponseSerializer,
    VictimProfileSerializer,
)

logger = logging.getLogger(__name__)


class IsAdminOrObserverReadOnly(BasePermission):
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not (user and user.is_authenticated):
            return False
        if getattr(user, "is_superuser", False):
            return True
        return getattr(user, "is_observer", False) and request.method in SAFE_METHODS


class FormViewSet(viewsets.ModelViewSet):
    queryset = Form.objects.prefetch_related("questions__options")
    serializer_class = FormSerializer
    permission_classes = [IsAdminOrObserverReadOnly]

    def perform_destroy(self, instance):
        if instance.responses.exists():
            raise ApiValidationError("Beantwortete Formulare dürfen nicht gelöscht werden.")
        instance.delete()

    def get_queryset(self):
        queryset = super().get_queryset()
        name = self.request.query_params.get("name")
        if name is not None:
            queryset = queryset.filter(name=name)
        user = self.request.user
        if getattr(user, "is_observer", False):
            allowed_ids = user.account.allowed_forms.values_list("id", flat=True)
            queryset = queryset.filter(id__in=allowed_ids)
        return queryset


class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.select_related("form").prefetch_related("options")
    serializer_class = QuestionSerializer
    permission_classes = [IsAdminOrObserverReadOnly]

    def perform_destroy(self, instance):
        if instance.form.responses.exists():
            raise ApiValidationError("Fragen beantworteter Formulare dürfen nicht gelöscht werden.")
        instance.delete()

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if getattr(user, "is_observer", False):
            return qs.filter(form__in=user.account.allowed_forms.all())
        return qs


class OptionViewSet(viewsets.ModelViewSet):
    queryset = Option.objects.all()
    serializer_class = StandaloneOptionSerializer
    permission_classes = [IsAdminOrObserverReadOnly]

    def perform_destroy(self, instance):
        if instance.question.form.responses.exists():
            raise ApiValidationError(
                "Optionen beantworteter Formulare dürfen nicht gelöscht werden."
            )
        instance.delete()

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if getattr(user, "is_observer", False):
            return qs.filter(question__form__in=user.account.allowed_forms.all())
        return qs


class FormResponseViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = FormResponse.objects.select_related("test_scenario", "form").prefetch_related(
        "images"
    )
    serializer_class = FormResponseSerializer
    permission_classes = [IsAdminOrObserverReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if getattr(user, "is_observer", False):
            return qs.filter(observer=user.account, form__in=user.account.allowed_forms.all())
        return qs


class ContactViewSet(viewsets.ModelViewSet):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    permission_classes = [IsAdminOrObserverReadOnly]


class HomeScreenImageViewSet(viewsets.ModelViewSet):
    queryset = HomeScreenImage.objects.all()
    serializer_class = HomeScreenImageSerializer
    permission_classes = [IsAdminOrObserverReadOnly]

    def get_queryset(self):
        return HomeScreenImage.visible_to(self.request.user)


class VictimProfileViewSet(viewsets.ModelViewSet):
    queryset = VictimProfile.objects.all()
    serializer_class = VictimProfileSerializer
    permission_classes = [IsAdminOrObserverReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if getattr(user, "is_observer", False):
            return qs if user.account.show_patient_profiles else qs.none()
        return qs


class ExcelUploadViewSet(viewsets.ModelViewSet):
    queryset = ExcelUpload.objects.all()
    serializer_class = ExcelUploadSerializer
    permission_classes = [IsSuperuser]


class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    permission_classes = [IsAdminOrObserverReadOnly]


class TestScenarioViewSet(viewsets.ModelViewSet):
    queryset = TestScenario.objects.all()
    serializer_class = TestScenarioSerializer
    permission_classes = [IsAdminOrObserverReadOnly]

    def create(self, request, *args, **kwargs):
        if TestScenario.objects.exists():
            return Response(
                {
                    "error": "Es existiert bereits ein Testszenario. Bitte löschen Sie es erst, bevor Sie ein neues anlegen."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            return super().create(request, *args, **kwargs)
        except ValidationError as ve:
            return Response({"error": str(ve)}, status=status.HTTP_400_BAD_REQUEST)

    @action(
        detail=True,
        methods=["get"],
        url_path="unassigned-profiles",
        permission_classes=[IsSuperuser],
    )
    def list_unassigned_profiles(self, request, pk=None):
        scenario = self.get_object()
        assigned_ids = scenario.assignments.values_list("victim_profile_id", flat=True)
        profiles = VictimProfile.objects.exclude(id__in=assigned_ids)
        serializer = VictimProfileSerializer(profiles, many=True)
        return Response(serializer.data, status=200)

    @action(
        detail=True,
        methods=["post"],
        url_path="assign-profiles",
        permission_classes=[IsSuperuser],
    )
    @transaction.atomic
    def assign_profiles(self, request, pk=None):
        scenario = self.get_object()
        scenario = TestScenario.objects.select_for_update().get(pk=scenario.pk)
        org_id = serializers.IntegerField(min_value=1).run_validation(
            request.data.get("organization")
        )
        profile_ids = serializers.ListField(
            child=serializers.IntegerField(min_value=1), allow_empty=False, max_length=99
        ).run_validation(request.data.get("profile_ids"))

        try:
            organization = Organization.objects.get(pk=org_id)
        except Organization.DoesNotExist:
            return Response({"error": "Organization existiert nicht."}, status=404)

        profiles = VictimProfile.objects.in_bulk(profile_ids)
        if any(pid not in profiles for pid in profile_ids):
            raise ApiValidationError("Mindestens ein Patientenprofil existiert nicht.")
        max_org_num = (
            scenario.assignments.filter(organization=organization).aggregate(
                Max("sequential_number")
            )["sequential_number__max"]
            or 0
        )
        if max_org_num + len(profile_ids) > 99:
            raise ApiValidationError("Die fortlaufende Nummer darf 99 nicht überschreiten.")
        assigned_ids = []
        for offset, pid in enumerate(profile_ids, start=1):
            vp = profiles[pid]
            next_num = max_org_num + offset
            button_code = f"{organization.short_code}{next_num:02d}"
            TestScenarioVictim.objects.create(
                scenario=scenario,
                victim_profile=vp,
                organization=organization,
                sequential_number=next_num,
                button_number=button_code,
            )
            assigned_ids.append(pid)
        return Response({"assigned_ids": assigned_ids}, status=200)


class TestScenarioVictimViewSet(viewsets.ModelViewSet):
    queryset = TestScenarioVictim.objects.select_related(
        "scenario", "victim_profile", "organization"
    )
    serializer_class = TestScenarioVictimSerializer
    permission_classes = [IsAdminOrObserverReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ["button_number", "victim_profile__profile_number"]

    def get_queryset(self):
        qs = super().get_queryset()
        scenario_id = self.request.query_params.get("scenario")
        if scenario_id:
            qs = qs.filter(scenario_id=scenario_id)
        user = self.request.user
        if getattr(user, "is_observer", False) and not user.account.show_patient_profiles:
            return qs.none()
        return qs

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        scenario_id = serializers.IntegerField(min_value=1).run_validation(
            request.data.get("scenario")
        )
        profile_id = serializers.IntegerField(min_value=1).run_validation(
            request.data.get("victim_profile")
        )
        org_id = serializers.IntegerField(min_value=1).run_validation(
            request.data.get("organization")
        )

        try:
            scenario = TestScenario.objects.select_for_update().get(pk=scenario_id)
            org = Organization.objects.get(pk=org_id)
            vp = VictimProfile.objects.get(pk=profile_id)
        except (
            TestScenario.DoesNotExist,
            Organization.DoesNotExist,
            VictimProfile.DoesNotExist,
        ):
            return Response({"error": "Ungültige IDs."}, status=404)

        max_org_num = (
            scenario.assignments.filter(organization=org).aggregate(Max("sequential_number"))[
                "sequential_number__max"
            ]
            or 0
        )
        next_num = max_org_num + 1
        if next_num > 99:
            raise ApiValidationError("Die fortlaufende Nummer darf 99 nicht überschreiten.")
        button_code = f"{org.short_code}{next_num:02d}"

        tv = TestScenarioVictim.objects.create(
            scenario=scenario,
            victim_profile=vp,
            organization=org,
            sequential_number=next_num,
            button_number=button_code,
        )

        serializer = self.get_serializer(tv)
        return Response(serializer.data, status=201)


class ObserverAccountViewSet(viewsets.ModelViewSet):
    queryset = ObserverAccount.objects.all()
    serializer_class = ObserverAccountSerializer
    permission_classes = [IsSuperuser]


class VictimProfileResponseViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = VictimProfileResponse.objects.select_related("test_scenario")
    serializer_class = VictimProfileResponseSerializer
    permission_classes = [IsAdminOrObserverReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if getattr(user, "is_observer", False):
            return (
                qs.filter(observer=user.account)
                if user.account.show_patient_profiles
                else qs.none()
            )
        return qs
