from lxml import etree
import os
import re
from core.validators.validate_xsd import validate_with_xsd
from core.validators.validate_sepa_professionally import detect_sepa_type_and_version

XSD_DIRECTORY = os.path.join(os.path.dirname(__file__), "schemas")

def extract_sepa_details(file_path):
    try:
        tree = etree.parse(file_path)
        root = tree.getroot()
        nsmap = root.nsmap
        ns = {'ns': nsmap.get(None)}

        data = {}
        version = detect_sepa_type_and_version(file_path)
        data["version"] = version

        # Validation XSD
        xsd_path = os.path.join(XSD_DIRECTORY, f"{version}.xsd")
        if os.path.exists(xsd_path):
            xsd_result = validate_with_xsd(file_path, xsd_path)
        else:
            xsd_result = {
                "valid": False,
                "errors": [f"Fichier XSD introuvable pour la version {version}."]
            }
        data["xsd_validation"] = xsd_result

        # En-tête
        data['entete'] = {
            "reference_remise": root.findtext(".//ns:MsgId", default="", namespaces=ns),
            "date_creation": root.findtext(".//ns:CreDtTm", default="", namespaces=ns),
            "nombre_transactions": root.findtext(".//ns:NbOfTxs", default="", namespaces=ns),
            "montant_total": root.findtext(".//ns:CtrlSum", default="", namespaces=ns),
        }

        # Paiements
        paiements = []
        for pmt in root.findall(".//ns:PmtInf", namespaces=ns):
            paiements.append({
                "id": pmt.findtext("ns:PmtInfId", default="", namespaces=ns),
                "methode": pmt.findtext("ns:PmtMtd", default="", namespaces=ns),
                "service_level": pmt.findtext(".//ns:SvcLvl/ns:Cd", default="", namespaces=ns),
                "instrument_local": pmt.findtext("ns:LclInstrm/ns:Cd", default="", namespaces=ns),
                "type_sequence": pmt.findtext("ns:SeqTp", default="", namespaces=ns),
                "date_execution": pmt.findtext("ns:ReqdExctnDt", default="", namespaces=ns) or
                                  pmt.findtext("ns:ReqdColltnDt", default="", namespaces=ns),
            })
        data['paiements'] = paiements

        # Type de transaction
        transaction_tag = None
        if root.xpath(".//ns:CdtTrfTxInf", namespaces=ns):
            transaction_tag = "CdtTrfTxInf"
        elif root.xpath(".//ns:DrctDbtTxInf", namespaces=ns):
            transaction_tag = "DrctDbtTxInf"

        # Transactions
        transactions = []
        mandats = []

        if transaction_tag:
            for tx in root.findall(f".//ns:{transaction_tag}", namespaces=ns):
                nom = tx.findtext(".//ns:Nm", default="", namespaces=ns)
                iban = tx.findtext(".//ns:IBAN", default="", namespaces=ns)
                reference = tx.findtext(".//ns:EndToEndId", default="", namespaces=ns)
                montant = tx.findtext(".//ns:InstdAmt", default="", namespaces=ns)

                # Mandat
                mandate = {}
                if transaction_tag == "DrctDbtTxInf":
                    mandate_info = tx.find(".//ns:MndtRltdInf", namespaces=ns)
                    if mandate_info is not None:
                        mandate = {
                            "mandate_id": mandate_info.findtext("ns:MndtId", default="", namespaces=ns),
                            "signature_date": mandate_info.findtext("ns:DtOfSgntr", default="", namespaces=ns),
                            "amendment": mandate_info.findtext("ns:AmdmntInd", default="false", namespaces=ns).lower() == "true"
                        }
                        mandats.append(mandate)

                # Warnings
                warnings = []
                if len(reference) > 35:
                    warnings.append("Référence (EndToEndId) trop longue (max 35 caractères).")
                if len(iban) > 34:
                    warnings.append("IBAN trop long (max 34 caractères).")
                try:
                    float(montant)
                except (ValueError, TypeError):
                    warnings.append("Montant invalide.")
                if "signature_date" in mandate and mandate["signature_date"] and not re.match(r"^\d{4}-\d{2}-\d{2}$", mandate["signature_date"]):
                    warnings.append("Format de date du mandat invalide (attendu : YYYY-MM-DD).")

                transactions.append({
                    "nom": nom,
                    "iban": iban,
                    "reference": reference,
                    "montant": montant,
                    "mandate": mandate,
                    "warnings": warnings
                })

        data['transactions'] = transactions
        data['mandats'] = mandats  # Toujours présent, même vide
        return data

    except Exception as e:
        print(f"❌ Erreur lors de l’extraction SEPA : {e}")
        return {
            "error": str(e),
            "entete": {},
            "paiements": [],
            "transactions": [],
            "mandats": [],
            "xsd_validation": {
                "valid": False,
                "errors": [str(e)]
            }
        }
