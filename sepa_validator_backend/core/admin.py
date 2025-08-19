from django.contrib import admin
from .models import SepaFile
from .models import Notification, UserProfile

# Register your models here.

admin.site.register(SepaFile)
admin.site.register(Notification)

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role")
    search_fields = ("user__username", "user__email")
    list_filter = ("role",)