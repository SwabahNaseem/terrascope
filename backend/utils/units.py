"""
Unit Conversion & Representation
<<<<<<< Updated upstream
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
=======
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
>>>>>>> Stashed changes
    }
}


def format_unit_display(variable: str) -> str:
    """Returns friendly unit string for charts and summary cards."""
<<<<<<< Updated upstream
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
=======
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
>>>>>>> Stashed changes


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
<<<<<<< Updated upstream
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
=======
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
>>>>>>> Stashed changes

    return value
