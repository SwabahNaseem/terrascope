"""
TerraScope Statistical and Analysis Engine
Provides time series cleaning, aggregation, non-parametric trend detection, and narrative generation.
"""

from backend.analysis.processing import clean_time_series, aggregate_time_series
from backend.analysis.statistics import compute_summary_stats
from backend.analysis.trends import calculate_mann_kendall, calculate_sens_slope
from backend.analysis.significance import evaluate_significance, classify_trend_strength
from backend.analysis.plain_language import generate_plain_language_summary

__all__ = [
    "clean_time_series",
    "aggregate_time_series",
    "compute_summary_stats",
    "calculate_mann_kendall",
    "calculate_sens_slope",
    "evaluate_significance",
    "classify_trend_strength",
    "generate_plain_language_summary",
]
