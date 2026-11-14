"""
Non-Parametric Trend Detection
Implements the Mann-Kendall test and Sen's slope estimator for robust secular trend analysis.
"""

from typing import List, Dict, Any


def calculate_mann_kendall(values: List[float], alpha: float = 0.05) -> Dict[str, Any]:
    """
    Executes non-parametric Mann-Kendall test.
    Stub: To be implemented using pymannkendall.original_test.
    """
    return {
        "trend": "no trend",
        "h": False,
        "p": 1.0,
        "z": 0.0,
        "Tau": 0.0,
        "s": 0.0,
        "var_s": 0.0,
        "slope": 0.0
    }


def calculate_sens_slope(values: List[float]) -> Dict[str, Any]:
    """
    Computes Sen's slope and 95% confidence interval for change rate.
    Stub: To be implemented using pymannkendall or scipy.stats.mstats.sen_seasonal_slopes.
    """
    return {
        "slope": 0.0,
        "intercept": 0.0,
        "ci_lower": 0.0,
        "ci_upper": 0.0
    }
