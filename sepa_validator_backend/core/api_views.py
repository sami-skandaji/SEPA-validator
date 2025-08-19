import os
import tempfile
import requests

from rest_framework import status, generics, filters as drf_filters
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.generics import RetrieveAPIView, DestroyAPIView, RetrieveUpdateAPIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.filters import OrderingFilter

from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from django.db.models import Count, Avg, BooleanField, ExpressionWrapper, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.utils.timezone import make_aware
from datetime import timedelta, datetime, date
from .models import SepaFile, Notification
from .forms import SepaFileUploadForm
from .validators.validate_sepa_professionally import validate_xml_professionally, detect_sepa_type_and_version
from core.utils.sepa_extractor import extract_sepa_details
from .serializers import SepaValidationResultSerializer, SepaFileUploadSerializer, NotificationSerializer
from .filters import SepaFileFilter
from django.contrib.auth import get_user_model
from django.contrib.auth.models import User
import xml.etree.ElementTree as ET

import zipfile
from django.core.files import File

from core.utils.pdf_generator import generate_pdf_report
from core.utils.email_utils import send_validation_email
from core.utils.notifications import notify_user


def _parse_iso_date(s: str) -> date | None:
    try:
        return date.fromisoformat(s)
    except Exception:
        return None

User = get_user_model()

class RegisterAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data

        username    = (data.get("username") or "").strip()
        email       = (data.get("email") or "").strip().lower()
        first_name  = (data.get("first_name") or "").strip()
        last_name   = (data.get("last_name") or "").strip()

        # Supporte password/password_confirm OU password1/password2 OU confirmPassword
        password  = data.get("password") or data.get("password1")
        password2 = data.get("confirmPassword") or data.get("password_confirm") or data.get("password2")

        if not username or not email or not password or not password2:
            return Response({"error": "Tous les champs obligatoires ne sont pas fournis."},
                            status=status.HTTP_400_BAD_REQUEST)

        if password != password2:
            return Response({"error": "Les mots de passe ne correspondent pas."},
                            status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username__iexact=username).exists():
            return Response({"error": "Ce nom d'utilisateur existe déjà."}, status=status.HTTP_400_BAD_REQUEST)

        if hasattr(User, "email") and User.objects.filter(email__iexact=email).exists():
            return Response({"error": "Un compte avec cet e-mail existe déjà."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
        )

        return Response({
            "message": "Inscription réussie.",
            "user": {
                "id": user.pk,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
            },
        }, status=status.HTTP_201_CREATED)


class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)
        return Response({'token': token.key})


class UserInfoAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "username": request.user.username,
            "email": request.user.email,
        })


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
            print("Business checks:", result["business_checks"])
            structured_report = (
                (result["xsd_message"]["errors"] if isinstance(result["xsd_message"], dict) and not result["xsd_valid"] else []) +
                result["basic_checks"] +
                result["business_checks"]
            )

            try:
                import xml.etree.ElementTree as ET
                tree = ET.parse(sepa_file.xml_file.path)
                root = tree.getroot()
                namespace_uri = root.tag[root.tag.find("{") + 1:root.tag.find("}")]
                version = namespace_uri.split(":")[-1]
                sepa_file.version = version
            except Exception as e:
                sepa_file.version = "inconnue"

            sepa_file.validation_report = structured_report
            sepa_file.is_valid = all(
                (not isinstance(item, dict) or item.get("type") != "error")
                for item in structured_report
            )
            try:
                extracted = extract_sepa_details(sepa_file.xml_file.path)
                sepa_file.extracted_data = extracted
            except Exception as e:
                print(f"Erreur lors de l'extraction des données : {e}")

            sepa_file.save()

            try:
                pdf_buffer = generate_pdf_report(sepa_file)
                send_validation_email(
                    user_email=sepa_file.uploaded_by.email,
                    sepa_file = sepa_file,
                    pdf_buffer = pdf_buffer
                )
                notify_user(
                    user=sepa_file.uploaded_by,
                    message="Le rapport SEPA vous a été envoyé par email. ",
                    level='INFO',
                    related_file=sepa_file
                )
            except Exception as e:
                print(f"Erreur lors de l'envoi du rapport pdf : {e}")


            serializer = SepaValidationResultSerializer(sepa_file, context={"request": request})
            return Response(serializer.data, status=200)

        return Response(form.errors, status=status.HTTP_400_BAD_REQUEST)


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


