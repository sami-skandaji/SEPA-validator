# core/api_urls.py
from django.urls import path
from .api_views import (
    SepaUploadAPIView,
    SepaValidationResultListAPIView,
    SepaValidationDetailAPIView,
    SepaValidationDeleteAPIView,
    SepaFileUpdateAPIView,
    SepaSummaryView,
    UpdateSepaVersionsAPIView,
    ValidateFromURLAPIView,
    UploadFromURLAPIView,
    UploadZipFile,
    NotificationListAPIView,
    MarkNotificationAsReadAPIView,
    SepaStatisticsAPIView,
    StatisticsTimeSeriesAPIView,
)

urlpatterns = [
    # SEPA Upload & Validation
    path("upload/", SepaUploadAPIView.as_view(), name="sepa-upload"),
    path("results/", SepaValidationResultListAPIView.as_view(), name="sepa-results"),
    path("results/<int:pk>/", SepaValidationDetailAPIView.as_view(), name="sepa-result-detail"),
    path("results/<int:pk>/delete/", SepaValidationDeleteAPIView.as_view(), name="sepa-result-delete"),
    path("results/<int:pk>/update/", SepaFileUpdateAPIView.as_view(), name="sepa-update"),

    # Alias si nécessaire pour le frontend
    path("files/<int:id>/", SepaValidationDetailAPIView.as_view(), name="sepa-file-detail"),

    # Versions & Validation via URL
    path("update-versions/", UpdateSepaVersionsAPIView.as_view(), name="update-versions"),
    path("validate-url/", ValidateFromURLAPIView.as_view(), name="validate-from-url"),
    path("upload-url/", UploadFromURLAPIView.as_view(), name="upload-from-url"),
    path("upload-zip/", UploadZipFile.as_view(), name="upload-zip"),

    # Statistiques
    path("statistics/", SepaStatisticsAPIView.as_view(), name="sepa-statistics"),
    path("statistics/timeseries/", StatisticsTimeSeriesAPIView.as_view(), name="statistics-timeseries"),

    # Notifications
    path("notifications/", NotificationListAPIView.as_view(), name="notifications-list"),
    path("notifications/<int:pk>/mark-read/", MarkNotificationAsReadAPIView.as_view(), name="mark-notification-read"),
]
