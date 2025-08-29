from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db.models import Q
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from core.models import UserProfile
from allauth.account.models import EmailAddress


User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ("username", "email", "password")

    def create(self, validated_data):
        request = self.context.get("request")

        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            is_active=True  # actif mais email non vérifié
        )
        email_address, created = EmailAddress.objects.get_or_create(
            user=user,
            email=user.email,
            primary=True
        )
        email_address.send_confirmation(request)
        
        return {"user": user, "detail": "Un e-mail de confirmation a été envoyé à votre addresse e-mail. "}

class MeSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    nick_name = serializers.SerializerMethodField()
    gender   = serializers.CharField(source="profile.gender", read_only=True)
    country  = serializers.CharField(source="profile.country", read_only=True)
    language = serializers.CharField(source="profile.language", read_only=True)
    timezone = serializers.CharField(source="profile.timezone", read_only=True)
    avatar   = serializers.ImageField(source="profile.avatar", read_only=True)

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
        return obj.username


class MeUpdateSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(required=False, allow_blank=True, write_only=True)
    nick_name = serializers.CharField(required=False, allow_blank=True, write_only=True)
    gender   = serializers.CharField(source="profile.gender", required=False, allow_blank=True, allow_null=True)
    country  = serializers.CharField(source="profile.country", required=False, allow_blank=True, allow_null=True)
    language = serializers.CharField(source="profile.language", required=False, allow_blank=True, allow_null=True)
    timezone = serializers.CharField(source="profile.timezone", required=False, allow_blank=True, allow_null=True)

    class Meta:
        model  = User
        fields = ["full_name", "nick_name", "gender", "country", "language", "timezone"]

    def validate(self, attrs):
        request_user = self.context["request"].user if "request" in self.context else None
        nick_name = attrs.get("nick_name")
        if nick_name and request_user:
            if User.objects.filter(~Q(pk=request_user.pk), username__iexact=nick_name).exists():
                raise serializers.ValidationError({"nick_name": "This nickname is already taken."})
        return attrs

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})
        full_name = validated_data.pop("full_name", None)
        if full_name:
            parts = full_name.strip().split()
            instance.first_name = parts[0] if parts else ""
            instance.last_name  = " ".join(parts[1:]) if len(parts) > 1 else ""
        nick_name = validated_data.pop("nick_name", None)
        if nick_name:
            instance.username = nick_name
        instance.save()
        profile, _ = UserProfile.objects.get_or_create(user=instance)
        for attr, val in profile_data.items():
            setattr(profile, attr, val)
        profile.save()
        return instance


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        user = self.context.get("request").user
        validate_password(password=attrs.get("new_password"), user=user)
        return attrs


class AvatarUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ["avatar"]

    def to_representation(self, instance):
        request = self.context.get("request")
        url = instance.avatar.url if instance.avatar else None
        if url and request:
            url = request.build_absolute_uri(url)
        return {"avatar": url}


class EmailAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailAddress
        fields = ["id", "email", "is_primary", "is_verified", "created_at"]
        read_only_fields = ["id", "is_primary", "is_verified", "created_at"]


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Login avec username ou email.
    Bloque si l'email principal n'est pas vérifié.
    """

    def validate(self, attrs):
        username_or_email = attrs.get("username")

        # Permet de se connecter avec l'email à la place du username
        if username_or_email and "@" in username_or_email:
            try:
                user = User.objects.get(email__iexact=username_or_email)
                attrs["username"] = user.username
            except User.DoesNotExist:
                pass  # La validation échouera ensuite

        # Appel de la validation standard JWT
        data = super().validate(attrs)

        # Vérification que l'email principal est vérifié
        primary_email = EmailAddress.objects.filter(user=self.user, primary=True).first()
        if primary_email and not primary_email.verified:
            raise serializers.ValidationError(
                "Veuillez vérifier votre adresse e-mail avant de vous connecter."
            )

        return data