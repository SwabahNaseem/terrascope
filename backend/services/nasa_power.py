"""
NASA POWER API Client Service
Handles retrieval of meteorological and solar parameters at point coordinates.
<<<<<<< Updated upstream
Implements exponential backoff retries, local file caching, and offline fallback.
"""

import json
import time
from pathlib import Path
from typing import Dict, List, Optional, Any
=======

Primary Data Provider: NASA POWER API
- Base Endpoint: https://power.larc.nasa.gov/api/temporal/
- Spatial Resolution: 0.5° x 0.5° latitude/longitude grid
- Coverage: 1981 to present (typically lagged by 2–3 months)
"""

import json
import math
import os
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union
import urllib.parse
import urllib.request
import urllib.error
>>>>>>> Stashed changes


class NasaPowerService:
    """Client interface for interacting with the NASA POWER REST API."""

    BASE_ENDPOINT = "https://power.larc.nasa.gov/api/temporal/"
    SPATIAL_RESOLUTION = 0.5  # degrees (0.5° x 0.5° grid)
    EARLIEST_YEAR = 1981
    DEFAULT_LAG_DAYS = 75  # typically lagged by 2-3 months

    # Parameter Specifications conforming to NASA POWER Ingestion Standards
    PARAMETER_SPECIFICATIONS = {
        "temperature": {
            "code": "T2M",
            "internal_key": "temperature",
            "friendly_name": "Air Temperature at 2 Meters",
            "native_units": "°C",
            "display_units": "°C",
            "notes": "Daily mean, aggregated to monthly/yearly"
        },
        "precipitation": {
            "code": "PRECTOTCORR",
            "internal_key": "precipitation",
            "friendly_name": "Precipitation Corrected",
            "native_units": "mm/day",
            "display_units": "mm/year or mm/month",
            "notes": "Summed over aggregation window"
        },
        "soil_moisture_top": {
            "code": "GWETTOP",
            "internal_key": "soil_moisture_top",
            "friendly_name": "Surface Soil Wetness (0–5 cm)",
            "native_units": "0–1 fraction",
            "display_units": "Fraction (0 to 1)",
            "notes": "Dimensionless soil moisture ratio"
        },
        "soil_moisture_root": {
            "code": "GWETROOT",
            "internal_key": "soil_moisture_root",
            "friendly_name": "Root Zone Soil Wetness (0–100 cm)",
            "native_units": "0–1 fraction",
            "display_units": "Fraction (0 to 1)",
            "notes": "Dimensionless root zone ratio"
        }
    }

    # Internal key to NASA POWER parameter code map
    PARAMETER_MAP = {
        "temperature": "T2M",
        "precipitation": "PRECTOTCORR",
        "soil_moisture_top": "GWETTOP",
        "soil_moisture_root": "GWETROOT",
<<<<<<< Updated upstream
        "water_surface": "SWOT_PROXY"
    }

    REVERSE_PARAMETER_MAP = {v: k for k, v in PARAMETER_MAP.items()}
=======
        # Backward compatibility alias
        "soil_moisture": "GWETTOP"
    }

    # NASA POWER parameter code to internal key map
    CODE_TO_KEY = {
        "T2M": "temperature",
        "PRECTOTCORR": "precipitation",
        "GWETTOP": "soil_moisture_top",
        "GWETROOT": "soil_moisture_root"
    }

    FILL_VALUE = -999.0
>>>>>>> Stashed changes

    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout: int = 30,
        max_retries: int = 3,
<<<<<<< Updated upstream
        cache_dir: Optional[Path] = None
    ):
        base_dir = Path(__file__).resolve().parent.parent.parent
        self.base_url = (base_url or "https://power.larc.nasa.gov/api/temporal/").rstrip("/") + "/"
        self.timeout = timeout
        self.max_retries = max_retries
        self.cache_dir = Path(cache_dir) if cache_dir else base_dir / "data" / "cache" / "power"
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def _format_date(date_str: str, default_month_day: str = "0101") -> str:
        """Standardizes date to YYYYMMDD format required by NASA POWER API."""
        clean = str(date_str).strip().replace("-", "")
        if len(clean) == 4:  # YYYY
            return f"{clean}{default_month_day}"
        if len(clean) == 6:  # YYYYMM
            return f"{clean}01"
        if len(clean) >= 8:  # YYYYMMDD
            return clean[:8]
        return f"2000{default_month_day}"

    def _get_cache_key(self, lat: float, lon: float, params_str: str, start: str, end: str) -> Path:
        """Constructs unique cache filepath."""
        filename = f"power_{lat:.2f}_{lon:.2f}_{params_str}_{start}_{end}.json"
        return self.cache_dir / filename
=======
        cache_dir: Optional[Union[str, Path]] = None
    ):
        self.base_url = (base_url or self.BASE_ENDPOINT).rstrip("/") + "/"
        self.timeout = timeout
        self.max_retries = max_retries
        
        if cache_dir:
            self.cache_dir = Path(cache_dir)
        else:
            base_dir = Path(__file__).resolve().parent.parent.parent
            self.cache_dir = base_dir / "data" / "cache" / "power"
        
        try:
            self.cache_dir.mkdir(parents=True, exist_ok=True)
        except Exception:
            pass

    @classmethod
    def get_parameter_spec(cls, key_or_code: str) -> Optional[dict]:
        """Returns parameter specification by internal key or NASA parameter code."""
        if key_or_code in cls.PARAMETER_SPECIFICATIONS:
            return cls.PARAMETER_SPECIFICATIONS[key_or_code]
        if key_or_code == "soil_moisture":
            return cls.PARAMETER_SPECIFICATIONS["soil_moisture_top"]
        if key_or_code in cls.CODE_TO_KEY:
            internal_key = cls.CODE_TO_KEY[key_or_code]
            return cls.PARAMETER_SPECIFICATIONS.get(internal_key)
        return None

    @classmethod
    def snap_to_grid(cls, latitude: float, longitude: float) -> Tuple[float, float]:
        """
        Snaps coordinates to the nearest 0.5° x 0.5° NASA POWER assimilation grid center.
        Grid points are at offsets of 0.25° or multiples of 0.5°.
        """
        # NASA POWER 0.5° grid points align at multiples of 0.5 or half-degree steps
        snapped_lat = round(latitude * 2.0) / 2.0
        snapped_lon = round(longitude * 2.0) / 2.0
        return round(snapped_lat, 4), round(snapped_lon, 4)

    def get_latest_available_date(self) -> str:
        """
        Determines the most recent validated date present in the NASA POWER archive.
        Typically lagged by 2–3 months from the present date.
        """
        lagged_date = datetime.now() - timedelta(days=self.DEFAULT_LAG_DAYS)
        return lagged_date.strftime("%Y-%m-%d")

    def _normalize_date_string(self, date_str: str, api_type: str = "daily") -> str:
        """Normalizes date input (YYYY-MM-DD, YYYYMMDD, or YYYY) into format expected by API."""
        clean = date_str.replace("-", "").strip()
        if api_type == "daily":
            if len(clean) == 4:
                return f"{clean}0101"
            elif len(clean) == 8:
                return clean
        elif api_type in ("monthly", "climatology"):
            if len(clean) >= 4:
                return clean[:4]
        return clean

    def _get_cache_path(
        self,
        lat: float,
        lon: float,
        param_codes: List[str],
        start: str,
        end: str,
        api_type: str
    ) -> Path:
        """Constructs unique cache file path for query parameters."""
        sorted_params = "_".join(sorted(param_codes))
        filename = f"power_{lat:.2f}_{lon:.2f}_{sorted_params}_{start}_{end}_{api_type}.json"
        return self.cache_dir / filename

    def build_query_url(
        self,
        latitude: float,
        longitude: float,
        parameter_codes: List[str],
        start_date: str,
        end_date: str,
        temporal_community: str = "ag",
        api_type: str = "daily"
    ) -> str:
        """
        Constructs the NASA POWER temporal REST API endpoint URL.
        Example:
        https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,PRECTOTCORR&community=ag&longitude=76.5&latitude=10.5&start=20000101&end=20251231&format=JSON
        """
        params_str = ",".join(parameter_codes)
        start_clean = self._normalize_date_string(start_date, api_type)
        end_clean = self._normalize_date_string(end_date, api_type)

        query_dict = {
            "parameters": params_str,
            "community": temporal_community,
            "longitude": f"{longitude:.4f}",
            "latitude": f"{latitude:.4f}",
            "start": start_clean,
            "end": end_clean,
            "format": "JSON"
        }
        
        endpoint = f"{self.base_url}{api_type}/point"
        return f"{endpoint}?{urllib.parse.urlencode(query_dict)}"

    def _clean_series_fill_values(self, parameter_dict: dict) -> dict:
        """Replaces NASA POWER -999.0 fill values with None."""
        cleaned = {}
        for date_key, val in parameter_dict.items():
            if val is None or val == self.FILL_VALUE or val <= -900:
                cleaned[date_key] = None
            else:
                cleaned[date_key] = float(val)
        return cleaned
>>>>>>> Stashed changes

    def fetch_point_series(
        self,
        latitude: float,
        longitude: float,
        parameters: List[str],
<<<<<<< Updated upstream
        start_date: str = "20000101",
        end_date: str = "20250930",
        temporal_community: str = "ag"
    ) -> Dict[str, Any]:
        """
        Fetches daily point time series from NASA POWER API.
        Checks local cache first, attempts network retrieval with exponential retry,
        replaces -999.0 sentinel with None, and caches result.
        """
        # Map parameters to NASA POWER codes
        power_params = []
        for p in parameters:
            code = self.PARAMETER_MAP.get(p, p.upper())
            if code not in power_params:
                power_params.append(code)

        if not power_params:
            power_params = ["T2M"]

        start_fmt = self._format_date(start_date, "0101")
        end_fmt = self._format_date(end_date, "1231")
        params_key = "_".join(sorted(power_params))

        cache_path = self._get_cache_key(latitude, longitude, params_key, start_fmt, end_fmt)
        if cache_path.exists():
            try:
                with open(cache_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass

        # Build NASA POWER API request URL
        params_query = ",".join(power_params)
        endpoint = (
            f"{self.base_url}daily/point?"
            f"parameters={params_query}&community={temporal_community}&"
            f"longitude={longitude:.4f}&latitude={latitude:.4f}&"
            f"start={start_fmt}&end={end_fmt}&format=JSON"
        )

        response_data = None
        last_error = None

        # Execute request with exponential backoff
        for attempt in range(self.max_retries):
            try:
                import urllib.request
                req = urllib.request.Request(
                    endpoint,
                    headers={"User-Agent": "TerraScope-India-Trend-Detective/1.0"}
                )
                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    if resp.status == 200:
                        raw_json = json.loads(resp.read().decode("utf-8"))
                        props = raw_json.get("properties", {})
                        param_series = props.get("parameter", {})

                        # Clean -999.0 sentinels
                        cleaned_series = {}
                        for p_code, series in param_series.items():
                            cleaned_series[p_code] = {
                                date_k: (val if val != -999.0 else None)
                                for date_k, val in series.items()
                            }

                        response_data = {
                            "status": "success",
                            "source": "NASA POWER API",
                            "latitude": latitude,
                            "longitude": longitude,
                            "parameters": power_params,
                            "start_date": start_fmt,
                            "end_date": end_fmt,
                            "data": cleaned_series
                        }
                        break
            except Exception as e:
                last_error = str(e)
                time.sleep(1.5 ** attempt)

        # If API retrieval succeeded, cache and return
        if response_data is not None:
            try:
                with open(cache_path, "w", encoding="utf-8") as f:
                    json.dump(response_data, f, indent=2)
            except Exception:
                pass
            return response_data

        # Fallback response when offline or external API is unavailable
        return {
            "status": "offline_fallback",
            "message": f"External NASA POWER API unavailable ({last_error}). Using synthetic fallback.",
            "latitude": latitude,
            "longitude": longitude,
            "parameters": power_params,
            "start_date": start_fmt,
            "end_date": end_fmt,
            "data": {}
        }

    def get_latest_available_date(self) -> str:
        """Determines the most recent validated date present in the NASA POWER archive."""
        return "2025-09-30"
=======
        start_date: str,
        end_date: str,
        temporal_community: str = "ag",
        api_type: str = "daily"
    ) -> Dict:
        """
        Fetches point time series from NASA POWER API with caching and exponential retry backoff.
        
        Args:
            latitude: Latitude coordinate (-90 to 90)
            longitude: Longitude coordinate (-180 to 180)
            parameters: List of parameter codes (e.g. ['T2M']) or internal keys (e.g. ['temperature'])
            start_date: Start date (YYYY-MM-DD or YYYY)
            end_date: End date (YYYY-MM-DD or YYYY)
            temporal_community: Community code ('ag' for agroclimatology, 're' for renewable energy)
            api_type: Temporal aggregation API ('daily', 'monthly', 'climatology')
            
        Returns:
            Dictionary containing metadata, spatial resolution info, and ingested parameters.
        """
        # Resolve parameters to NASA POWER codes
        resolved_codes = []
        for p in parameters:
            p_upper = p.upper()
            if p in self.PARAMETER_MAP:
                resolved_codes.append(self.PARAMETER_MAP[p])
            elif p_upper in self.CODE_TO_KEY:
                resolved_codes.append(p_upper)
            else:
                resolved_codes.append(p)
        resolved_codes = sorted(list(set(resolved_codes)))

        snapped_lat, snapped_lon = self.snap_to_grid(latitude, longitude)
        cache_path = self._get_cache_path(
            snapped_lat, snapped_lon, resolved_codes, start_date, end_date, api_type
        )

        # 1. Check local cache
        if cache_path.exists():
            try:
                with open(cache_path, "r", encoding="utf-8") as f:
                    cached_data = json.load(f)
                    cached_data["from_cache"] = True
                    return cached_data
            except Exception:
                pass

        # 2. Build API request URL
        url = self.build_query_url(
            snapped_lat, snapped_lon, resolved_codes, start_date, end_date, temporal_community, api_type
        )

        headers = {
            "User-Agent": "TerraScope-India-Trend-Detective/1.0 (NASA POWER Client)",
            "Accept": "application/json"
        }

        # 3. Execute HTTP request with exponential backoff
        raw_response = None
        last_error = None
        for attempt in range(1, self.max_retries + 1):
            try:
                req = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(req, timeout=self.timeout) as response:
                    if response.status == 200:
                        raw_response = json.loads(response.read().decode("utf-8"))
                        break
            except urllib.error.HTTPError as he:
                last_error = he
                # Backoff on rate limit (429) or server error (500, 502, 503, 504)
                if he.code in (429, 500, 502, 503, 504) and attempt < self.max_retries:
                    sleep_time = (2 ** attempt) * 0.5
                    time.sleep(sleep_time)
                else:
                    break
            except Exception as e:
                last_error = e
                if attempt < self.max_retries:
                    sleep_time = (2 ** attempt) * 0.5
                    time.sleep(sleep_time)
                else:
                    break

        # 4. Process and standardize response
        if raw_response and "properties" in raw_response and "parameter" in raw_response["properties"]:
            raw_params = raw_response["properties"]["parameter"]
            cleaned_data = {}
            for code, series in raw_params.items():
                internal_key = self.CODE_TO_KEY.get(code, code.lower())
                cleaned_series = self._clean_series_fill_values(series)
                cleaned_data[internal_key] = {
                    "code": code,
                    "series": cleaned_series,
                    "spec": self.get_parameter_spec(code)
                }

            result = {
                "status": "success",
                "source": "NASA POWER API",
                "base_endpoint": self.BASE_ENDPOINT,
                "spatial_resolution": f"{self.SPATIAL_RESOLUTION}° x {self.SPATIAL_RESOLUTION}°",
                "coverage": {
                    "earliest_year": self.EARLIEST_YEAR,
                    "latest_available": self.get_latest_available_date()
                },
                "coordinates": {
                    "requested": [latitude, longitude],
                    "snapped_grid": [snapped_lat, snapped_lon]
                },
                "parameters": resolved_codes,
                "data": cleaned_data,
                "from_cache": False
            }

            # Save to cache
            try:
                with open(cache_path, "w", encoding="utf-8") as f:
                    json.dump(result, f, indent=2)
            except Exception:
                pass

            return result

        # 5. Fallback if offline / external network unreachable
        return {
            "status": "offline_or_unavailable",
            "message": f"NASA POWER API request failed: {last_error}",
            "source": "NASA POWER API",
            "base_endpoint": self.BASE_ENDPOINT,
            "spatial_resolution": f"{self.SPATIAL_RESOLUTION}° x {self.SPATIAL_RESOLUTION}°",
            "coverage": {
                "earliest_year": self.EARLIEST_YEAR,
                "latest_available": self.get_latest_available_date()
            },
            "coordinates": {
                "requested": [latitude, longitude],
                "snapped_grid": [snapped_lat, snapped_lon]
            },
            "parameters": resolved_codes,
            "data": {},
            "from_cache": False
        }
>>>>>>> Stashed changes
