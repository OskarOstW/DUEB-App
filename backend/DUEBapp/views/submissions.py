import logging

from django.db import transaction
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import FormResponse, ObserverAccount, TestScenario, VictimProfileResponse
from ..serializers import (
    FormResponseSerializer,
    VictimProfileResponseSerializer,
)
from ..services.submissions import save_submission
from .catalog import IsAdminOrObserverReadOnly

logger = logging.getLogger(__name__)


class SendAllDataView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, format=None):
        if not getattr(request.user, "is_observer", False):
            return Response({"detail": "Zum Senden bitte als Beobachter anmelden."}, status=403)
        result = save_submission(request.user.account, request.data)
        return Response(result)


class ObserverMyDataView(APIView):
    permission_classes = [IsAdminOrObserverReadOnly]

    @transaction.atomic
    def get(self, request, *args, **kwargs):
        user = request.user
        if getattr(user, "is_observer", False):
            user.account = ObserverAccount.objects.select_for_update().get(pk=user.account.pk)
            email = user.email
        else:
            email = request.query_params.get("email")
            if not email:
                return Response(
                    {"error": "Bitte ?email= angeben (Admin-Zugriff)."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        form_responses = (
            FormResponse.objects.filter(observer_email=email)
            if user.is_staff
            else FormResponse.objects.filter(
                observer=user.account, form__in=user.account.allowed_forms.all()
            )
        )
        profile_responses = (
            VictimProfileResponse.objects.filter(observer_email=email)
            if user.is_staff
            else VictimProfileResponse.objects.filter(observer=user.account)
        )

        if getattr(user, "is_observer", False):
            scenario = TestScenario.objects.first()
            form_responses = (
                form_responses.filter(test_scenario=scenario) if scenario else form_responses.none()
            )
            profile_responses = (
                profile_responses.filter(test_scenario=scenario)
                if scenario
                else profile_responses.none()
            )

        if getattr(user, "is_observer", False) and not user.account.show_patient_profiles:
            profile_responses = profile_responses.none()

        form_responses = form_responses.select_related("test_scenario").prefetch_related("images")
        profile_responses = profile_responses.select_related("test_scenario")
        return Response(
            {
                "data_revision": getattr(getattr(user, "account", None), "data_revision", 0),
                "observer_email": email,
                "form_responses": FormResponseSerializer(form_responses, many=True).data,
                "victim_profile_responses": VictimProfileResponseSerializer(
                    profile_responses, many=True
                ).data,
            },
            status=status.HTTP_200_OK,
        )