class SepaValidationDetailAPIView(RetrieveAPIView):
    queryset = SepaFile.objects.all()
    serializer_class = SepaValidationResultSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        sepa_details = extract_sepa_details(instance.xml_file.path)
        response_data = serializer.data
        response_data["sepa_details"] = sepa_details
        return Response(response_data)


class SepaValidationDeleteAPIView(DestroyAPIView):
    queryset = SepaFile.objects.all()

    def delete(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.xml_file:
            instance.xml_file.delete(save=False)
        instance.delete()
        return Response({"detail": "Fichier supprimé avec succès."}, status=status.HTTP_204_NO_CONTENT)


class SepaFileUpdateAPIView(RetrieveUpdateAPIView):
    queryset = SepaFile.objects.all()
    serializer_class = SepaFileUploadSerializer
    lookup_field = 'id'

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        instance = self.get_object()

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

        result = validate_xml_professionally(instance.xml_file.path)
        instance.is_valid = result["xsd_valid"] and all("❌" not in str(r) for r in result["business_checks"])
        instance.validation_report = result["business_checks"]
        instance.save()
        return Response(self.get_serializer(instance).data)


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


class UpdateSepaVersionsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        files = SepaFile.objects.all()
        updated = 0

        for f in files:
            try:
                version = detect_sepa_type_and_version(f.xml_file.path)
                f.version = version
                f.save()
                updated += 1
            except Exception as e:
                continue

        return Response({
            "updated_files": updated,
            "total_files": files.count()
        })


class ValidateFromURLAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        url = request.data.get("url")
        if not url:
            return Response({"error": "URL non fournie."}, status=400)

        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".xml") as tmp:
                response = requests.get(url)
                tmp.write(response.content)
                tmp_path = tmp.name

            result = validate_xml_professionally(tmp_path)
            structured_report = (
                (result["xsd_message"]["errors"] if isinstance(result["xsd_message"], dict) and not result["xsd_valid"] else []) +
                result["basic_checks"] +
                result["business_checks"]
            )
            return Response({
                "sepa_version": result["sepa_version"],
                "xsd_valid": result["xsd_valid"],
                "report": structured_report
            })

        except Exception as e:
            return Response({"error": str(e)}, status=500)


class UploadFromURLAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        url = request.data.get("url")
        if not url:
            return Response({"error": "URL manquante. "}, status=400)
        
        try:
            response = requests.get(url)
            response.raise_for_status()
        except requests.RequestException:
            return Response({"error": "Impossible de récupérer le fichier."}, status=400)
        
        filename = os.path.basename(url)
        if not filename.endswith(".xml"):
            return Response({"error": "L'URL ne pointe pas vers un fichier XML. "}, status=400)
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".xml") as tmp:
            tmp.write(response.content)
            tmp_path = tmp.name

        try:
            from django.core.files import File
            with open(tmp_path, 'rb') as f:
                sepa_file = SepaFile.objects.create(
                    uploaded_by=request.user,
                    xml_file=File(f, name=filename)
                )

            result = validate_xml_professionally(sepa_file.xml_file.path)
            structured_report = (
                (result["xsd_message"]["errors"] if isinstance(result["xsd_message"], dict) and not result["xsd_valid"] else []) + 
                result["basic_checks"] + 
                result["business_checks"]
            )

            sepa_file.validation_report = structured_report
            sepa_file.is_valid = all(
                (not isinstance(item, dict) or item.get("type") != "error")
                for item in structured_report
            )

            try:
                extracted = extract_sepa_details(sepa_file.xml_file.path)
                sepa_file.extracted_data = extracted
            except Exception as e:
                print(f"Erreur lors de l'extraction des données : {e}")

            try:
                import xml.etree.ElementTree as ET
                tree = ET.parse(sepa_file.xml_file.path)
                root = tree.getroot()
                namespace_uri = root.tag[root.tag.find("{") + 1:root.tag.find("}")]
                version = namespace_uri.split(":")[-1]
                sepa_file.version = version
            except Exception:
                sepa_file.version = "inconnue"

            sepa_file.save()
            try:
                pdf_buffer = generate_pdf_report(sepa_file)
                send_validation_email(
                    user_email=sepa_file.uploaded_by.email,
                    sepa_file=sepa_file,
                    pdf_buffer=pdf_buffer
                )
                notify_user(
                    user=sepa_file.uploaded_by,
                    message="Le rapport SEPA vous a été envoyé par email.",
                    level='INFO',
                    related_file=sepa_file
                )
            except Exception as e:
                print(f"Erreur lors de l'envoi du rapport PDF ( via URL ) : {e}")

            
            serializer = SepaValidationResultSerializer(sepa_file, context={"request": request})
            return Response(serializer.data, status=201)
        
        finally:
            os.remove(tmp_path)

