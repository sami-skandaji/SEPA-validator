from django import forms
from .models import SepaFile

class SepaFileUploadForm(forms.ModelForm):
    class Meta:
        model = SepaFile
        fields = ['xml_file']
    
    def clean_xml_fil(self):
        file = self.cleaned_data['xml_file']
        if not file.name.endswith('.xml'):
            raise forms.ValidationError("Le fichier doit avoir l'extension .xml")
        return file
