from rest_framework import serializers
from django.contrib.auth import get_user_model
from core.models import UserProfile, EmailAddress
from django.contrib.auth.password_validation import validate_password
from django.db.models import Q

User = get_user_model()

class MeSerializer(serializers.ModelSerializer):
    # exposer ce que le front attend
    full_name = serializers.SerializerMethodField()
    nick_name = serializers.SerializerMethodField()

    gender   = serializers.CharField(source="profile.gender",   read_only=True)
    country  = serializers.CharField(source="profile.country",  read_only=True)
    language = serializers.CharField(source="profile.language", read_only=True)
    timezone = serializers.CharField(source="profile.timezone", read_only=True)
    avatar   = serializers.ImageField(source="profile.avatar",  read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "username",
            "first_name", "last_name",
            "full_name", "nick_name",
            "gender", "country", "language", "timezone", "avatar",
        ]

    def get_full_name(self, obj):
        full = f"{obj.first_name} {obj.last_name}".strip()
        return full or obj.username or obj.email

    def get_nick_name(self, obj):
        # ici on expose nickname = username (variante A)
        return obj.username


class MeUpdateSerializer(serializers.ModelSerializer):
    # champs que le front envoie
    full_name = serializers.CharField(required=False, allow_blank=True, write_only=True)
    nick_name = serializers.CharField(required=False, allow_blank=True, write_only=True)

    # champs profil (nestés)
    gender   = serializers.CharField(source="profile.gender",   required=False, allow_blank=True, allow_null=True)
    country  = serializers.CharField(source="profile.country",  required=False, allow_blank=True, allow_null=True)
    language = serializers.CharField(source="profile.language", required=False, allow_blank=True, allow_null=True)
    timezone = serializers.CharField(source="profile.timezone", required=False, allow_blank=True, allow_null=True)

    class Meta:
        model  = User
        fields = ["full_name", "nick_name", "gender", "country", "language", "timezone"]

    def validate(self, attrs):
        """
        - Nettoie/trim full_name & nick_name
        - Vérifie unicité du nick_name (username) si fourni et différent de l’actuel
        """
        request_user = self.context["request"].user if "request" in self.context else None

        # normaliser full_name
        full_name = attrs.get("full_name", None)
        if full_name is not None:
            attrs["full_name"] = " ".join((full_name or "").split())  # trim + collapse spaces

        # normaliser / vérifier nick_name
        nick_name = attrs.get("nick_name", None)
        if nick_name is not None:
            nick_name = (nick_name or "").strip()
            attrs["nick_name"] = nick_name
            if nick_name and request_user:
                # si on change de username, vérifier unicité
                if User.objects.filter(~Q(pk=request_user.pk), username__iexact=nick_name).exists():
                    raise serializers.ValidationError({"nick_name": "This nickname is already taken."})

        return attrs

    def update(self, instance, validated_data):
        # 1) extraire et traiter "profile"
        profile_data = validated_data.pop("profile", {})

        # 2) traiter full_name -> first_name/last_name
        full_name = validated_data.pop("full_name", None)
        if full_name is not None:
            parts = (full_name or "").strip().split()
            instance.first_name = parts[0] if parts else ""
            instance.last_name  = " ".join(parts[1:]) if len(parts) > 1 else ""

        # 3) traiter nick_name -> username (si fourni et non vide)
        nick_name = validated_data.pop("nick_name", None)
        if nick_name is not None and nick_name != "":
            instance.username = nick_name  # unicité déjà vérifiée dans validate()

        instance.save()

        # 4) MAJ profil
        profile, _ = UserProfile.objects.get_or_create(user=instance)
        for attr, val in profile_data.items():
            setattr(profile, attr, val)
        profile.save()
        return instance


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        validate_password(value); return value

class AvatarUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ["avatar"]

    def to_representation(self, instance):
        request = self.context.get("request")
        url = instance.avatar.url if instance.avatar else None
        if url and request:
            url = request.build_absolute_uri(url)   # ✅ absolue
        return {"avatar": url}

class EmailAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailAddress
        fields = ["id", "email", "is_primary", "is_verified", "created_at"]
        read_only_fields = ["id", "is_primary", "is_verified", "created_at"]