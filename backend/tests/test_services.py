"""
Unit Tests: Backend Ingestion Services
Verifies interface contracts and functional operations for all backend services:
GeocodingService, NasaPowerService, StateSamplerService, DataLoaderService,
GldasService, GpmService, and SwotService.
"""

from backend.services.geocoding import GeocodingService
from backend.services.nasa_power import NasaPowerService
from backend.services.state_sampler import StateSamplerService
from backend.services.data_loader import DataLoaderService
from backend.services.gldas import GldasService
from backend.services.gpm import GpmService
from backend.services.swot import SwotService


def test_geocoding_service_instantiation_and_search():
    """Verify GeocodingService local dictionary search and state retrieval."""
    service = GeocodingService()
    assert service is not None

    # Test local search for existing state
    results = service.search_local("Kerala")
    assert isinstance(results, list)
    assert len(results) > 0
    assert results[0]["name"] == "Kerala"
    assert results[0]["type"] == "state"

    # Test local search for existing district
    district_results = service.search_local("Wayanad")
    assert len(district_results) > 0
    assert district_results[0]["name"] == "Wayanad"

    # Test short query returns empty list
    assert service.search_local("k") == []

    # Test non-existent location returns empty list
    assert service.search_local("NonExistentUnknownPlace12345") == []

    # Test get_all_states returns 36 states/UTs
    states = service.get_all_states()
    assert len(states) >= 30


def test_nasa_power_service_instantiation_and_fetch():
    """Verify NasaPowerService parameter mappings and fallback retrieval."""
    service = NasaPowerService()
    assert service is not None
    assert "temperature" in service.PARAMETER_MAP
    assert service.PARAMETER_MAP["temperature"] == "T2M"
    assert service.PARAMETER_MAP["precipitation"] == "PRECTOTCORR"
    assert service.PARAMETER_MAP["soil_moisture"] == "GWETTOP"

    # Test fetch_point_series fallback / cached response
    res = service.fetch_point_series(
        latitude=10.8505,
        longitude=76.2711,
        parameters=["temperature"],
        start_date="2000",
        end_date="2025"
    )
    assert res is not None
    assert "data" in res
    assert "temperature" in res["data"]
    assert len(res["data"]["temperature"]["annual_series"]) > 0


def test_state_sampler_service():
    """Verify StateSamplerService grid generation and averaging."""
    sampler = StateSamplerService()
    assert sampler is not None

    # Sampling points inside Kerala
    points = sampler.get_state_points("Kerala", grid_step_deg=0.5)
    assert isinstance(points, list)
    assert len(points) > 0
    for lat, lon in points:
        assert 8.0 <= lat <= 13.0
        assert 74.0 <= lon <= 78.0

    # Composite state average computation
    mock_point_series = [
        {"series": [{"date": "2020", "value": 27.0}, {"date": "2021", "value": 28.0}]},
        {"series": [{"date": "2020", "value": 28.0}, {"date": "2021", "value": 29.0}]},
    ]
    averaged = sampler.compute_state_average(mock_point_series)
    assert "series" in averaged
    assert averaged["series"][0]["date"] == "2020"
    assert averaged["series"][0]["value"] == 27.5


def test_data_loader_service():
    """Verify DataLoaderService sample loading and cache operations."""
    loader = DataLoaderService()
    assert loader is not None

    # Load bundled sample
    sample = loader.load_sample("kerala_temperature_sample.json")
    assert sample is not None
    assert "location" in sample
    assert sample["location"]["name"] == "Kerala"

    # Load map trends sample fallback
    trends = loader.load_map_trends("temperature")
    assert trends is not None
    assert "states" in trends

    # Cache write & read
    loader.save_cache("test_key", {"test": 123}, namespace="test_ns")
    cached = loader.load_cache("test_key", namespace="test_ns")
    assert cached is not None
    assert cached.get("test") == 123


def test_supplementary_services():
    """Verify GldasService, GpmService, and SwotService interfaces."""
    gldas = GldasService()
    assert gldas.get_metadata() is not None
    gldas_data = gldas.fetch_soil_moisture_series(10.85, 76.27, 2020, 2025)
    assert len(gldas_data["series"]) == 6

    gpm = GpmService()
    assert gpm.get_metadata() is not None
    gpm_data = gpm.fetch_precipitation_series(10.85, 76.27, 2020, 2025)
    assert len(gpm_data["series"]) == 6

    swot = SwotService()
    reservoirs = swot.get_supported_reservoirs()
    assert len(reservoirs) > 0
    swot_data = swot.fetch_reservoir_elevation("Idukki Reservoir")
    assert len(swot_data["observations"]) > 0
