"""
Unit Conversion & Representation
Normalizes raw satellite measurement units to user-facing formats following NASA POWER & GPM standards.
"""

from typing import Dict, Any, Optional

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
        "display_unit": "mm/year",
        "rate_unit": "mm/decade",
        "source": "NASA POWER & GPM IMERG",
        "description": "Precipitation corrected for surface model dynamics"
    },
    "soil_moisture": {
        "name": "Surface Soil Wetness",
        "code": "GWETTOP",
        "native_unit": "0–1 fraction",
        "display_unit": "0 to 1 (fraction)",
        "rate_unit": "fraction/decade",
        "source": "NASA POWER (GWETTOP)",
        "description": "Surface soil moisture fraction (0 = dry, 1 = saturated)"
    },
    "soil_moisture_top": {
        "name": "Surface Soil Wetness (0–5 cm)",
        "code": "GWETTOP",
        "native_unit": "0–1 fraction",
        "display_unit": "0 to 1 (fraction)",
        "rate_unit": "fraction/decade",
        "source": "NASA POWER (GWETTOP)",
        "description": "Dimensionless surface soil moisture ratio"
    },
    "soil_moisture_root": {
        "name": "Root Zone Soil Wetness (0–100 cm)",
        "code": "GWETROOT",
        "native_unit": "0–1 fraction",
        "display_unit": "0 to 1 (fraction)",
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

PARAMETER_UNITS = {
    k: {
        "friendly_name": v["name"],
        "native_units": v["native_unit"],
        "display_units": v["display_unit"],
        "notes": v["description"]
    }
    for k, v in VARIABLE_UNIT_METADATA.items()
}


def format_unit_display(variable: str) -> str:
    """Returns friendly unit string for charts and summary cards."""
    meta = VARIABLE_UNIT_METADATA.get(variable)
    if meta:
        return meta["display_unit"]
    fallback = {
        "temperature": "°C",
        "precipitation": "mm/year",
        "soil_moisture": "fraction",
        "soil_moisture_top": "fraction",
        "soil_moisture_root": "fraction",
        "water_surface": "index"
    }
    return fallback.get(variable, "")


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


def get_native_unit(variable: str) -> str:
    """Returns native unit string for given variable."""
    meta = VARIABLE_UNIT_METADATA.get(variable)
    return meta["native_unit"] if meta else ""


def convert_units(
    variable: str,
    value: Optional[float],
    from_unit: str,
    to_unit: str,
    days: float = 365.25
) -> Optional[float]:
    """
    Converts unit representations (e.g. mm/day to mm/year or mm/month).
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
        elif from_u in ("mm/year", "mm_per_year", "mm"):
            if to_u in ("mm/day", "mm_per_day"):
                return round(value / days, 4)

    return value
