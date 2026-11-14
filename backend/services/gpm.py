"""
GPM IMERG Service (Future Phase)
Placeholder interface for Global Precipitation Measurement (GPM) IMERG satellite product integration.
"""


class GpmService:
    """Client for querying GPM IMERG gridded precipitation records."""

    def __init__(self, data_access_token: str = ""):
        self.data_access_token = data_access_token

    def fetch_precipitation_series(self, lat: float, lon: float, start_year: int, end_year: int):
        """Stub: To be implemented in Phase 6."""
        raise NotImplementedError("GPM IMERG integration planned for future phase.")