class UploadZipFile(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        uploaded_file = request.FILES.get("zip_file")
        if not uploaded_file or not uploaded_file.name.endswith(".zip"):
            return Response({"error": "Fichier ZIP invalide."}, status=status.HTTP_400_BAD_REQUEST)

        with tempfile.TemporaryDirectory() as tmp_dir:
            zip_path = os.path.join(tmp_dir, uploaded_file.name)
            with open(zip_path, "wb") as f:
                for chunk in uploaded_file.chunks():
                    f.write(chunk)

            try:
                with zipfile.ZipFile(zip_path, "r") as zip_ref:
                    zip_ref.extractall(tmp_dir)
            except zipfile.BadZipFile:
                return Response({"error": "Fichier ZIP corrompu."}, status=status.HTTP_400_BAD_REQUEST)

            response_data = []

            for filename in os.listdir(tmp_dir):
                if not filename.endswith(".xml"):
                    continue

                file_path = os.path.join(tmp_dir, filename)

                with open(file_path, "rb") as f:
                    sepa_file = SepaFile.objects.create(
                        uploaded_by=request.user,
                        xml_file=File(f, name=filename)
                    )

                    try:
                        result = validate_xml_professionally(sepa_file.xml_file.path)
                        structured_report = (
                            (result["xsd_message"]["errors"] if isinstance(result["xsd_message"], dict) and not result["xsd_valid"] else []) +
                            result["basic_checks"] +
                            result["business_checks"]
                        )

                        sepa_file.validation_report = structured_report
                        sepa_file.is_valid = all(
                            (not isinstance(item, dict) or item.get("type") != "error")
                            for item in structured_report
                        )

                        try:
                            extracted = extract_sepa_details(sepa_file.xml_file.path)
                            sepa_file.extracted_data = extracted
                        except Exception as e:
                            print(f"Erreur d'extraction : {e}")

                        try:
                            tree = ET.parse(sepa_file.xml_file.path)
                            root = tree.getroot()
                            namespace_uri = root.tag[root.tag.find("{") + 1:root.tag.find("}")]
                            version = namespace_uri.split(":")[-1]
                            sepa_file.version = version
                        except Exception:
                            sepa_file.version = "inconnue"

                        sepa_file.save()
                        
                        try:
                            pdf_buffer = generate_pdf_report(sepa_file)
                            send_validation_email(
                                user_email=sepa_file.uploaded_by.email,
                                sepa_file=sepa_file,
                                pdf_buffer=pdf_buffer
                            )
                            notify_user(
                                user=sepa_file.uploaded_by,
                                message=f"Le rapport SEPA pour le fichier '{sepa_file.xml_file.name}' (ZIP) a été envoyé par email.",
                                level="INFO",
                                related_file=sepa_file
                            )
                        except Exception as e:
                            print(f"Erreur lors de l’envoi du rapport PDF pour {sepa_file.xml_file.name} : {e}")


                        response_data.append({
                            "id": sepa_file.id,
                            "filename": sepa_file.xml_file.name,
                            "is_valid": sepa_file.is_valid
                        })

                    except Exception as e:
                        print(f"Erreur pendant la validation d’un fichier XML : {e}")
                        continue

            return Response({"files": response_data}, status=status.HTTP_201_CREATED)
        
class NotificationListAPIView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')
    

class MarkNotificationAsReadAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            notif = Notification.objects.get(pk=pk, user=request.user)
            notif.is_read = True
            notif.save()
            return Response({"status": "ok"}, status=status.HTTP_200_OK)
        except Notification.DoesNotExist:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        

class SepaStatisticsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        start_date = _parse_iso_date(request.query_params.get("start_date", ""))
        end_date = _parse_iso_date(request.query_params.get("end_date", ""))

        qs = SepaFile.objects.filter(uploaded_by=user)

        if start_date and end_date:
            if end_date < start_date:
                start_date, end_date = end_date, start_date
            # filtre inclusif sur la date
            qs = qs.filter(uploaded_at__date__gte=start_date, uploaded_at__date__lte=end_date)

        total_files = qs.count()
        valid_files = qs.filter(is_valid=True).count()
        invalid_files = qs.filter(is_valid=False).count()

        # moyenne transactions depuis extracted_data
        tx_counts = []
        for f in qs.only("extracted_data"):
            n = 0
            data = f.extracted_data or {}
            if isinstance(data.get("transactions"), list):
                n = len(data["transactions"])
            elif isinstance(data.get("transactions_count"), int):
                n = data["transactions_count"]
            tx_counts.append(int(n))
        avg_tx = round(sum(tx_counts)/len(tx_counts), 2) if tx_counts else 0.0
        success_rate = round((valid_files/total_files)*100, 2) if total_files else 0.0

        return Response({
            "total_files": total_files,
            "valid_files": valid_files,
            "invalid_files": invalid_files,
            "avg_transactions_per_file": avg_tx,
            "success_rate": success_rate,
        })
    
class StatisticsTimeSeriesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        start_date = _parse_iso_date(request.query_params.get("start_date", ""))
        end_date = _parse_iso_date(request.query_params.get("end_date", ""))
        days = request.query_params.get("days")

        if start_date and end_date:
            if end_date < start_date:
                start_date, end_date = end_date, start_date
        else:
            # fallback sur days (par défaut 30)
            try:
                days = int(days) if days is not None else 30
            except ValueError:
                days = 30
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=days-1)

        qs = (
            SepaFile.objects
            .filter(uploaded_by=user, uploaded_at__date__gte=start_date, uploaded_at__date__lte=end_date)
            .annotate(day=TruncDate("uploaded_at"))
            .values("day")
            .annotate(
                valid=Count("id", filter=Q(is_valid=True)),
                invalid=Count("id", filter=Q(is_valid=False)),
            )
            .order_by("day")
        )

        points = [
            {"date": row["day"].isoformat(), "valid": row["valid"], "invalid": row["invalid"]}
            for row in qs
        ]

        return Response({
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "points": points
        })

class MeView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        p = getattr(request.user, "profile", None)
        return Response ({
            "id": request.user.id,
            "email": request.user.email,
            "first_name": request.user.first_name,
            "last_name": request.user.last_name,
            "role": getattr(p, "role", "USER"),
        })