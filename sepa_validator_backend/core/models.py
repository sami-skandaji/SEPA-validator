from django.db import models
from django.contrib.auth.models import User

class SepaFile(models.Model):
    xml_file = models.FileField(upload_to='sepa_files/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    is_valid = models.BooleanField(null=True, blank=True)
    # TEMPORAIRE
    validation_report = models.JSONField(null=True, blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True)
    version = models.CharField(max_length=20, blank=True, null=True)

    extracted_data = models.JSONField(blank=True, null=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sepa_files", null=True)

    def __str__(self):
        return self.xml_file.name
