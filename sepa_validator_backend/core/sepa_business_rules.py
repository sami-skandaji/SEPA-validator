from datetime import datetime
from lxml import etree
from core.utils.messages import make_message

def check_nb_of_txs(root, ns, tx_tag):
    """
    vérifier si le nombre déclaré de virements (NbOfTxs) 
    correspond bien au nombre réel de blocs <CdtTrfTxInf> présents.
    """
    if not tx_tag:
        return make_message("error", "TX_TYPE_UNDEFINED", "NbOfTxs", "Impossible de déterminer le type de transaction.")
    
    try:
        nb = int(root.find('.//ns:NbOfTxs', ns).text)
        txs = root.findall('.//ns:CdtTrfTxInf', ns) + root.findall('.//ns:DrctDbtTxInf', ns)
        if nb == len(txs):
            return make_message("success", "TX_COUNT_OK", "NbOfTxs", f"Nb de transactions ({nb}) OK.")
        else:
            return make_message("error", "TX_COUNT_MISMATCH", "NbOfTxs", f"NbOfTxs ({nb}) ne correspond pas aux transactions réelles ({len(txs)}).")
    except:
        return make_message("error", "TX_COUNT_READ_ERROR", "NbOfTxs", "Erreur lecture NbOfTxs (Nb transactions).")
    
def check_ctrl_sum(root, ns):
    try:
        expected = float(root.find('.//ns:CtrlSum', ns).text)
        amounts = root.findall('.//ns:InstdAmt', ns)
        actual = sum(float(a.text) for a in amounts)
        if abs(actual - expected) < 0.001:
            return make_message("success", "CTRLSUM_OK", "CtrlSum", f"CtrlSum ({expected}) OK.")
        else:
            return make_message("error", "CTRLSUM_MISMATCH", "CtrlSum", f"CtrlSum ({expected}) ≠ somme réelle ({actual}).")
    except:
        return make_message("error", "CTRLSUM_READ_ERROR", "CtrlSum", "Erreur lecture CtrlSum.")

def check_execution_date(root, ns, date_tag):
    
    """vérifier que la date d’exécution demandée 
    (<ReqdExctnDt>) n’est pas passée ."""
    if not date_tag:
        return make_message("error", "DATE_TAG_MISSING", "ReqdExctnDt", "Balise de date inconnue (ni ReqdExctnDt ni ReqdColltnDt trouvée).")
    
    try:
        date_node = root.find('.//ns:ReqdExctnDt', ns) or root.find('.//ns:ReqdColltnDt', ns)
        if date_node is None:
            return make_message("error", "EXEC_DATE_MISSING", date_tag, "Date d'exécution ou de collecte introuvable.")
        
        date_str = date_node.text
        exec_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        today = datetime.today().date()

        if exec_date >= today:
            return make_message("success", "EXEC_DATE_OK", date_tag, f"Date d'exécution ({exec_date}) valide.")
        else:
            return make_message("warning", "EXEC_DATE_PASSED", date_tag, f"Date d'exécution ({exec_date}) est passée.")
    except:
        return make_message("error", "EXEC_DATE_PARSE_ERROR", date_tag, "Erreur lecture ReqdExctnDt.")
    

def check_unique_endtoend_ids(root, ns, tx_tag):
    seen = set()
    errors = []

    for tx in root.findall(f".//ns:{tx_tag}", ns):
        endtoend_elem = tx.find(".//ns:EndToEndId", ns)
        if endtoend_elem is not None:
            value = (endtoend_elem.text or "").strip()
            if value in seen:
                errors.append({
                    "type": "error",
                    "code": "BUS003",
                    "field": "EndToEndId",
                    "message": f"Le champ EndToEndId '{value}' est dupliqué dans plusieurs transactions."
                })
            else:
                seen.add(value)

    return errors or [{
        "type": "success",
        "code": "BUS003",
        "field": "EndToEndId",
        "message": "Tous les EndToEndId sont uniques."
    }]



def run_business_checks(xml_file_path):
    tree = etree.parse(xml_file_path)
    root = tree.getroot()
    ns = {'ns' : root.nsmap.get(None)}

    if root.find('.//ns:CdtTrfTxInf', ns) is not None:
        tx_tag = 'CdtTrfTxInf'
        date_tag = 'ReqdExctnDt'
    elif root.find('.//ns:DrctDbtTxInf', ns) is not None:
        tx_tag = 'DrctDbtTxInf'
        date_tag = 'ReqdColltnDt'
    else : 
        tx_tag = None
        date_tag = None
        
    results = []
    results.extend(check_nb_of_txs(root, ns, tx_tag))
    results.extend(check_ctrl_sum(root, ns))
    results.extend(check_unique_endtoend_ids(root, ns, tx_tag))
    #results.extend(check_execution_date(root, ns, date_tag)) #desactivée
    results = [item for item in results if isinstance(item, dict) and item.get("code")]

    if not results:
        results.append(make_message(
            "info",
            "NO CHECKS RUN",
            "-",
            "Aucune règle de validation. "
        ))

    return results

# check_execution_date(root, ns, date_tag) #desactiver validation par date d'exec.


