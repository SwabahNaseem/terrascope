"""
Unit Tests: Significance & Classification
Tests p-value evaluation and 5-tier classification logic.
"""

from backend.analysis.significance import evaluate_significance, classify_trend_strength


def test_evaluate_significance():
    """Verify p-value comparison against alpha threshold."""
    assert evaluate_significance(0.01, 0.05) is True
    assert evaluate_significance(0.08, 0.05) is False
    assert evaluate_significance(0.05, 0.05) is False


def test_classify_trend_strength_stub():
    """Verify classification output structure."""
    result = classify_trend_strength("temperature", 0.3, True)
    assert "class" in result
    assert "symbol" in result
