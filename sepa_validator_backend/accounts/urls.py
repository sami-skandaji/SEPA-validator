from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from core.api_views import RegisterAPIView, UserInfoAPIView, VerifyEmailAPIView
from .serializers import CustomTokenObtainPairSerializer
from .views import (
    MeView,
    MeUpdateView,
    ChangePasswordView,
    AvatarUploadView,
    EmailAddressListCreateView,
    EmailAddressDeleteView,
)
from rest_framework_simplejwt.views import TokenObtainPairView

# JWT login enrichi avec vérification e-mail
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

urlpatterns = [
    # Auth
    path("register/", RegisterAPIView.as_view(), name="register"),
    path("token/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Infos utilisateur
    path("user-info/", UserInfoAPIView.as_view(), name="user-info"),
    path("verify-email/<str:token>/", VerifyEmailAPIView.as_view(), name="verify_email"),

    # Profil utilisateur
    path("me/", MeView.as_view(), name="me"),
    path("me/update/", MeUpdateView.as_view(), name="me-update"),
    path("me/change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("me/avatar/", AvatarUploadView.as_view(), name="avatar-upload"),

    # Emails secondaires
    path("emails/", EmailAddressListCreateView.as_view(), name="emails"),
    path("emails/<int:pk>/", EmailAddressDeleteView.as_view(), name="email-delete"),
]
