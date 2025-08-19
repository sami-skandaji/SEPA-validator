# core/admin_urls.py
from django.urls import path
from .admin_views import (
    SepaFileModerationList,
    SepaFileModerationDetail,
    SepaFileRevalidate,
    SepaFileSetValidity
)

urlpatterns = [
    path("files/", SepaFileModerationList.as_view(), name="sepa-admin-list"),
    path("files/<int:pk>/", SepaFileModerationDetail.as_view(), name="sepa-admin-detail"),
    path("files/<int:pk>/revalidate/", SepaFileRevalidate.as_view(), name="sepa-admin-revalidate"),
    path("files/<int:pk>/set-validity/", SepaFileSetValidity.as_view(), name="sepa-admin-set-validity"),
]
