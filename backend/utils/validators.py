"""
Request Parameter Validators
Ensures incoming request parameters comply with supported ranges, dates, and schema types.
"""

from typing import Dict, Tuple, List

VALID_VARIABLES = {"temperature", "precipitation", "soil_moisture", "water_surface"}
VALID_AGGREGATIONS = {"monthly", "seasonal", "yearly"}


def validate_analysis_request(data: dict) -> Tuple[bool, List[str]]:
    """
    Validates payload for POST /api/analysis.
    Returns (is_valid, error_messages_list).
    """
    errors = []
    if not isinstance(data, dict):
        return False, ["Payload must be a JSON object"]

    if "location" not in data:
        errors.append("Missing required field 'location'")

    variables = data.get("variables", [])
    if not variables or not isinstance(variables, list):
        errors.append("Field 'variables' must be a non-empty list")
    else:
        for var in variables:
            if var not in VALID_VARIABLES:
                errors.append(f"Invalid variable '{var}'. Supported: {list(VALID_VARIABLES)}")

    aggregation = data.get("aggregation", "yearly")
    if aggregation not in VALID_AGGREGATIONS:
        errors.append(f"Invalid aggregation '{aggregation}'. Supported: {list(VALID_AGGREGATIONS)}")

    return len(errors) == 0, errors
