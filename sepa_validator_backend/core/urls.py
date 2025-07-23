from django.urls import path
from core import views
from .views import upload_sepa_file,  upload_success

urlpatterns = [
    path('signup/', views.signup_view, name='signup'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('upload/', upload_sepa_file, name='upload_sepa_file'),
    path('upload/success/', upload_success, name='upload_success'),
    path('home/', views.home, name='home'),
    path('delete/<int:file_id>/', views.delete_sepa_file, name='delete_file'),
]
