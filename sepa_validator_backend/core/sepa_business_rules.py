from datetime import datetime
from lxml import etree

def check_nb_of_txs(root, ns, tx_tag):
    """
    vérifier si le nombre déclaré de virements (NbOfTxs) 
    correspond bien au nombre réel de blocs <CdtTrfTxInf> présents.
    """
    if not tx_tag:
        return "Impossible de determiner le type de transaction."
    try:
        nb = int(root.find('.//ns:NbOfTxs', ns).text)
        txs = root.findall('.//ns:CdtTrfTxInf', ns) + root.findall('.//ns:DrctDbtTxInf', ns)
        return f"✅ Nb de transactions ({nb}) OK." if nb == len(txs) else f"❌ NbOfTxs ({nb}) ne correspond pas aux transactions réelles ({len(txs)})."
    except:
        return "❌ Erreur lecture NbOfTxs."
    
def check_ctrl_sum(root, ns):
    try:
        expected = float(root.find('.//ns:CtrlSum', ns).text)
        amounts = root.findall('.//ns:InstdAmt', ns)
        actual = sum(float(a.text) for a in amounts)
        return f"✅ CtrlSum ({expected}) OK." if abs(actual - expected) < 0.001 else f"❌ CtrlSum ({expected}) ≠ somme réelle ({actual})."
    except:
        return "❌ Erreur lecture CtrlSum."

def check_execution_date(root, ns, date_tag):
    
    """vérifier que la date d’exécution demandée 
    (<ReqdExctnDt>) n’est pas passée ."""
    if not date_tag:
        return "❌ Balise de date inconnue (ni ReqdExctnDt ni ReqdColltnDt trouvée)."
    try:
        date_node = root.find('.//ns:ReqdExctnDt', ns) or root.find('.//ns:ReqdColltnDt', ns)
        if date_node is None:
            return "❌ Date d'exécution ou de collecte introuvable."
        date_str = date_node.text
        exec_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        today = datetime.today().date()
        if exec_date >= today :
            return f"✅ Date d'exécution ({exec_date}) valide."
        else:
            return f"❌ Date d'exécution ({exec_date}) est passée."
    except:
        return "❌ Erreur lecture ReqdExctnDt."


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
    return [
        check_nb_of_txs(root, ns, tx_tag),
        check_ctrl_sum(root, ns),
        check_execution_date(root, ns, date_tag)
    ]




