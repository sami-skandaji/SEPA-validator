from django.urls import path
from .api_views import (
    RegisterAPIView,
    CustomAuthToken,
    SepaUploadAPIView,
    SepaValidationResultListAPIView,
    SepaValidationDetailAPIView,
    SepaValidationDeleteAPIView,
    SepaFileUpdateAPIView,
    SepaSummaryView,
    UserInfoAPIView,
    UpdateSepaVersionsAPIView,
    ValidateFromURLAPIView,
)

urlpatterns = [
    path('register/', RegisterAPIView.as_view(), name='register'),
    path('login/', CustomAuthToken.as_view(), name='api-login'),
    path('user-info/', UserInfoAPIView.as_view(), name='user-info'),

    path('upload/', SepaUploadAPIView.as_view(), name='sepa-upload'),
    path('results/', SepaValidationResultListAPIView.as_view(), name='sepa-results'),
    path('results/<int:pk>/', SepaValidationDetailAPIView.as_view(), name='sepa-result-detail'),
    path('results/<int:pk>/delete/', SepaValidationDeleteAPIView.as_view(), name='sepa-result-delete'),
    path('results/<int:pk>/update/', SepaFileUpdateAPIView.as_view(), name='sepa-update'),

    path('files/<int:id>/', SepaValidationDetailAPIView.as_view(), name='sepa-file-detail'),  # <- ajouté pour le frontend

    path('update-versions/', UpdateSepaVersionsAPIView.as_view(), name='update_versions'),
    path('summary/', SepaSummaryView.as_view(), name='sepa-summary'),
    path('validate-url/', ValidateFromURLAPIView.as_view(), name='validate-from-url'),
]
