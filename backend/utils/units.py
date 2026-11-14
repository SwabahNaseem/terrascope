"""
Unit Conversion & Representation
Normalizes raw satellite measurement units to user-facing formats and handles conversions.
"""

from typing import Dict, Any

VARIABLE_UNIT_METADATA: Dict[str, Dict[str, Any]] = {
    "temperature": {
        "name": "Air Temperature",
        "code": "T2M",
        "native_unit": "°C",
        "display_unit": "°C",
        "rate_unit": "°C/decade",
        "source": "NASA POWER (T2M)",
        "description": "Near-surface air temperature at 2 meters above ground level"
    },
    "precipitation": {
        "name": "Precipitation / Rainfall",
        "code": "PRECTOTCORR",
        "native_unit": "mm/day",
        "display_unit": "mm",
        "rate_unit": "mm/decade",
        "source": "NASA POWER (PRECTOTCORR)",
        "description": "Precipitation corrected for surface model dynamics"
    },
    "soil_moisture": {
        "name": "Surface Soil Wetness",
        "code": "GWETTOP",
        "native_unit": "fraction (0-1)",
        "display_unit": "fraction (0-1)",
        "rate_unit": "fraction/decade",
        "source": "NASA POWER (GWETTOP)",
        "description": "Surface soil moisture fraction (0 = dry, 1 = saturated)"
    },
    "soil_moisture_root": {
        "name": "Root Zone Soil Wetness",
        "code": "GWETROOT",
        "native_unit": "fraction (0-1)",
        "display_unit": "fraction (0-1)",
        "rate_unit": "fraction/decade",
        "source": "NASA POWER (GWETROOT)",
        "description": "Root zone soil moisture fraction (0 = dry, 1 = saturated)"
    },
    "water_surface": {
        "name": "Surface Water Indicator",
        "code": "SWOT_PROXY",
        "native_unit": "index",
        "display_unit": "index",
        "rate_unit": "index/decade",
        "source": "SWOT / Model Proxy",
        "description": "Surface water elevation and reservoir storage proxy"
    }
}


def format_unit_display(variable: str) -> str:
    """Returns friendly unit string for charts and summary cards."""
    meta = VARIABLE_UNIT_METADATA.get(variable)
    if meta:
        return meta["display_unit"]
    return ""


def format_rate_display(variable: str, rate: float) -> str:
    """Returns formatted slope rate per decade with unit."""
    meta = VARIABLE_UNIT_METADATA.get(variable)
    rate_unit = meta["rate_unit"] if meta else "per decade"
    sign = "+" if rate > 0 else ""
    return f"{sign}{rate:.2f} {rate_unit}"


def get_variable_details(variable: str) -> Dict[str, Any]:
    """Returns complete metadata dictionary for a variable."""
    return VARIABLE_UNIT_METADATA.get(variable, {
        "name": variable.replace("_", " ").title(),
        "code": variable.upper(),
        "native_unit": "units",
        "display_unit": "units",
        "rate_unit": "units/decade",
        "source": "Observation Data",
        "description": f"{variable} observation records"
    })


def convert_units(variable: str, value: float, from_unit: str, to_unit: str) -> float:
    """
    Converts unit representations if necessary (e.g. mm/day to annual cumulative mm).
    """
    if from_unit == to_unit or value is None:
        return value

    # Precipitation: daily average to annual sum estimation
    if variable == "precipitation":
        if from_unit == "mm/day" and to_unit in ("mm/year", "mm"):
            return value * 365.25
        if from_unit in ("mm/year", "mm") and to_unit == "mm/day":
            return value / 365.25

    return value
