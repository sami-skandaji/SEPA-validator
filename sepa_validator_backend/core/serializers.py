from rest_framework import serializers
from .models import SepaFile, Notification
from core.utils.sepa_extractor import extract_sepa_details

class SepaFileUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = SepaFile
        fields = ['id', 'xml_file', 'uploaded_at', 'is_valid']

    def validate_xml_file(self, value):
        if not value.name.lower().endswith('.xml'):
            raise serializers.ValidationError("Seuls les fichiers XML sont autorisés.")
        if value.content_type not in ['text/xml', 'application/xml']:
            raise serializers.ValidationError("Type de contenu invalide. Fichier XML requis.")
        return value


class SepaValidationResultSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    filename = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()
    uploaded_at = serializers.DateTimeField()
    version = serializers.SerializerMethodField()
    parsed_data = serializers.SerializerMethodField()  # 🔧 Ajout ici

    class Meta:
        model = SepaFile
        fields = [
            'id', 'filename', 'download_url', 'uploaded_at',
            'is_valid', 'version', 'validation_report', 'parsed_data'
        ]

    def get_filename(self, obj):
        return obj.xml_file.name.split('/')[-1]

    def get_download_url(self, obj):
        request = self.context.get("request")
        if not request:
            return None
        if obj.xml_file and hasattr(obj.xml_file, 'url'):
            return request.build_absolute_uri(obj.xml_file.url)
        return None

    def get_version(self, obj):
        return obj.version if obj.version else "-"

    def get_parsed_data(self, obj):
        if self.context.get("include_parsed", False):
            try:
                return extract_sepa_details(obj.xml_file.path)
            except Exception as e:
                return {"error": f"Erreur lors de l'extraction : {str(e)}"}
        return None
    
class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id',
            'title',
            'message',
            'level',
            'is_read',
            'created_at',
            'related_file'
        ]
    
class SepaFileAdminSerializer(serializers.ModelSerializer):
    filename = serializers.SerializerMethodField()
    owner_email = serializers.SerializerMethodField()

    class Meta:
        model = SepaFile
        fields =[
            "id", "filename", "xml_file", "uploaded_at", "owner", "owner_email", "version", "is_valid", "validation_report", "extracted_data"
        ]
        read_only_fields = ["uploaded_at", "filename", "owner_email"]
    
    def get_filename(self, obj):
        return obj.xml_file.name.split("/")[-1]
    
    def get_owner_email(self, obj):
        return getattr(obj.owner, "email", None)
    
