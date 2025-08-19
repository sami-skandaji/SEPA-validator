from rest_framework.permissions import BasePermission

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated):
            return False
        # superuser = admin
        if u.is_superuser:
            return True
        # profil avec rôle ADMIN
        return hasattr(u, "profile") and getattr(u.profile, "role", "USER") == "ADMIN"
