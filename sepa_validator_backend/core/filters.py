import django_filters
from .models import SepaFile

class SepaFileFilter(django_filters.FilterSet):
    filename = django_filters.CharFilter(field_name='xml_file', lookup_expr='icontains')
    version = django_filters.CharFilter(lookup_expr='exact')

    class Meta:
        model = SepaFile
        fields = ['is_valid', 'filename', 'version']
