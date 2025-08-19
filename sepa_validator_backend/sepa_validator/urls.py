from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),

    # Comptes (JWT + profil)
    path("api/accounts/", include("accounts.urls")),

    path("api/admin/", include("core.admin_urls")),

    # API métier (SEPA, stats, uploads…)
    path("api/", include("core.api_urls")),

    # (optionnel) routes non-API de core
    path("", include("core.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
