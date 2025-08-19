from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db import transaction

from accounts.permissions import IsAdmin
from .models import SepaFile, Notification
from .serializers import SepaFileAdminSerializer

from .validators.validate_sepa_professionally import validate_xml_professionally
from .utils.sepa_extractor import extract_sepa_details

class SepaFileModerationList(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = SepaFileAdminSerializer
    queryset = SepaFile.objects.select_related("owner").all().order_by("-uploaded_at")


class SepaFileModerationDetail(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = SepaFileAdminSerializer
    queryset = SepaFile.objects.select_related("owner").all()


class SepaFileRevalidate(APIView):
    """
    POST body (optionnel):
    {
      "mode": "full" | "fast",   # si tes fonctions supportent des options
      "notify": true             # default true
    }
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        obj = get_object_or_404(SepaFile, pk=pk)
        mode = request.data.get("mode", "full")
        notify = request.data.get("notify", True)

        # Pour éviter des incohérences en cas d'erreur au milieu
        with transaction.atomic():
            # ⚙️ Validation pro (ta vraie fonction)
            report = validate_xml_professionally(obj.xml_file.path, mode=mode) \
                     if "mode" in validate_xml_professionally.__code__.co_varnames \
                     else validate_xml_professionally(obj.xml_file.path)

            # 🧾 Extraction (ta vraie fonction)
            extracted = extract_sepa_details(obj.xml_file.path)

            # 🟢 Statut global
            is_valid = bool(report and report.get("is_valid", False))

            # 📝 Audit: on logge l’action admin dans le report
            report = report or {}
            report.setdefault("_admin_actions", []).append({
                "action": "revalidate",
                "by": request.user.username,
                "mode": mode,
            })

            # 💾 Sauvegarde
            obj.validation_report = report
            obj.extracted_data = extracted
            obj.is_valid = is_valid
            obj.save(update_fields=["validation_report", "extracted_data", "is_valid"])

            # 🔔 Notification au propriétaire (si défini)
            if notify and obj.owner_id:
                Notification.objects.create(
                    user=obj.owner,
                    level="INFO" if is_valid else "WARNING",
                    title="Revalidation effectuée",
                    message=f"Votre fichier '{obj.xml_file.name}' a été revalidé. Résultat: {'VALIDE' if is_valid else 'INVALIDE'}.",
                    related_file=obj,
                )

        return Response({
            "detail": "Revalidation effectuée.",
            "is_valid": is_valid,
            "report_summary": {
                "xsd_issues": len(report.get("xsd", [])) if report else 0,
                "business_issues": len(report.get("business_rules", [])) if report else 0,
            }
        }, status=status.HTTP_200_OK)


class SepaFileSetValidity(APIView):
    """
    POST body:
    { "is_valid": true/false, "reason": "..." , "notify": true }
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        obj = get_object_or_404(SepaFile, pk=pk)
        if "is_valid" not in request.data:
            return Response({"detail": "is_valid manquant."}, status=status.HTTP_400_BAD_REQUEST)
        is_valid = bool(request.data.get("is_valid"))
        reason = request.data.get("reason")
        notify = request.data.get("notify", True)

        with transaction.atomic():
            report = obj.validation_report or {}
            report.setdefault("_admin_overrides", []).append({
                "action": "set_validity",
                "value": is_valid,
                "reason": reason,
                "by": request.user.username,
            })
            obj.validation_report = report
            obj.is_valid = is_valid
            obj.save(update_fields=["validation_report", "is_valid"])

            if notify and obj.owner_id:
                Notification.objects.create(
                    user=obj.owner,
                    level="INFO",
                    title="Statut mis à jour par un administrateur",
                    message=f"Votre fichier '{obj.xml_file.name}' a été marqué comme {'VALIDE' if is_valid else 'INVALIDE'}."
                            + (f" Raison: {reason}" if reason else ""),
                    related_file=obj,
                )

        return Response({"detail": "Statut mis à jour.", "is_valid": obj.is_valid}, status=status.HTTP_200_OK)