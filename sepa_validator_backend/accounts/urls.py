from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from core.api_views import RegisterAPIView, UserInfoAPIView

from .views import (
    MeView,
    MeUpdateView,
    ChangePasswordView,
    AvatarUploadView,
    EmailAddressListCreateView,
    EmailAddressDeleteView,
)

urlpatterns = [
    path("signup/", RegisterAPIView.as_view(), name="signup"),

    # JWT
    path("login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    path("user-info/", UserInfoAPIView.as_view(), name="user-info"),

    # Profil
    path("me/", MeView.as_view(), name="me"),
    path("me/update/", MeUpdateView.as_view(), name="me-update"),
    path("me/change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("me/avatar/", AvatarUploadView.as_view(), name="avatar-upload"),

    # Emails
    path("emails/", EmailAddressListCreateView.as_view(), name="emails"),
    path("emails/<int:pk>/", EmailAddressDeleteView.as_view(), name="email-delete"),
]
