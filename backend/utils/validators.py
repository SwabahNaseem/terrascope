"""
Request Parameter Validators
Ensures incoming request parameters comply with supported ranges, dates, and schema types.
"""

import re
from typing import Dict, Tuple, List, Any

VALID_VARIABLES = {"temperature", "precipitation", "soil_moisture", "soil_moisture_root", "water_surface"}
VALID_AGGREGATIONS = {"monthly", "seasonal", "yearly"}
YEAR_PATTERN = re.compile(r"^\d{4}$")
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}(-\d{2})?$")


def validate_analysis_request(data: Any) -> Tuple[bool, List[str]]:
    """
    Validates payload for POST /api/analysis.
    Returns (is_valid, error_messages_list).
    """
    errors: List[str] = []
    if not isinstance(data, dict):
        return False, ["Payload must be a JSON object"]

    # Validate location
    location = data.get("location")
    if not location or not isinstance(location, dict):
        errors.append("Missing or invalid required field 'location'")
    else:
        loc_type = location.get("type", "").lower()
        if loc_type not in ("state", "point"):
            errors.append("Field 'location.type' must be either 'state' or 'point'")
        elif loc_type == "state":
            if not location.get("name") and not location.get("code"):
                errors.append("For location type 'state', either 'name' or 'code' is required")
        elif loc_type == "point":
            coords = location.get("coordinates")
            if not coords or not isinstance(coords, (list, tuple)) or len(coords) < 2:
                errors.append("For location type 'point', 'coordinates' must be [latitude, longitude]")
            else:
                try:
                    lat, lon = float(coords[0]), float(coords[1])
                    if not (-90.0 <= lat <= 90.0):
                        errors.append(f"Latitude {lat} out of range [-90, 90]")
                    if not (-180.0 <= lon <= 180.0):
                        errors.append(f"Longitude {lon} out of range [-180, 180]")
                except (ValueError, TypeError):
                    errors.append("Coordinates must be valid floating point numbers")

    # Validate variables
    variables = data.get("variables")
    if not variables or not isinstance(variables, list):
        errors.append("Field 'variables' must be a non-empty list")
    else:
        for var in variables:
            if var not in VALID_VARIABLES:
                errors.append(f"Invalid variable '{var}'. Supported: {sorted(list(VALID_VARIABLES))}")

    # Validate aggregation
    aggregation = data.get("aggregation", "yearly")
    if aggregation not in VALID_AGGREGATIONS:
        errors.append(f"Invalid aggregation '{aggregation}'. Supported: {sorted(list(VALID_AGGREGATIONS))}")

    # Validate dates
    start_date = data.get("start_date")
    if start_date is not None:
        start_str = str(start_date).strip()
        if not (YEAR_PATTERN.match(start_str) or DATE_PATTERN.match(start_str)):
            errors.append("Field 'start_date' must be formatted as YYYY or YYYY-MM-DD")

    end_date = data.get("end_date")
    if end_date is not None:
        end_str = str(end_date).strip().lower()
        if end_str != "latest" and not (YEAR_PATTERN.match(end_str) or DATE_PATTERN.match(end_str)):
            errors.append("Field 'end_date' must be formatted as YYYY, YYYY-MM-DD, or 'latest'")

    return len(errors) == 0, errors


def validate_map_trends_request(args: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Validates query parameters for GET /api/map-trends.
    Returns (is_valid, error_messages_list).
    """
    errors: List[str] = []
    variable = args.get("variable", "temperature")
    if variable not in VALID_VARIABLES:
        errors.append(f"Invalid variable '{variable}'. Supported: {sorted(list(VALID_VARIABLES))}")

    start_date = args.get("start_date")
    if start_date is not None:
        start_str = str(start_date).strip()
        if not (YEAR_PATTERN.match(start_str) or DATE_PATTERN.match(start_str)):
            errors.append("Parameter 'start_date' must be formatted as YYYY or YYYY-MM-DD")

    end_date = args.get("end_date")
    if end_date is not None:
        end_str = str(end_date).strip().lower()
        if end_str != "latest" and not (YEAR_PATTERN.match(end_str) or DATE_PATTERN.match(end_str)):
            errors.append("Parameter 'end_date' must be formatted as YYYY, YYYY-MM-DD, or 'latest'")

    return len(errors) == 0, errors
