from core.models import Notification

def notify_user(user, message, level='INFO', related_file=None):
    Notification.objects.create(
        user=user,
        message=message,
        level=level,
        related_file=related_file
    )
