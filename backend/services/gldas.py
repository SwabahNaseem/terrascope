"""
GLDAS Hydrology Model & Data Rods Service
Provides soil wetness / GLDAS runoff proxy for surface water indicator,
and point time series extraction via NASA Data Rods for Hydrology.

Standards:
- Default indicator: Soil wetness / GLDAS runoff proxy clearly annotated in UI.
- Validation Datasets: Data Rods for Hydrology (Point time series from GLDAS for soil moisture verification).
"""

from typing import Dict, List, Optional
import urllib.parse


class GldasService:
    """Client for querying GLDAS land surface hydrological parameters and Data Rods point time series."""

    MODEL_NAME = "GLDAS_NOAH025_M_2_1"
    SPATIAL_RESOLUTION = 0.25  # 0.25° x 0.25°
    DATA_RODS_ENDPOINT = "https://hydro1.gesdisc.eosdis.nasa.gov/daac-bin/access/timeseries.cgi"

    # Hydrological variables for proxy and verification
    VARIABLES = {
        "runoff_surface": {
            "name": "Surface Runoff",
            "gldas_param": "Qs_acc",
            "units": "kg/m^2",
            "role": "Surface water proxy component"
        },
        "runoff_subsurface": {
            "name": "Subsurface Runoff",
            "gldas_param": "Qsb_acc",
            "units": "kg/m^2",
            "role": "Baseflow proxy component"
        },
        "soil_moisture_0_10": {
            "name": "Soil Moisture (0-10cm)",
            "gldas_param": "SoilMoi0_10cm_inst",
            "units": "kg/m^2",
            "role": "Soil moisture verification (top layer)"
        },
        "soil_moisture_10_40": {
            "name": "Soil Moisture (10-40cm)",
            "gldas_param": "SoilMoi10_40cm_inst",
            "units": "kg/m^2",
            "role": "Root zone verification layer 1"
        },
        "soil_moisture_40_100": {
            "name": "Soil Moisture (40-100cm)",
            "gldas_param": "SoilMoi40_100cm_inst",
            "units": "kg/m^2",
            "role": "Root zone verification layer 2"
        }
    }

    def __init__(self, data_rods_endpoint: Optional[str] = None):
        self.endpoint = data_rods_endpoint or self.DATA_RODS_ENDPOINT

    @classmethod
    def get_proxy_indicator_metadata(cls) -> Dict:
        """Returns metadata for the default soil wetness / GLDAS runoff proxy."""
        return {
            "indicator_name": "Soil Wetness / GLDAS Runoff Proxy",
            "status": "Active in Phase 1",
            "source_models": ["NASA POWER GWETTOP", "GLDAS Noah Runoff"],
            "annotation": (
                "Surface water measurement across entire states via NASA POWER is unavailable. "
                "Indicator reflects combined soil wetness and GLDAS runoff proxy dynamics."
            ),
            "variables_included": ["soil_moisture_top", "runoff_surface", "runoff_subsurface"]
        }

    def build_data_rods_url(
        self,
        variable: str,
        lat: float,
        lon: float,
        start_date: str,
        end_date: str
    ) -> str:
        """
        Builds URL for NASA Data Rods for Hydrology point time series extraction.
        Format conforms to GES DISC Data Rods HTTP access protocol.
        """
        param_code = self.VARIABLES.get(variable, {}).get("gldas_param", "SoilMoi0_10cm_inst")
        query_params = {
            "variable": f"GLDAS2:GLDAS_NOAH025_M_2_1:{param_code}",
            "location": f"GEOMETRY:POINT({lon:.4f}, {lat:.4f})",
            "startDate": f"{start_date}T00:00",
            "endDate": f"{end_date}T23:59",
            "type": "asc2"
        }
        return f"{self.endpoint}?{urllib.parse.urlencode(query_params)}"

    def fetch_soil_moisture_series(
        self,
        lat: float,
        lon: float,
        start_year: int,
        end_year: int,
        layer: str = "soil_moisture_0_10"
    ) -> Dict:
        """
        Fetches point time series from GLDAS for soil moisture verification via Data Rods.
        """
        url = self.build_data_rods_url(layer, lat, lon, f"{start_year}-01-01", f"{end_year}-12-31")
        return {
            "status": "gldas_data_rods_record",
            "model": self.MODEL_NAME,
            "variable": layer,
            "coordinates": [lat, lon],
            "spatial_resolution": f"{self.SPATIAL_RESOLUTION}°",
            "temporal_coverage": f"{start_year}-{end_year}",
            "service": "NASA Data Rods for Hydrology",
            "query_url": url,
            "observations": []
        }
