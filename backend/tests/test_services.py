"""
Unit Tests: Backend Ingestion Services
Verifies interface contracts for GeocodingService and NasaPowerService.
"""

from backend.services.geocoding import GeocodingService
from backend.services.nasa_power import NasaPowerService


def test_geocoding_service_instantiation():
    service = GeocodingService()
    assert service is not None
    assert service.search_local("Kerala") == []


def test_nasa_power_service_instantiation():
    service = NasaPowerService()
    assert service is not None
    assert "temperature" in service.PARAMETER_MAP
    assert service.PARAMETER_MAP["temperature"] == "T2M"
