import os
import re
from lxml import etree
from core.sepa_business_rules import run_business_checks
from .validate_xsd import validate_with_xsd
from django.conf import settings

# Utilise BASE_DIR de settings si défini
BASE_DIR = getattr(settings, "BASE_DIR", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
XSD_DIRECTORY = os.path.join(BASE_DIR, "core", "schemas")

def detect_sepa_type_and_version(xml_path):
    try:
        tree = etree.parse(xml_path)
        root = tree.getroot()

        # Cherche tous les namespaces
        namespaces = root.nsmap.values()
        print("🔍 Tous les namespaces trouvés :", namespaces)

        version = None
        for ns in namespaces:
            if ns and "pain" in ns:
                match = re.search(r"pain\.\d+\.\d+\.\d+", ns)
                if match:
                    version = match.group(0)
                    break

        if not version:
            raise ValueError("Impossible de détecter la version PAIN dans le namespace.")

        print("✅ Version SEPA détectée :", version)
        return version

    except Exception as e:
        raise ValueError(f"Erreur lors de la détection du type SEPA : {str(e)}")


def find_matching_xsd_file(sepa_version):
    normalized = sepa_version.replace(".", "").lower()
    print("📂 XSD_DIRECTORY utilisé :", XSD_DIRECTORY)

    try:
        files = os.listdir(XSD_DIRECTORY)
        print("📄 Fichiers présents :", files)

        for file in files:
            if file.endswith(".xsd") and normalized in file.replace(".", "").lower():
                print("✅ Correspondance XSD trouvée :", file)
                return os.path.join(XSD_DIRECTORY, file)

        raise FileNotFoundError(f"Aucun fichier XSD trouvé pour {sepa_version}")

    except FileNotFoundError:
        raise FileNotFoundError(f"Dossier XSD introuvable : {XSD_DIRECTORY}")


def basic_sepa_checks(xml_path):
    results = []
    tree = etree.parse(xml_path)
    root = tree.getroot()
    ns = {'ns': root.nsmap.get(None)}

    # Devise
    invalid_currency_elements = [
        etree.tostring(amt, pretty_print=True).decode()
        for amt in tree.xpath('//ns:InstdAmt', namespaces=ns)
        if amt.get('Ccy') != 'EUR'
    ]
    if invalid_currency_elements:
        results.append("❌ Certaines devises ne sont pas en EUR.")
    else:
        results.append("✅ Toutes les devises sont en EUR.")

    # IBAN
    invalid_ibans = [iban.text.strip() for iban in tree.xpath('//ns:IBAN', namespaces=ns)
                     if not re.match(r'^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$', iban.text.strip())]
    if invalid_ibans:
        results.append("❌ IBANs invalides : " + ", ".join(invalid_ibans))
    else:
        results.append("✅ IBANs valides.")

    # Montants
    invalid_amounts = []
    for amt in tree.xpath('//ns:InstdAmt', namespaces=ns):
        try:
            value = float(amt.text.strip())
            if value <= 0 or value > 9999999999.99:
                invalid_amounts.append(amt.text.strip())
        except:
            invalid_amounts.append(amt.text.strip())
    if invalid_amounts:
        results.append("❌ Montants invalides : " + ", ".join(invalid_amounts))
    else:
        results.append("✅ Montants valides.")

    # BIC
    invalid_bics = [bic.text.strip() for bic in tree.xpath('//ns:BIC', namespaces=ns)
                    if not re.match(r'^[A-Z0-9]{8}([A-Z0-9]{3})?$', bic.text.strip())]
    if invalid_bics:
        results.append("❌ BICs invalides : " + ", ".join(invalid_bics))
    else:
        results.append("✅ BICs valides.")

    # Noms débiteur/créancier
    for role, tag in [('débiteur', 'Dbtr'), ('créancier', 'Cdtr')]:
        missing_names = [etree.tostring(e, pretty_print=True, encoding='unicode')
                         for e in tree.xpath(f'//ns:{tag}', namespaces=ns)
                         if e.find('ns:Nm', namespaces=ns) is None or not e.find('ns:Nm', namespaces=ns).text.strip()]
        if missing_names:
            results.append(f"❌ Noms de {role}s manquants.")
        else:
            results.append(f"✅ Tous les {role}s ont un nom.")

    # Longueur des noms
    long_names = []
    for tag in ['Dbtr', 'Cdtr']:
        for e in tree.xpath(f'//ns:{tag}', namespaces=ns):
            name_elem = e.find('ns:Nm', namespaces=ns)
            if name_elem is not None and len(name_elem.text.strip()) > 70:
                long_names.append(name_elem.text.strip())
    if long_names:
        results.append("❌ Certains noms dépassent 70 caractères : " + ", ".join(long_names))
    else:
        results.append("✅ Tous les noms ≤ 70 caractères.")

    # Paiements
    if not tree.xpath('//ns:CdtTrfTxInf', namespaces=ns) and not tree.xpath('//ns:DrctDbtTxInf', namespaces=ns):
        results.append("❌ Aucun paiement trouvé.")
    else:
        results.append("✅ Paiements trouvés.")

    # InitgPty/Nm
    if not tree.xpath('//ns:InitgPty/ns:Nm', namespaces=ns):
        results.append("❌ InitgPty/Nm manquant.")
    else:
        results.append("✅ InitgPty/Nm présent.")

    return results


def validate_xml_professionally(xml_path):
    try:
        sepa_version = detect_sepa_type_and_version(xml_path)
    except Exception as e:
        return {
            "sepa_version": None,
            "xsd_valid": False,
            "xsd_message": str(e),
            "basic_checks": [],
            "business_checks": []
        }

    try:
        xsd_path = find_matching_xsd_file(sepa_version)
        xsd_valid, xsd_message = validate_with_xsd(xml_path, xsd_path)
    except FileNotFoundError as e:
        return {
            "sepa_version": sepa_version,
            "xsd_valid": False,
            "xsd_message": str(e),
            "basic_checks": [],
            "business_checks": []
        }

    basic_results = basic_sepa_checks(xml_path) if xsd_valid else []
    business_results = run_business_checks(xml_path) if xsd_valid else []

    return {
        "sepa_version": sepa_version,
        "xsd_valid": xsd_valid,
        "xsd_message": xsd_message,
        "basic_checks": basic_results,
        "business_checks": business_results
    }