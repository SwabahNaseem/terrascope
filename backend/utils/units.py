"""
Unit Conversion & Representation
Normalizes raw satellite measurement units to user-facing formats following NASA POWER standards.
"""

from typing import Dict


PARAMETER_UNITS: Dict[str, Dict[str, str]] = {
    "temperature": {
        "friendly_name": "Air Temperature at 2 Meters",
        "native_units": "°C",
        "display_units": "°C",
        "notes": "Daily mean, aggregated to monthly/yearly"
    },
    "precipitation": {
        "friendly_name": "Precipitation Corrected",
        "native_units": "mm/day",
        "display_units": "mm/year or mm/month",
        "notes": "Summed over aggregation window"
    },
    "soil_moisture_top": {
        "friendly_name": "Surface Soil Wetness (0–5 cm)",
        "native_units": "0–1 fraction",
        "display_units": "Fraction (0 to 1)",
        "notes": "Dimensionless soil moisture ratio"
    },
    "soil_moisture_root": {
        "friendly_name": "Root Zone Soil Wetness (0–100 cm)",
        "native_units": "0–1 fraction",
        "display_units": "Fraction (0 to 1)",
        "notes": "Dimensionless root zone ratio"
    },
    "soil_moisture": {
        "friendly_name": "Surface Soil Wetness (0–5 cm)",
        "native_units": "0–1 fraction",
        "display_units": "Fraction (0 to 1)",
        "notes": "Dimensionless soil moisture ratio"
    },
    "water_surface": {
        "friendly_name": "Water Surface Elevation & Extent Proxy",
        "native_units": "meters / index",
        "display_units": "meters (SWOT) / index (proxy)",
        "notes": "Soil wetness / GLDAS runoff proxy in Phase 1"
    }
}


def format_unit_display(variable: str) -> str:
    """Returns friendly unit string for charts and summary cards."""
    spec = PARAMETER_UNITS.get(variable)
    if spec:
        return spec["display_units"]
    
    fallback_units = {
        "temperature": "°C",
        "precipitation": "mm/year",
        "soil_moisture_top": "Fraction (0 to 1)",
        "soil_moisture_root": "Fraction (0 to 1)",
        "soil_moisture": "Fraction (0 to 1)",
        "water_surface": "meters",
    }
    return fallback_units.get(variable, "")


def get_native_unit(variable: str) -> str:
    """Returns native unit string for given variable."""
    spec = PARAMETER_UNITS.get(variable)
    return spec["native_units"] if spec else ""


def convert_units(
    variable: str,
    value: float,
    from_unit: str,
    to_unit: str,
    days: float = 365.25
) -> float:
    """
    Converts unit representations (e.g. mm/day to mm/year or mm/month).
    
    Args:
        variable: Variable name (e.g. 'precipitation')
        value: Input numerical value
        from_unit: Source unit string
        to_unit: Target unit string
        days: Number of days in the aggregation window (default 365.25 for annual sum)
    """
    if value is None:
        return None

    from_u = from_unit.lower().strip()
    to_u = to_unit.lower().strip()

    if from_u == to_u:
        return value

    # Precipitation conversions
    if variable in ("precipitation", "PRECTOTCORR"):
        if from_u in ("mm/day", "mm_per_day"):
            if to_u in ("mm/year", "mm_per_year", "mm"):
                return round(value * days, 2)
            elif to_u in ("mm/month", "mm_per_month"):
                return round(value * 30.4375, 2)
        elif from_u in ("mm/year", "mm_per_year"):
            if to_u in ("mm/day", "mm_per_day"):
                return round(value / days, 4)

    return value
