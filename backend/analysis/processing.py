"""
Data Processing & Transformation
Handles missing-value filtering, unit standardization, and temporal aggregation (monthly/seasonal/annual).
"""

from typing import List, Dict, Any


def clean_time_series(raw_series: List[Dict[str, Any]], fill_values: List[float] = None) -> List[Dict[str, Any]]:
    """
    Filters invalid sentinel values (e.g. -999.0 in NASA POWER) and ensures strictly ordered timestamps.
    Stub: To be implemented using pandas DataFrame.
    """
    return raw_series


def aggregate_time_series(series: List[Dict[str, Any]], interval: str = "yearly") -> List[Dict[str, Any]]:
    """
    Aggregates point or daily data to 'monthly', 'seasonal', or 'yearly' frequency.
    Stub: To be implemented using pandas resample / groupby.
    """
    return series
