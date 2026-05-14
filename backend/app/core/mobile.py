import re


def normalize_mobile(mobile: str) -> str:
    """
    Normalize a mobile number:
    - Strip spaces, dashes, parentheses
    - Strip leading +91 or 91 (Indian country code)
    """
    cleaned = re.sub(r"[\s\-\(\)]", "", mobile.strip())
    if cleaned.startswith("+91"):
        cleaned = cleaned[3:]
    elif cleaned.startswith("91") and len(cleaned) == 12:
        cleaned = cleaned[2:]
    return cleaned
