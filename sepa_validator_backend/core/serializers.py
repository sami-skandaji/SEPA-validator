from rest_framework import serializers
from .models import SepaFile

class SepaFileUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = SepaFile
        fields = [ 'id', 'xml_file', 'uploaded_at', 'is_valid']

    def validate_xml_file(self, value):
        if not value.name.lower().endswith('.xml'):
            raise serializers.ValidationError("Seuls les fichiers XML sont autorisés. ")
        if value.content_type != 'text/xml' and value.content_type != 'application/xml':
            raise serializers.ValidationError("type de contenu invalide. fichier XML requis. ")
        
        return value

class SepaValidationResultSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    filename = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()
    uploaded_at = serializers.SerializerMethodField()
    version = serializers.SerializerMethodField()

    class Meta:
        model = SepaFile
        fields = ['id', 'filename', 'download_url', 'uploaded_at', 'is_valid', 'version', 'validation_report']

    def get_filename(self, obj):
        return obj.xml_file.name.split('/')[-1]

    def get_download_url(self, obj):
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.xml_file.url)
        return obj.xml_file.url
    
    def get_uploaded_at(self, obj):
        return obj.uploaded_at.strftime("%d/%m/%Y %H:%M")
    
    def get_version(self, obj):
        return obj.version if obj.version else "-"