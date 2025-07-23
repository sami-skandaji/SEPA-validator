from django.core.management.base import BaseCommand
from core.models import SepaFile
from core.validators.validate_sepa_professionally import detect_sepa_type_and_version

class Command(BaseCommand):
    help = 'Met a jour le champ version pour les fichiers SEPA existants'

    def handle(self, *args, **kwargs):
        fichiers = SepaFile.objects.all()
        total = fichiers.count()
        maj_count = 0

        for fichier in fichiers:
            if not fichier.version:
                try:
                    result = detect_sepa_type_and_version(fichier.xml_file.path)
                    if result and result.get("version"):
                        fichier.version = result["version"]
                        fichier.save()
                        maj_count += 1
                        self.stdout.write(self.style.SUCCESS(
                            f" {fichier.xml_file.name} => {result['version']}"
                        ))
                    else:
                        self.stdout.write(self.style.WARNING(
                            f" {fichier.xml_file.name} : version introuvable"
                        ))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(
                        f" Erreur avec {fichier.xml_file.name} : {str(e)}"
                    ))
        self.stdout.write(self.style.SUCCESS(
            f"\n{maj_count} fichiers mis à jour sur {total}. "
        ))

