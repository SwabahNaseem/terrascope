"""
Unit Tests: Plain-Language Summary Generator
Verifies narrative output conformity with scientific communication standards.
"""

from backend.analysis.plain_language import generate_plain_language_summary


def test_plain_language_significant_increase():
    """Verify wording for statistically significant upward trend."""
    summary = generate_plain_language_summary(
        location_name="Kerala",
        variable_name="Air temperature",
        unit="°C",
        start_year="2000",
        end_year="2025",
        slope_per_decade=0.31,
        significant=True,
        n_observations=26
    )
    assert "Kerala" in summary
    assert "up" in summary
    assert "0.31" in summary
    assert "unlikely to be due to chance" in summary


def test_plain_language_not_significant():
    """Verify wording when trend does not meet significance criteria."""
    summary = generate_plain_language_summary(
        location_name="Kerala",
        variable_name="Precipitation",
        unit="mm",
        start_year="2000",
        end_year="2025",
        slope_per_decade=0.02,
        significant=False,
        n_observations=26
    )
    assert "no clear long-term change" in summary
    assert "normal year-to-year variation" in summary
