"""
GLDAS Hydrology Model Service (Future Phase)
Placeholder interface for Global Land Data Assimilation System (GLDAS) soil moisture and runoff.
"""


class GldasService:
    """Client for querying GLDAS land surface hydrological parameters."""

    def __init__(self):
        pass

    def fetch_soil_moisture_series(self, lat: float, lon: float, start_year: int, end_year: int):
        """Stub: To be implemented in Phase 6."""
        raise NotImplementedError("GLDAS integration planned for future phase.")
