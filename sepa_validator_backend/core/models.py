from django.db import models
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        USER  = "USER",  "User"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.USER)

    GENDER_CHOICES = [
        ("female", "Female"),
        ("male", "Male"),
        ("other", "Other"),
    ]

    gender   = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True, default="")
    country  = models.CharField(max_length=60, blank=True, default="")
    language = models.CharField(max_length=10, blank=True, default="")
    timezone = models.CharField(max_length=40, blank=True, default="Africa/Tunis")
    avatar   = models.ImageField(upload_to="avatars/", blank=True, null=True)

    def __str__(self):
        return f"{self.user.username} ({self.role})"

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_or_update_profile(sender, instance, created, **kwargs):
    # Crée le profil à la création, sinon s'assure qu'il existe
    if created:
        UserProfile.objects.create(user=instance, role=UserProfile.Role.ADMIN if instance.is_superuser else UserProfile.Role.USER)
    else:
        # garantit l’existence du profil même pour les anciens comptes
        UserProfile.objects.get_or_create(user=instance)

class EmailAddress(models.Model):
    user        = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="emails")
    email       = models.EmailField(unique=True)
    is_primary  = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    created_at  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.email


class SepaFile(models.Model):
    xml_file = models.FileField(upload_to='sepa_files/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    is_valid = models.BooleanField(null=True, blank=True)
    validation_report = models.JSONField(null=True, blank=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True)
    version = models.CharField(max_length=20, blank=True, null=True)

    extracted_data = models.JSONField(blank=True, null=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sepa_files", null=True)

    def __str__(self):
        return self.xml_file.name


class Notification(models.Model):
    LEVEL_CHOICES = [
        ('INFO', 'Info'),
        ('WARNING', 'Warning'),
        ('ERROR', 'Error'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=100, default='Notification')  # Étape 3
    message = models.TextField()
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='INFO')
    is_read = models.BooleanField(default=False)  # Étape 2
    created_at = models.DateTimeField(auto_now_add=True)
    related_file = models.ForeignKey(SepaFile, on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return f"[{self.level}] {self.title} - {self.message[:30]}..."
