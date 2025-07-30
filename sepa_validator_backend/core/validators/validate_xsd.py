from lxml import etree
from core.utils.messages import make_message

def validate_with_xsd(xml_path, xsd_path):
    try:
        xsd_doc = etree.parse(xsd_path)
        schema = etree.XMLSchema(xsd_doc)
        xml_doc = etree.parse(xml_path)

        is_valid = schema.validate(xml_doc)

        if is_valid:
            return {
                "valid": True,
                "errors": []
            }
        else:
            errors = [
                make_message("error", "XSD_VALIDATION_ERROR", "XML", f"Ligne {error.line}: {error.message}")
                for error in schema.error_log
            ]
            return {
                "valid": False,
                "errors": errors
            }

    except etree.XMLSchemaParseError as e:
        return {
            "valid": False,
            "errors": [
                make_message("error", "XSD_PARSE_ERROR", "XSD", f"Erreur de parsing du XSD : {str(e)}")
            ]
        }
    
    except etree.XMLSyntaxError as e:
        return {
            "valid": False,
            "errors": [
                make_message("error", "XML_SYNTAX_ERROR", "XML", f"Erreur de syntaxe XML : {str(e)}")
            ]
        }
    
    except Exception as e:
        return {
            "valid": False,
            "errors": [
                make_message("error", "XSD_UNEXPECTED_ERROR", "XSD/XML", f"Erreur inattendue : {str(e)}")
            ]
        }
