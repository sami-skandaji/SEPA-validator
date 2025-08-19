# accounts/views.py
from rest_framework.views import APIView
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from django.contrib.auth import update_session_auth_hash, get_user_model
from .serializers import (
    MeSerializer,
    MeUpdateSerializer,
    ChangePasswordSerializer,
    AvatarUploadSerializer,
    EmailAddressSerializer
)
from core.models import UserProfile, EmailAddress

User = get_user_model()

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)

        full_name = f"{user.first_name} {user.last_name}".strip() or user.username or user.email
        # ✅ URL absolue pour l’avatar
        avatar_url = None
        if getattr(profile, "avatar", None):
            avatar_url = request.build_absolute_uri(profile.avatar.url)

        return Response({
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            # champs front-friendly
            "full_name": full_name,
            "nick_name": user.username,
            "avatar": avatar_url,
            # champs profil
            "gender": profile.gender or "",
            "country": profile.country or "",
            "language": profile.language or "",
            "timezone": profile.timezone or "",
            "role": getattr(profile, "role", "USER"),
        })


class MeUpdateView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MeUpdateSerializer

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        # Retourne un payload cohérent pour le front
        return Response(MeSerializer(self.get_object()).data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        s = ChangePasswordSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(s.validated_data["old_password"]):
            return Response({"detail": "Ancien mot de passe incorrect."}, status=400)
        user.set_password(s.validated_data["new_password"])
        update_session_auth_hash(request, user)
        return Response({"detail": "Mot de passe changé."})


class AvatarUploadView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AvatarUploadSerializer
    parser_classes = [MultiPartParser]

    def get_object(self):
        # ✅ crée le profil si nécessaire
        profile, _ = UserProfile.objects.get_or_create(user=self.request.user)
        return profile


class EmailAddressListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = EmailAddressSerializer

    def get_queryset(self):
        return EmailAddress.objects.filter(user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class EmailAddressDeleteView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = EmailAddress.objects.all()
    lookup_field = "pk"

    def get_queryset(self):
        return EmailAddress.objects.filter(user=self.request.user)
