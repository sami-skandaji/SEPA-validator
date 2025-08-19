from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
import io

def generate_pdf_report(sepa_file):
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)

    p.setFont("Helvetica-Bold", 16)
    p.drawString(50, 800, "Rapport de validation SEPA")

    p.setFont("Helvetica", 12)
    p.drawString(50, 770, f"Nom du fichier : {sepa_file.xml_file.name}")
    p.drawString(50, 750, f"Date d'upload : {sepa_file.uploaded_at.strftime('%d%m%Y %H:%M')}")
    p.drawString(50, 730, f"Valide : {'Oui' if sepa_file.is_valid else 'Non'}")

    p.drawString(50, 700, "Résumé du rapport :")
    y = 680
    if sepa_file.validation_report:
        for entry in sepa_file.validation_report:
            line = f"- {entry.get('code', 'N/A')}: {entry.get('message', 'Pas de message')}"
            if y < 100:
                p.showPage()
                y = 800
            p.drawString(60, y, line)
            y -= 20
    else: 
        p.drawString(60, y, "Aucune erreur détectée.")

    p.showPage()
    p.save()
    buffer.seek(0)
    return buffer