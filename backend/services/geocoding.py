"""
Geocoding Service
Handles location string resolution to coordinates via local dictionary matching and Nominatim API.
"""

from typing import Dict, List, Optional


class GeocodingService:
    """Service for resolving search strings to coordinates in India."""

    def __init__(self, cache_file_path: Optional[str] = None):
        self.cache_file_path = cache_file_path
        self._cache: Dict[str, dict] = {}

    def search_local(self, query: str) -> List[dict]:
        """
        Search local dictionary of Indian states, union territories, and major districts.
        Stub: To be implemented using fuzzy string matching.
        """
        return []

    def resolve_nominatim(self, query: str) -> Optional[dict]:
        """
        Resolve query using OpenStreetMap Nominatim API with rate-limiting and user-agent.
        Stub: To be implemented with caching.
        """
        return None

    def get_coordinates(self, place_name: str) -> Optional[tuple]:
        """
        Convenience method returning (latitude, longitude) for a place name.
        Stub: To be implemented.
        """
        return None
