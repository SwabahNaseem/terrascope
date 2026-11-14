"""
Statistical Significance & Direction Classification
Evaluates p-values against significance levels and categorizes trends into 5-tier classification.
"""

from typing import Dict, Any


def evaluate_significance(p_value: float, alpha: float = 0.05) -> bool:
    """Returns True if the p-value meets the significance threshold (p < alpha)."""
    return p_value < alpha


def classify_trend_strength(
    variable: str,
    slope_per_decade: float,
    significant: bool
) -> Dict[str, str]:
    """
    Classifies a trend into one of 5 categories:
    strong_increase, slight_increase, no_clear_change, slight_decrease, strong_decrease.
    Stub: To be implemented based on variable-specific thresholds.
    """
    if not significant:
        return {"class": "no_clear_change", "symbol": "="}

    if slope_per_decade > 0:
        return {"class": "slight_increase", "symbol": "▲"}
    return {"class": "slight_decrease", "symbol": "▼"}
