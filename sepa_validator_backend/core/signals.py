import os
from django.db.models.signals import post_delete
from django.dispatch import receiver
from .models import SepaFile

@receiver(post_delete, sender=SepaFile)
def delete_file_from_filesystem(sender, instance, **kwargs):
    if instance.xml_file:
        file_path = instance.xml_file.path
        if os.path.isfile(file_path):
            os.remove(file_path)