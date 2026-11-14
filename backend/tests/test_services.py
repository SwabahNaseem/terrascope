"""
Unit Tests: Backend Ingestion Services & Data Standards
Verifies interface contracts and standards for:
1. NASA POWER API Client & Parameter Specifications
2. Water Surface Elevation & Extent (SWOT & Proxies)
3. Geocoding & Boundary Services (Nominatim policy, local fuzzy matching, 36 Indian states/UTs GeoJSON)
4. Validation Datasets (NASA Giovanni, Data Rods GLDAS, KNMI Climate Explorer)
"""

import json
from pathlib import Path

from backend.services.geocoding import GeocodingService
from backend.services.nasa_power import NasaPowerService
from backend.services.swot import SwotService
from backend.services.gldas import GldasService
from backend.services.state_sampler import StateSamplerService
from backend.services.validation import (
    GiovanniValidationService,
    DataRodsHydrologyValidationService,
    KnmiClimateExplorerValidationService
)
from backend.utils.units import format_unit_display, convert_units, PARAMETER_UNITS


# ==========================================
# 1. Primary Data Provider: NASA POWER API
# ==========================================

def test_nasa_power_specifications():
    """Verify NASA POWER base endpoint, spatial resolution, and temporal coverage."""
    service = NasaPowerService()
    assert service.BASE_ENDPOINT == "https://power.larc.nasa.gov/api/temporal/"
    assert service.SPATIAL_RESOLUTION == 0.5
    assert service.EARLIEST_YEAR == 1981

    latest_date = service.get_latest_available_date()
    assert latest_date is not None
    assert len(latest_date.split("-")) == 3


def test_nasa_power_parameters():
    """Verify all 4 required parameter codes, friendly names, native units, and display units."""
    specs = NasaPowerService.PARAMETER_SPECIFICATIONS

    # T2M
    assert specs["temperature"]["code"] == "T2M"
    assert specs["temperature"]["friendly_name"] == "Air Temperature at 2 Meters"
    assert specs["temperature"]["native_units"] == "°C"
    assert specs["temperature"]["display_units"] == "°C"

    # PRECTOTCORR
    assert specs["precipitation"]["code"] == "PRECTOTCORR"
    assert specs["precipitation"]["friendly_name"] == "Precipitation Corrected"
    assert specs["precipitation"]["native_units"] == "mm/day"
    assert "mm/year" in specs["precipitation"]["display_units"]

    # GWETTOP
    assert specs["soil_moisture_top"]["code"] == "GWETTOP"
    assert specs["soil_moisture_top"]["friendly_name"] == "Surface Soil Wetness (0–5 cm)"
    assert specs["soil_moisture_top"]["native_units"] == "0–1 fraction"
    assert "0 to 1" in specs["soil_moisture_top"]["display_units"]

    # GWETROOT
    assert specs["soil_moisture_root"]["code"] == "GWETROOT"
    assert specs["soil_moisture_root"]["friendly_name"] == "Root Zone Soil Wetness (0–100 cm)"
    assert specs["soil_moisture_root"]["native_units"] == "0–1 fraction"
    assert "0 to 1" in specs["soil_moisture_root"]["display_units"]


def test_nasa_power_grid_snapping_and_cleaning():
    """Verify spatial grid snapping to 0.5° and fill value replacement."""
    service = NasaPowerService()
    lat, lon = service.snap_to_grid(10.8505, 76.2711)
    assert lat == 11.0
    assert lon == 76.5

    cleaned = service._clean_series_fill_values({"20200101": 25.5, "20200102": -999.0, "20200103": -999.00})
    assert cleaned["20200101"] == 25.5
    assert cleaned["20200102"] is None
    assert cleaned["20200103"] is None


def test_unit_conversions():
    """Verify unit normalization and display formats."""
    assert format_unit_display("temperature") == "°C"
    assert "mm" in format_unit_display("precipitation")
    assert "0 to 1" in format_unit_display("soil_moisture_top")

    # 2 mm/day converted to annual sum
    annual_rain = convert_units("precipitation", 2.0, "mm/day", "mm/year", days=365)
    assert annual_rain == 730.0


# ========================================================
# 2. Water Surface Elevation & Extent (SWOT & Proxies)
# ========================================================

def test_swot_phase_1_status_and_proxy():
    """Verify Phase 1 proxy indicator and UI annotation strategy."""
    status_info = SwotService.get_phase_1_status()
    assert status_info["phase"] == 1
    assert status_info["surface_water_statewide_available"] is False
    assert "Soil wetness / GLDAS runoff proxy" in status_info["implementation_strategy"]["default_indicator"]
    assert "clearly annotated in UI" in status_info["implementation_strategy"]["default_indicator"]


