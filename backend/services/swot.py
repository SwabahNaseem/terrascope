"""
SWOT Surface Water & Lake Vector Product Service
Handles Surface Water and Ocean Topography (SWOT) reservoir water surface elevation,
proxy indicators, and designated Indian reservoir monitoring.

Water Surface Elevation & Extent Standards:
- Status in Phase 1: Surface water measurement across entire states via NASA POWER is unavailable.
- Implementation Strategy:
  1. Default indicator: Soil wetness / GLDAS runoff proxy clearly annotated in UI.
  2. Future Phase: Ingest SWOT vector lake products for designated Indian reservoirs
     (e.g. Idukki, Nagarjuna Sagar, Sardar Sarovar) with launch-era disclaimer (2022 onwards).
"""

from typing import Dict, List, Optional
from datetime import datetime


class SwotService:
    """Client for querying SWOT lake/reservoir water surface elevations and proxy indicator metadata."""

    # Phase 1 Operational Status
    STATUS_PHASE_1 = "Surface water measurement across entire states via NASA POWER is unavailable."
    
    # Default Indicator Specification
    DEFAULT_INDICATOR = "Soil wetness / GLDAS runoff proxy clearly annotated in UI."
    PROXY_VARIABLE = "soil_moisture_top"
    PROXY_SOURCE = "GLDAS / NASA POWER Runoff & Wetness Proxy"

    # Launch-Era Information
    SWOT_LAUNCH_YEAR = 2022
    LAUNCH_ERA_DISCLAIMER = (
        "SWOT (Surface Water and Ocean Topography) vector lake products are available "
        "only from the launch era (December 2022 onwards). State-wide historical surface "
        "water extent before 2022 is unavailable via SWOT."
    )

    # Designated Indian Reservoirs for SWOT Vector Lake Product Ingestion
    DESIGNATED_RESERVOIRS = {
        "idukki": {
            "key": "idukki",
            "name": "Idukki Reservoir",
            "state": "Kerala",
            "latitude": 9.85,
            "longitude": 76.97,
            "river": "Periyar",
            "full_reservoir_level_m": 732.4,
            "swot_lake_id": "SWOT_LAKE_IN_IDUKKI",
            "type": "Hydroelectric Arch Dam",
            "description": "Major arch dam reservoir in Western Ghats, Kerala."
        },
        "nagarjuna_sagar": {
            "key": "nagarjuna_sagar",
            "name": "Nagarjuna Sagar Reservoir",
            "state": "Andhra Pradesh / Telangana",
            "latitude": 16.57,
            "longitude": 79.31,
            "river": "Krishna",
            "full_reservoir_level_m": 179.8,
            "swot_lake_id": "SWOT_LAKE_IN_NAGARJUNA",
            "type": "Multipurpose Masonry Dam",
            "description": "Major masonry dam reservoir across Krishna River bordering Andhra Pradesh and Telangana."
        },
        "sardar_sarovar": {
            "key": "sardar_sarovar",
            "name": "Sardar Sarovar Reservoir",
            "state": "Gujarat",
            "latitude": 21.83,
            "longitude": 73.75,
            "river": "Narmada",
            "full_reservoir_level_m": 138.68,
            "swot_lake_id": "SWOT_LAKE_IN_SARDAR_SAROVAR",
            "type": "Gravity Dam Reservoir",
            "description": "Terminal multipurpose reservoir on Narmada River in Gujarat."
        }
    }

    def __init__(self):
        pass

    @classmethod
    def get_phase_1_status(cls) -> Dict:
        """Returns Phase 1 implementation status and UI annotation guidance."""
        return {
            "phase": 1,
            "surface_water_statewide_available": False,
            "status": cls.STATUS_PHASE_1,
            "implementation_strategy": {
                "default_indicator": cls.DEFAULT_INDICATOR,
                "proxy_variable": cls.PROXY_VARIABLE,
                "proxy_source": cls.PROXY_SOURCE,
                "ui_annotation": "Surface water across state boundaries is estimated using soil wetness / GLDAS runoff proxies."
            },
            "future_phase": {
                "mission": "SWOT (Surface Water and Ocean Topography)",
                "product": "SWOT Vector Lake Products",
                "launch_year": cls.SWOT_LAUNCH_YEAR,
                "disclaimer": cls.LAUNCH_ERA_DISCLAIMER,
                "designated_reservoirs": list(cls.DESIGNATED_RESERVOIRS.keys())
            }
        }

    @classmethod
    def get_designated_reservoirs(cls) -> Dict[str, dict]:
        """Returns metadata for designated Indian reservoirs."""
        return cls.DESIGNATED_RESERVOIRS

    @classmethod
    def get_reservoir_by_name(cls, query: str) -> Optional[dict]:
        """Looks up a designated reservoir by key or friendly name."""
        q = query.lower().strip()
        if q in cls.DESIGNATED_RESERVOIRS:
            return cls.DESIGNATED_RESERVOIRS[q]
        for key, res in cls.DESIGNATED_RESERVOIRS.items():
            if q in res["name"].lower() or key in q:
                return res
        return None

    @classmethod
    def get_disclaimer(cls) -> str:
        """Returns the SWOT launch-era disclaimer."""
        return cls.LAUNCH_ERA_DISCLAIMER

    def fetch_reservoir_elevation(
        self,
        reservoir_name: str,
        start_date: str,
        end_date: str
    ) -> Dict:
        """
        Ingests SWOT vector lake products for designated Indian reservoirs.
        Enforces launch-era disclaimer (2022 onwards).
        """
        res_meta = self.get_reservoir_by_name(reservoir_name)
        if not res_meta:
            valid_names = [r["name"] for r in self.DESIGNATED_RESERVOIRS.values()]
            raise ValueError(f"Unknown reservoir '{reservoir_name}'. Designated reservoirs: {valid_names}")

        # Check launch era (2022 onwards)
        try:
            start_year = int(start_date.split("-")[0].strip())
        except (ValueError, IndexError):
            start_year = 2022

        pre_launch_warning = None
        if start_year < self.SWOT_LAUNCH_YEAR:
            pre_launch_warning = (
                f"Historical request starting in {start_year} precedes SWOT mission launch ({self.SWOT_LAUNCH_YEAR}). "
                + self.LAUNCH_ERA_DISCLAIMER
            )

        return {
            "status": "swot_reservoir_record",
            "reservoir": res_meta,
            "mission": "NASA/CNES SWOT",
            "product": "SWOT Vector Lake Surface Water Elevation Product (L2_HR_LakeSP)",
            "start_date": start_date,
            "end_date": end_date,
            "launch_year": self.SWOT_LAUNCH_YEAR,
            "disclaimer": self.LAUNCH_ERA_DISCLAIMER,
            "warning": pre_launch_warning,
            "data_coverage": f"{self.SWOT_LAUNCH_YEAR}-present",
            "elevation_units": "meters",
            "measurements": []
        }
