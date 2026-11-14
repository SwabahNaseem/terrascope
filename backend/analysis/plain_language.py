"""
Plain-Language Narrative Generator
Translates quantitative trend outputs into accessible, everyday English statements.
"""

from typing import Dict, Any


def generate_plain_language_summary(
    location_name: str,
    variable_name: str,
    unit: str,
    start_year: str,
    end_year: str,
    slope_per_decade: float,
    significant: bool,
    n_observations: int
) -> str:
    """
    Generates a user-friendly summary string adhering to scientific communication guidelines.
    Stub: To be implemented with templates from project spec section 11.
    """
    if n_observations < 10:
        return f"There is not enough data between {start_year} and {end_year} to say whether the change in {location_name} is real."

    direction_str = "up" if slope_per_decade > 0 else "down"
    abs_rate = abs(round(slope_per_decade, 2))

    if significant:
        return (
            f"Between {start_year} and {end_year}, {variable_name.lower()} in {location_name} went {direction_str} "
            f"by about {abs_rate} {unit} per decade. This change is very unlikely to be due to chance."
        )

    return (
        f"{variable_name} in {location_name} moved up and down between {start_year} and {end_year}, "
        f"but there is no clear long-term change. The pattern could be normal year-to-year variation."
    )
