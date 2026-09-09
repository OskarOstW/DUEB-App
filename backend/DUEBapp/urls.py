from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views
from .health import ready

router = DefaultRouter()
router.register(r"forms", views.FormViewSet)
router.register(r"questions", views.QuestionViewSet)
router.register(r"options", views.OptionViewSet)
router.register(r"form-responses", views.FormResponseViewSet)
router.register(r"contacts", views.ContactViewSet)
router.register(r"images", views.HomeScreenImageViewSet)
router.register(r"victim-profiles", views.VictimProfileViewSet)
router.register(r"excel-uploads", views.ExcelUploadViewSet)
router.register(r"organizations", views.OrganizationViewSet)
router.register(r"test-scenarios", views.TestScenarioViewSet)
router.register(r"test-scenario-victims", views.TestScenarioVictimViewSet)
router.register(r"observer-accounts", views.ObserverAccountViewSet)
router.register(r"victim-profile-responses", views.VictimProfileResponseViewSet)

urlpatterns = [
    path("ready/", ready, name="ready"),
    path("api-token-auth/", views.CustomAuthToken.as_view(), name="api-token-auth"),
    path("send-all-data/", views.SendAllDataView.as_view(), name="send-all-data"),
    path("observer/login/", views.ObserverLoginView.as_view(), name="observer-login"),
    path("observer/my-data/", views.ObserverMyDataView.as_view(), name="observer-my-data"),
    path("", include(router.urls)),
]
