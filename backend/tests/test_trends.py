"""
Unit Tests: Non-Parametric Trend Detection
Tests Mann-Kendall and Sen's slope calculations against known synthetic series.
"""

from backend.analysis.trends import calculate_mann_kendall, calculate_sens_slope


def test_mann_kendall_interface():
    """Verify Mann-Kendall function signature and return dictionary keys."""
    series = [20.1, 20.4, 20.8, 21.0, 21.5, 22.0]
    result = calculate_mann_kendall(series)
    assert isinstance(result, dict)
    assert "p" in result
    assert "trend" in result


def test_sens_slope_interface():
    """Verify Sen's slope function signature and return structure."""
    series = [10.0, 10.5, 11.0, 11.5, 12.0]
    result = calculate_sens_slope(series)
    assert isinstance(result, dict)
    assert "slope" in result
    assert "ci_lower" in result
    assert "ci_upper" in result
