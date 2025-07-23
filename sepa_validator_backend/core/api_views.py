import os
import tempfile
import requests
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework import status, generics, filters as drf_filters
from rest_framework.generics import RetrieveAPIView, DestroyAPIView, RetrieveUpdateAPIView

from django_filters.rest_framework import DjangoFilterBackend
from .models import SepaFile
from .forms import SepaFileUploadForm
from .validators.validate_sepa_professionally import validate_xml_professionally, detect_sepa_type_and_version
from .serializers import SepaValidationResultSerializer, SepaFileUploadSerializer
from .filters import SepaFileFilter
from rest_framework.filters import OrderingFilter
from django.contrib.auth.models import User


# API REST Register
class RegisterAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password1 = request.data.get("password1")
        password2 = request.data.get("password2")

        if not username or not password1 or not password2:
            return Response({"error": "Tous les champs sont requis."}, status=status.HTTP_400_BAD_REQUEST)

        if password1 != password2:
            return Response({"error": "Les mots de passe ne correspondent pas."}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({"error": "Ce nom d'utilisateur existe déjà."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, password=password1)
        return Response({"message": "Inscription réussie."}, status=status.HTTP_201_CREATED)


# API REST Login
class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)
        return Response({'token': token.key})
    
#afficher le nom du User connecté
class UserInfoAPIView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        return Response({
            "username": request.user.username,
            "email": request.user.email,
        })
    

# Upload d’un fichier XML
class SepaUploadAPIView(APIView):
    parser_classes = [MultiPartParser]
    permission_classes = [IsAuthenticated]

    def post(self, request, format=None):
        form = SepaFileUploadForm(request.data, request.FILES)
        if form.is_valid():
            sepa_file = form.save(commit=False)
            sepa_file.uploaded_by = request.user
            sepa_file.save()

            result = validate_xml_professionally(sepa_file.xml_file.path)
            report = []

            # Extraire la version
            import xml.etree.ElementTree as ET
            try:
                tree = ET.parse(sepa_file.xml_file.path)
                root = tree.getroot()
                namespace_uri = root.tag[root.tag.find("{") + 1:root.tag.find("}")]
                version = namespace_uri.split(":")[-1]  # Extrait "pain.001.001.03"
                sepa_file.version = version
            except Exception as e:
                sepa_file.version = "inconnue"

            # Validation XSD
            if result["xsd_valid"]:
                report.append("✅ Validation XSD réussie.")
            else:
                report.append(f"❌ {result['xsd_message']}")

            report.append("\n🔍 Règles métier :")
            for rule in result["business_checks"]:
                report.append(rule)

            sepa_file.is_valid = result["xsd_valid"] and all("❌" not in r for r in result["business_checks"])
            sepa_file.validation_report = "\n".join(report)
            sepa_file.save()

            serializer = SepaValidationResultSerializer(sepa_file)
            return Response(serializer.data, status=200)

        return Response(form.errors, status=status.HTTP_400_BAD_REQUEST)

# Liste des fichiers SEPA avec filtres
class SepaValidationResultListAPIView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SepaValidationResultSerializer
    filter_backends = [DjangoFilterBackend, drf_filters.SearchFilter, OrderingFilter]
    filterset_class = SepaFileFilter
    search_fields = ['xml_file']
    ordering_fields = ['uploaded_at', 'xml_file', 'is_valid', 'version']
    ordering = ['-uploaded_at']

    def get_queryset(self):
        queryset = SepaFile.objects.filter(uploaded_by=self.request.user).order_by('-uploaded_at')
        is_valid = self.request.query_params.get('is_valid')
        filename = self.request.query_params.get('filename')

        if is_valid is not None:
            if is_valid.lower() in ['true', '1']:
                queryset = queryset.filter(is_valid=True)
            elif is_valid.lower() in ['false', '0']:
                queryset = queryset.filter(is_valid=False)

        if filename:
            queryset = queryset.filter(xml_file__icontains=filename)

        return queryset


# Détail d’un fichier
class SepaValidationDetailAPIView(RetrieveAPIView):
    queryset = SepaFile.objects.all()
    serializer_class = SepaValidationResultSerializer


# Suppression d’un fichier
class SepaValidationDeleteAPIView(DestroyAPIView):
    queryset = SepaFile.objects.all()

    def delete(self, request, *args, **kwargs):
        instance = self.get_object()

        if instance.xml_file:
            instance.xml_file.delete(save=False)

        instance.delete()
        return Response({"detail": "Fichier supprimé avec succès."}, status=status.HTTP_204_NO_CONTENT)


# Mise à jour d’un fichier
class SepaFileUpdateAPIView(RetrieveUpdateAPIView):
    queryset = SepaFile.objects.all()
    serializer_class = SepaFileUploadSerializer
    lookup_field = 'id'

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        instance = self.get_object()

        #  Re-analyse du fichier XML pour extraire la version
        try:
            with open(instance.xml_file.path, 'r', encoding='utf-8') as f:
                content = f.read().lower()
                if 'pain.001' in content:
                    instance.version = 'PAIN.001'
                elif 'pain.002' in content:
                    instance.version = 'PAIN.002'
                elif 'pain.008' in content:
                    instance.version = 'PAIN.008'
                else:
                    instance.version = 'Inconnu'
        except Exception as e:
            print(f"Erreur lors de l'extraction de version : {e}")

        # 🔁 Revalider le fichier au cas où
        result = validate_xml_professionally(instance.xml_file.path)
        instance.is_valid = result["xsd_valid"] and all("❌" not in r for r in result["business_checks"])
        instance.validation_report = "\n".join(result["business_checks"])
        instance.save()

        return Response(self.get_serializer(instance).data)

# Résumé global
class SepaSummaryView(APIView):
    def get(self, request):
        total = SepaFile.objects.count()
        valid = SepaFile.objects.filter(is_valid=True).count()
        invalid = total - valid
        last_uploaded = SepaFile.objects.order_by('-uploaded_at').first()

        return Response({
            "total_files": total,
            "valid_files": valid,
            "invalid_files": invalid,
            "last_uploaded": last_uploaded.uploaded_at.strftime("%d%m%Y %H:%M") if last_uploaded else None
        })

# mise a jour versions
class UpdateSepaVersionsAPIView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        updated = 0
        failed = []

        for sepa_file in SepaFile.objects.all():
            try:
                version = detect_sepa_type_and_version(sepa_file.xml_file.path)
                if sepa_file.version != version:
                    sepa_file.version = version
                    sepa_file.save()
                    updated += 1
            except Exception as e:
                failed.append({
                    "id": sepa_file.id,
                    "filename": sepa_file.xml_file.name,
                    "error": str(e),
                })

        return Response({
            "updated": updated,
            "failed": failed,
        })

class ValidateFromURLAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, format=None):
        url = request.data.get("url")
        if not url:
            return Response({"error": "URL manquante."}, status=400)

        try:
            response = requests.get(url)
            if response.status_code != 200:
                return Response({"error": "Impossible de télécharger le fichier."}, status=400)

            if "xml" not in response.headers.get("Content-Type", ""):
                return Response({"error": "Le fichier téléchargé n'est pas un XML."}, status=400)

            #  Sauvegarde temporaire
            with tempfile.NamedTemporaryFile(delete=False, suffix=".xml") as tmp_file:
                tmp_file.write(response.content)
                tmp_path = tmp_file.name

            # ✅ Validation
            result = validate_xml_professionally(tmp_path)
            report = []

            if result["xsd_valid"]:
                report.append("✅ Validation XSD réussie.")
            else:
                report.append(f"❌ {result['xsd_message']}")

            report.append("\n🔍 Règles métier :")
            for rule in result["business_checks"]:
                report.append(rule)

            #  Enregistrement en base
            sepa_file = SepaFile.objects.create(
                uploaded_by=request.user,
                xml_file=None,
                is_valid=result["xsd_valid"] and all("❌" not in r for r in result["business_checks"]),
                validation_report="\n".join(report),
                version=result.get("version", "")
            )

            serializer = SepaValidationResultSerializer(sepa_file, context={"request": request})
            return Response(serializer.data, status=200)

        except Exception as e:
            return Response({"error": f"Erreur : {str(e)}"}, status=500)