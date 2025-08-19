from django.core.mail import EmailMessage
import os

def send_validation_email(user_email, sepa_file, pdf_buffer):

    filename = os.path.basename(sepa_file.xml_file.name)
    subject = "Votre rapport SEPA est disponible"
    body = f"""
Bonjour,

Votre fichier SEPA '{filename}' a été traité avec succès.

Vous trouverez en pièce jointe le rapport de validation.

Cordialement,
L'équipe SEPA Validator
"""
    email = EmailMessage(
        subject,
        body,
        to=[user_email]
    )
    email.attach(f"rapport_{sepa_file.id}.pdf", pdf_buffer.read(), 'application/pdf')
    email.send()
