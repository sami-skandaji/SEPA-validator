import os
import re
from lxml import etree
from django.conf import settings
from django.http import HttpResponseRedirect
from django.urls import reverse
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth.decorators import login_required
from .forms import SepaFileUploadForm
from .models import SepaFile
#from core.sepa_business_rules import run_business_checks
from .validators.validate_sepa_professionally import validate_xml_professionally

"""
def signup_view(request):
    form = UserCreationForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        user = form.save()
        login(request, user)
        return redirect('home')
    return render(request, 'core/signup.html', {'form': form})

def login_view(request):
    form = AuthenticationForm(request, data=request.POST or None)
    if request.method == 'POST' and form.is_valid():
        user = form.get_user()
        login(request, user)
        return redirect('home')
    return render(request, 'core/login.html', {'form': form})
    
    """

def logout_view(request):
    logout(request)
    return redirect('login')



@login_required
def home(request):
    files = SepaFile.objects.order_by('-uploaded_at')[:10]
    for f in files:
        try:   
            path = os.path.join(settings.MEDIA_ROOT, str(f.xml_file))
            f.get_version = get_pain_version_from_xml(path)
        except FileNotFoundError:
            f.get_version = "fichier introuvable"
    return render(request, 'core/home.html', {'files' : files})




def get_pain_version_from_xml(xml_file_path):
    with open(xml_file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        match = re.search(r'urn:iso:std:iso:20022:tech:xsd:(pain\.\d{3}\.\d{3}\.\d{2})', content)
        if match:
            return match.group(1)
    return None


@login_required
def upload_sepa_file(request):
    print("📥 upload_sepa_file appelée")
    sepa_file = None

    if request.method == 'POST':
        form = SepaFileUploadForm(request.POST, request.FILES)
        if form.is_valid():
            sepa_file = form.save()
            uploaded_file_path = sepa_file.xml_file.path

            # 🧠 Validation complète
            result = validate_xml_professionally(uploaded_file_path)

            report_lines = []

            # ✅ Résultat XSD
            if result["xsd_valid"]:
                sepa_file.is_valid = True
                report_lines.append("✅ Validation XSD réussie.")
            else:
                sepa_file.is_valid = False
                report_lines.append(f"❌ {result['xsd_message']}")

            # 🔍 Vérifications simples
            report_lines.append("\n🔍 Vérifications simples :")
            for check in result["basic_checks"]:
                report_lines.append(check)
                if check.startswith("❌"):
                    sepa_file.is_valid = False

            # 🔍 Règles métier avancées
            report_lines.append("\n🔍 Règles métier :")
            for check in result["business_checks"]:
                report_lines.append(check)
                if check.startswith("❌"):
                    sepa_file.is_valid = False

            # 📝 Sauvegarde
            sepa_file.validation_report = "\n".join(report_lines)
            sepa_file.save()

            return redirect('upload_success')
    else:
        form = SepaFileUploadForm()

    return render(request, 'core/upload.html', {
        'form': form,
        'sepa_file': sepa_file
    })

@login_required
def upload_success(request):
    last_file = SepaFile.objects.order_by('-uploaded_at').first()
    if not last_file:
        return render(request, 'core/upload_success.html', {
            'filename': 'Aucun Fichier',
            'is_valid': False,
            'report': 'Aucun Fichier trouvé',
            'pain_version': 'Inconnue',
        })
    xml_file_path = os.path.join(settings.MEDIA_ROOT, str(last_file.xml_file))
    pain_version = get_pain_version_from_xml(xml_file_path)
    return render(request, 'core/upload_success.html', {
        'filename': last_file.xml_file.name,
        'is_valid': last_file.is_valid,
        'report': last_file.validation_report,
        'pain_version': pain_version or 'Non détectée',
    })

@login_required
def delete_sepa_file(request, file_id):
    sepa_file = get_object_or_404(SepaFile, id=file_id)
    #supprimer le fichier du disque si présent
    file_path = os.path.join(settings.MEDIA_ROOT, str(sepa_file.xml_file))
    if os.path.exists(file_path):
        os.remove(file_path)
    #supprimer l'entrée de la base
    sepa_file.delete()
    return HttpResponseRedirect(reverse('home'))