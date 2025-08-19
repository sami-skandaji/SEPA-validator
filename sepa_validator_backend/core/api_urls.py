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
    # Upload/validation
    path("upload/", SepaUploadAPIView.as_view(), name="sepa-upload"),
    path("results/", SepaValidationResultListAPIView.as_view(), name="sepa-results"),
    path("results/<int:pk>/", SepaValidationDetailAPIView.as_view(), name="sepa-result-detail"),
    path("results/<int:pk>/delete/", SepaValidationDeleteAPIView.as_view(), name="sepa-result-delete"),
    path("results/<int:pk>/update/", SepaFileUpdateAPIView.as_view(), name="sepa-update"),

    # (alias si ton front en a besoin)
    path("files/<int:id>/", SepaValidationDetailAPIView.as_view(), name="sepa-file-detail"),

    # Versions & validations via URL
    path("update-versions/", UpdateSepaVersionsAPIView.as_view(), name="update_versions"),
    path("validate-url/", ValidateFromURLAPIView.as_view(), name="validate-from-url"),
    path("upload-url/", UploadFromURLAPIView.as_view(), name="upload-from-url"),
    path("upload-zip/", UploadZipFile.as_view(), name="upload-zip"),

    # Stats
    path("statistics/", SepaStatisticsAPIView.as_view(), name="sepa-statistics"),
    path("statistics/timeseries/", StatisticsTimeSeriesAPIView.as_view(), name="statistics_timeseries"),

    # Notifications
    path("notifications/", NotificationListAPIView.as_view(), name="notifications-list"),
    path("notifications/<int:pk>/mark-read/", MarkNotificationAsReadAPIView.as_view(), name="mark-notification-read"),
]
