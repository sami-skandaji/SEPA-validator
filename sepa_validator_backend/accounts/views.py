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
    EmailAddressSerializer,
    RegisterSerializer
)
from core.models import UserProfile, EmailAddress

User = get_user_model()


class RegisterAPIView(APIView):
    def post(self, request):
        username = request.data.get("username")
        email = request.data.get("email")
        password = request.data.get("password")

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            is_active=True  # Allauth gère la vérification via EmailAddress
        )

        return Response({"detail": "Compte créé. Vérifiez votre email pour activer."}, status=status.HTTP_201_CREATED)
    


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)

        full_name = f"{user.first_name} {user.last_name}".strip() or user.username or user.email
        avatar_url = request.build_absolute_uri(profile.avatar.url) if getattr(profile, "avatar", None) else None

        return Response({
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "full_name": full_name,
            "nick_name": user.username,
            "avatar": avatar_url,
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
        super().update(request, *args, **kwargs)
        # Retourne un payload cohérent pour le front
        return Response(MeSerializer(self.get_object()).data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        old_password = serializer.validated_data["old_password"]
        new_password = serializer.validated_data["new_password"]

        if not user.check_password(old_password):
            return Response({"old_password": ["Ancien mot de passe incorrect."]}, status=status.HTTP_400_BAD_REQUEST)
        
        user.set_password(new_password)
        user.save()
        update_session_auth_hash(request, user)
        return Response({"detail": "Mot de passe changé avec succès."}, status=status.HTTP_200_OK)


class AvatarUploadView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AvatarUploadSerializer
    parser_classes = [MultiPartParser]

    def get_object(self):
        profile, _ = UserProfile.objects.get_or_create(user=self.request.user)
        return profile

    def update(self, request, *args, **kwargs):
        super().update(request, *args, **kwargs)
        profile = self.get_object()
        avatar_url = request.build_absolute_uri(profile.avatar.url) if profile.avatar else None
        return Response({"avatar": avatar_url})


class EmailAddressListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = EmailAddressSerializer

    def get_queryset(self):
        return EmailAddress.objects.filter(user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class EmailAddressDeleteView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = EmailAddressSerializer
    lookup_field = "pk"

    def get_queryset(self):
        return EmailAddress.objects.filter(user=self.request.user)
