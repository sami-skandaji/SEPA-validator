def make_message(type_, code, field, message):
    if not all([type_, code, field, message]):
        # Si un champ est vide ou None, on retourne None (sera filtré plus tard)
        return None
    return {
        "type": type_,
        "code": code,
        "field": field,
        "message": message
    }
