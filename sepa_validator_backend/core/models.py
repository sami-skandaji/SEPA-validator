from django.db import models
from django.contrib.auth.models import User

class SepaFile(models.Model):
    xml_file = models.FileField(upload_to='sepa_files/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    is_valid = models.BooleanField(null=True, blank=True)
    validation_report = models.TextField(blank=True, null=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True)
    version = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return f"{self.xml_file.name} - {'Valid' if self.is_valid else 'Invalid' if self.is_valid is not None else 'Pending'}"
