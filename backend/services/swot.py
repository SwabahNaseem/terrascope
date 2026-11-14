"""
SWOT Surface Water Service (Future Phase)
Placeholder interface for Surface Water and Ocean Topography (SWOT) river & reservoir water elevation.
"""


class SwotService:
    """Client for querying SWOT lake/reservoir water surface elevations."""

    def __init__(self):
        pass

    def fetch_reservoir_elevation(self, reservoir_name: str, start_date: str, end_date: str):
        """Stub: To be implemented in Phase 6 for designated major Indian reservoirs."""
        raise NotImplementedError("SWOT mission integration planned for future phase.")
