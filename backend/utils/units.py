"""
Unit Conversion & Representation
Normalizes raw satellite measurement units to user-facing formats.
"""


def format_unit_display(variable: str) -> str:
    """Returns friendly unit string for charts and summary cards."""
    units = {
        "temperature": "°C",
        "precipitation": "mm",
        "soil_moisture": "fraction (0-1)",
        "water_surface": "meters",
    }
    return units.get(variable, "")


def convert_units(variable: str, value: float, from_unit: str, to_unit: str) -> float:
    """
    Converts unit representations if necessary (e.g. mm/day to mm/year).
    Stub: To be implemented.
    """
    return value
