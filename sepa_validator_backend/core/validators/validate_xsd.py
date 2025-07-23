from lxml import etree

def validate_with_xsd(xml_path, xsd_path):
    xsd_doc = etree.parse(xsd_path)
    schema = etree.XMLSchema(xsd_doc)
    xml_doc = etree.parse(xml_path)

    try:
        schema.assertValid(xml_doc)
        return True, "XML Valide selon le fichier XSD."
    except etree.DocumentInvalid as e :
        return False, f"Erreur XSD : {str(e)}"