def test_swot_designated_reservoirs_and_disclaimer():
    """Verify designated Indian reservoirs and launch-era disclaimer."""
    reservoirs = SwotService.get_designated_reservoirs()
    assert "idukki" in reservoirs
    assert "nagarjuna_sagar" in reservoirs
    assert "sardar_sarovar" in reservoirs

    assert reservoirs["idukki"]["state"] == "Kerala"
    assert "Andhra Pradesh" in reservoirs["nagarjuna_sagar"]["state"]
    assert reservoirs["sardar_sarovar"]["state"] == "Gujarat"

    disclaimer = SwotService.get_disclaimer()
    assert "2022" in disclaimer
    assert "SWOT" in disclaimer

    service = SwotService()
    rec = service.fetch_reservoir_elevation("Idukki", "2010-01-01", "2020-01-01")
    assert rec["warning"] is not None
    assert "2022" in rec["warning"]


# ==========================================
# 3. Geocoding & Boundary Services
# ==========================================

def test_geocoding_local_fuzzy_matching():
    """Verify local fuzzy matching prioritized over live web calls."""
    service = GeocodingService()
    
    # Exact and prefix matches
    results = service.search_local("Kerala")
    assert len(results) > 0
    assert results[0]["name"] == "Kerala"
    assert results[0]["type"] == "state"

    district_results = service.search_local("Wayanad")
    assert len(district_results) > 0
    assert district_results[0]["name"] == "Wayanad"
    assert district_results[0]["state"] == "Kerala"

    # Fuzzy match with alias / common spelling
    alias_results = service.search_local("Bangalore")
    assert len(alias_results) > 0
    assert "Bengaluru" in [r["name"] for r in alias_results]


def test_geocoding_policy_compliance():
    """Verify policy compliance: <= 1 req/sec rate limit, custom User-Agent, and caching."""
    service = GeocodingService()
    assert service.rate_limit_delay >= 1.0
    assert "TerraScope" in service.user_agent
    assert service.cache_file_path.name == "geocoding.json"

    # Resolve local query should use local/cached without web call
    res = service.resolve("Kerala")
    assert res is not None
    assert res["name"] == "Kerala"


def test_india_administrative_boundaries_geojson():
    """Verify official India GeoJSON contains all 28 states and 8 union territories (36 total)."""
    geojson_path = Path("frontend/assets/geo/india_states.geojson")
    assert geojson_path.exists()

    with open(geojson_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    features = data.get("features", [])
    assert len(features) == 36, f"Expected 36 states and union territories, found {len(features)}"

    states = [f for f in features if f["properties"].get("type") == "State"]
    uts = [f for f in features if f["properties"].get("type") == "Union Territory"]

    assert len(states) == 28, f"Expected 28 states, found {len(states)}"
    assert len(uts) == 8, f"Expected 8 union territories, found {len(uts)}"

    # Check key regions following Government of India guidelines
    names = [f["properties"]["name"] for f in features]
    assert "Ladakh" in names
    assert "Jammu and Kashmir" in names
    assert "Arunachal Pradesh" in names
    assert "Dadra and Nagar Haveli and Daman and Diu" in names


def test_state_sampler_with_official_geojson():
    """Verify StateSamplerService generates 0.5° sampling points across boundaries."""
    sampler = StateSamplerService("frontend/assets/geo/india_states.geojson")
    kerala_points = sampler.get_state_points("Kerala", grid_step_deg=0.5)
    assert len(kerala_points) > 0
    for lat, lon in kerala_points:
        assert 8.0 <= lat <= 13.0
        assert 74.5 <= lon <= 77.5


# ==========================================
# 4. Validation Datasets
# ==========================================

def test_giovanni_validation():
    """Verify NASA Giovanni ground-truth comparison logic."""
    val = GiovanniValidationService()
    series_a = [26.5, 27.0, 27.2, 27.8, 28.1]
    series_b = [26.4, 27.1, 27.3, 27.7, 28.0]

    result = val.compare_series("temperature", series_a, series_b)
    assert result["verified"] is True
    assert result["correlation"] > 0.95
    assert result["rmsd"] < 0.2


def test_data_rods_gldas_validation():
    """Verify GLDAS Data Rods soil moisture verification."""
    val = DataRodsHydrologyValidationService()
    power_soil = [0.45, 0.48, 0.52, 0.50, 0.43]
    gldas_soil = [0.44, 0.47, 0.51, 0.49, 0.42]

    res = val.verify_soil_moisture(power_soil, gldas_soil)
    assert res["verified"] is True
    assert res["correlation"] > 0.95


def test_knmi_cross_validation():
    """Verify KNMI Climate Explorer Mann-Kendall statistics cross-validation."""
    val = KnmiClimateExplorerValidationService()
    computed = {"p_value": 0.012, "slope_per_decade": 0.31}
    reference = {"p_value": 0.012, "slope_per_decade": 0.31}

    res = val.validate_trend_statistics(computed, reference)
    assert res["cross_validated"] is True
    assert res["p_value_difference"] == 0.0
    assert res["slope_difference"] == 0.0
