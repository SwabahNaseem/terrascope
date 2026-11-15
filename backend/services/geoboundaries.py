"""
geoBoundaries Service Client
Provides authoritative global administrative boundary GeoJSON datasets via geoBoundaries API.

Hierarchy Levels:
- ADM0: Country / National boundaries (individual countries or world view)
- ADM1: State / Province / First-level administrative divisions
- ADM2: District / County / Second-level administrative divisions

Data Source: geoBoundaries Open Database (gbOpen) & Global Administrative Datasets
API: https://www.geoboundaries.org/api/current/gbOpen/{ISO3}/{ADM}/
License: CC-BY 4.0 / Open Data Commons Open Database License (ODbL)
Attribution: geoBoundaries (Runfola et al., 2020)
"""

import json
import logging
import os
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

logger = logging.getLogger(__name__)


class GeoBoundariesService:
    """Service client for fetching, caching, and serving geoBoundaries administrative boundaries."""

    DEFAULT_API_URL = "https://www.geoboundaries.org/api/current/gbOpen/"
    ATTRIBUTION = "Boundaries &copy; geoBoundaries (CC-BY 4.0 / ODbL) - Runfola et al."
    LICENSE_URL = "https://www.geoboundaries.org/"

    # Standard property names used across various geoBoundaries datasets
    NAME_KEYS = [
        "shapeName", "name", "NAME_1", "NAME_2", "NAME_0", "admin_name", "ADMIN",
        "shapeGroup", "Country", "SOVEREIGNT", "ADMIN_NAME"
    ]
    CODE_KEYS = [
        "shapeISO", "shapeID", "ISO3166-1-Alpha-3", "ISO_A3", "ISO_1", "ISO_2",
        "id", "state_code", "adm_code", "code"
    ]
    GROUP_KEYS = ["shapeGroup", "adm0_a3", "COUNTRY", "parent", "NAME_0", "state"]

    # Known district memberships for Indian states to enable precise ADM2 drill-down
    STATE_DISTRICTS = {
        "kerala": [
            "alappuzha", "ernakulam", "idukki", "kannur", "kasaragod",
            "kollam", "kottayam", "kozhikode", "malappuram", "palakkad",
            "pathanamthitta", "thiruvananthapuram", "thrissur", "wayanad"
        ],
        "tamil nadu": [
            "ariyalur", "chengalpattu", "chennai", "coimbatore", "cuddalore",
            "dharmapuri", "dindigul", "erode", "kallakurichi", "kancheepuram",
            "kanyakumari", "karur", "krishnagiri", "madurai", "mayiladuthurai",
            "nagapattinam", "namakkal", "nilgiris", "perambalur", "pudukkottai",
            "ramanathapuram", "ranipet", "salem", "sivaganga", "tenkasi",
            "thanjavur", "theni", "thoothukudi", "tiruchirappalli", "tirunelveli",
            "tirupathur", "tiruppur", "tiruvallur", "tiruvannamalai", "tiruvarur",
            "vellore", "viluppuram", "virudhunagar"
        ],
        "karnataka": [
            "bagalkot", "ballari", "belagavi", "bengaluru rural", "bengaluru urban",
            "bidar", "chamarajanagar", "chikkaballapur", "chikkamagaluru", "chitradurga",
            "dakshina kannada", "davanagere", "dharwad", "gadag", "hassan",
            "haveri", "kalaburagi", "kodagu", "kolar", "koppal",
            "mandya", "mysuru", "raichur", "ramanagara", "shivamogga",
            "tumakuru", "udupi", "uttara kannada", "vijayanagara", "vijayapura", "yadgir"
        ],
        "andhra pradesh": [
            "alluri sitharama raju", "anakapalli", "anantapur", "annamayya", "bapatla",
            "chittoor", "east godavari", "eluru", "guntur", "kakinada",
            "konaseema", "krishna", "kurnool", "nandyal", "ntr",
            "palnadu", "parvathipuram manyam", "prakasam", "sri potti sriramulu nellore",
            "sri sathya sai", "srikakulam", "tirupati", "visakhapatnam", "vizianagaram",
            "west godavari", "ysr"
        ],
        "maharashtra": [
            "ahmednagar", "akola", "amravati", "aurangabad", "beed",
            "bhandara", "buldhana", "chandrapur", "dhule", "gadchiroli",
            "gondia", "hingoli", "jalgaon", "jalna", "kolhapur",
            "latur", "mumbai", "mumbai suburban", "nagpur", "nanded",
            "nandurbar", "nashik", "osmanabad", "palghar", "parbhani",
            "pune", "raigad", "ratnagiri", "sangli", "satara",
            "sindhudurg", "solapur", "thane", "wardha", "washim", "yavatmal"
        ]
    }

    def __init__(
        self,
        cache_dir: Optional[Union[str, Path]] = None,
        base_url: Optional[str] = None
    ):
        base_dir = Path(__file__).resolve().parent.parent.parent
        self.cache_dir = Path(cache_dir or (base_dir / "data" / "cache" / "geoboundaries"))
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.base_url = (base_url or self.DEFAULT_API_URL).rstrip("/") + "/"
        self.fallback_india_geojson = base_dir / "frontend" / "assets" / "geo" / "india_states.geojson"
        self.world_countries_geojson = base_dir / "frontend" / "assets" / "geo" / "world_countries.geojson"
        self.kerala_districts_geojson = base_dir / "frontend" / "assets" / "geo" / "kerala_districts.geojson"

    def get_boundaries(
        self,
        iso3: str = "IND",
        adm_level: str = "ADM1",
        parent_filter: Optional[str] = None,
        prefer_simplified: bool = True
    ) -> Dict[str, Any]:
        """
        Retrieves boundary GeoJSON for the specified ISO3 country and ADM level.
        Checks local cache first; if missing, calls geoBoundaries API and downloads gjDownloadURL.
        """
        iso3_clean = (iso3 or "IND").strip().upper()
        adm_clean = (adm_level or "ADM1").strip().upper()

        if adm_clean not in ("ADM0", "ADM1", "ADM2"):
            adm_clean = "ADM1"

        # 1. Global / Worldwide Countries View
        if iso3_clean in ("WORLD", "ALL", "GLOBAL") and adm_clean == "ADM0":
            world_data = self._load_world_countries()
            if world_data:
                return self._normalize_feature_properties(world_data, "ADM0", "WORLD")

        # 2. Check parent-specific cache first (e.g., IND_ADM2_Kerala.geojson)
        if parent_filter and adm_clean == "ADM2":
            parent_clean = parent_filter.strip().replace(" ", "_")
            parent_cache_path = self.cache_dir / f"{iso3_clean}_{adm_clean}_{parent_clean}.geojson"
            if parent_cache_path.exists():
                try:
                    with open(parent_cache_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    return self._normalize_feature_properties(data, adm_clean, iso3_clean)
                except Exception as e:
                    logger.warning("Error reading parent cache: %s", e)

            # Special case for Kerala districts fallback
            if iso3_clean == "IND" and parent_clean.lower() == "kerala" and self.kerala_districts_geojson.exists():
                try:
                    with open(self.kerala_districts_geojson, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    return self._normalize_feature_properties(data, adm_clean, iso3_clean)
                except Exception as e:
                    logger.warning("Error reading kerala_districts.geojson: %s", e)

        # 3. Check country-level cache (e.g., IND_ADM1.geojson, IND_ADM2.geojson, USA_ADM1.geojson)
        cache_filename = f"{iso3_clean}_{adm_clean}.geojson"
        cache_filepath = self.cache_dir / cache_filename

        geojson_data = None

        if cache_filepath.exists():
            try:
                with open(cache_filepath, "r", encoding="utf-8") as f:
                    geojson_data = json.load(f)
                logger.info("Loaded boundaries from cache: %s", cache_filepath)
            except Exception as e:
                logger.warning("Error reading cached boundaries %s: %s", cache_filepath, e)
                geojson_data = None

        # 4. Fetch from geoBoundaries API if not cached
        if not geojson_data:
            geojson_data = self._download_from_api(iso3_clean, adm_clean, prefer_simplified)
            if geojson_data:
                try:
                    with open(cache_filepath, "w", encoding="utf-8") as f:
                        json.dump(geojson_data, f)
                    logger.info("Saved boundaries to cache: %s", cache_filepath)
                except Exception as e:
                    logger.warning("Could not write cache file %s: %s", cache_filepath, e)

        # 5. Graceful fallback for India if network/API unavailable
        if not geojson_data and iso3_clean == "IND":
            if adm_clean == "ADM1":
                geojson_data = self._load_fallback_india()
            elif adm_clean == "ADM2" and parent_filter and parent_filter.lower() == "kerala":
                if self.kerala_districts_geojson.exists():
                    try:
                        with open(self.kerala_districts_geojson, "r", encoding="utf-8") as f:
                            geojson_data = json.load(f)
                    except Exception:
                        pass

        # 6. If still no data, return empty FeatureCollection with informative metadata
        if not geojson_data:
            return {
                "type": "FeatureCollection",
                "features": [],
                "metadata": {
                    "iso3": iso3_clean,
                    "adm_level": adm_clean,
                    "status": "unavailable",
                    "message": f"Boundaries for {iso3_clean} {adm_clean} could not be retrieved from geoBoundaries API.",
                    "attribution": self.ATTRIBUTION,
                    "license": "CC-BY 4.0 / ODbL"
                }
            }

        # 7. Apply parent filter for ADM2 if requested
        if parent_filter and adm_clean == "ADM2" and "features" in geojson_data:
            filtered_features = self._filter_features_by_parent(geojson_data["features"], parent_filter)
            geojson_data = {
                **geojson_data,
                "features": filtered_features,
                "filter_applied": {"parent": parent_filter, "match_count": len(filtered_features)}
            }

        # 8. Normalize GeoJSON properties dynamically
        geojson_data = self._normalize_feature_properties(geojson_data, adm_clean, iso3_clean)

        # Ensure metadata and attribution
        if "metadata" not in geojson_data:
            geojson_data["metadata"] = {}

        geojson_data["metadata"].update({
            "iso3": iso3_clean,
            "adm_level": adm_clean,
            "parent_filter": parent_filter,
            "source": "geoBoundaries",
            "attribution": self.ATTRIBUTION,
            "license": "CC-BY 4.0 / ODbL",
            "license_url": self.LICENSE_URL,
            "total_features": len(geojson_data.get("features", []))
        })

        return geojson_data

    def _load_world_countries(self) -> Optional[Dict[str, Any]]:
        """Loads worldwide countries GeoJSON."""
        candidates = [
            self.cache_dir / "ALL_ADM0.geojson",
            self.cache_dir / "WORLD_ADM0.geojson",
            self.world_countries_geojson
        ]
        for path in candidates:
            if path.exists():
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        return json.load(f)
                except Exception as e:
                    logger.warning("Error reading %s: %s", path, e)
        return None

    def _download_from_api(
        self,
        iso3: str,
        adm_level: str,
        prefer_simplified: bool = True
    ) -> Optional[Dict[str, Any]]:
        """Queries the geoBoundaries API metadata endpoint and downloads the GeoJSON."""
        api_url = f"{self.base_url}{iso3}/{adm_level}/"
        logger.info("Querying geoBoundaries API: %s", api_url)

        headers = {
            "User-Agent": "TerraScope-Trend-Detective/1.0 (Earth Systems Explorer)",
            "Accept": "application/json"
        }

        try:
            req = urllib.request.Request(api_url, headers=headers)
            with urllib.request.urlopen(req, timeout=12) as resp:
                meta = json.loads(resp.read().decode("utf-8"))

            download_url = None
            if prefer_simplified and meta.get("simplifiedGeometryGeoJSON"):
                download_url = meta.get("simplifiedGeometryGeoJSON")
            if not download_url:
                download_url = meta.get("gjDownloadURL")

            if not download_url:
                logger.error("No GeoJSON download URL in geoBoundaries response: %s", meta)
                return None

            logger.info("Downloading GeoJSON file from: %s", download_url)
            dl_req = urllib.request.Request(download_url, headers=headers)
            with urllib.request.urlopen(dl_req, timeout=30) as dl_resp:
                geojson = json.loads(dl_resp.read().decode("utf-8"))

            if isinstance(geojson, dict):
                geojson["metadata"] = {
                    "boundaryID": meta.get("boundaryID"),
                    "boundaryName": meta.get("boundaryName"),
                    "boundaryISO": meta.get("boundaryISO"),
                    "boundaryType": meta.get("boundaryType"),
                    "boundaryYear": meta.get("boundaryYearRepresented"),
                    "boundarySource": meta.get("boundarySource"),
                    "boundaryLicense": meta.get("boundaryLicense"),
                    "licenseDetail": meta.get("licenseDetail"),
                    "downloadURL": download_url
                }
            return geojson

        except Exception as e:
            logger.warning("Error fetching geoBoundaries data for %s %s: %s", iso3, adm_level, e)
            return None

    def _load_fallback_india(self) -> Optional[Dict[str, Any]]:
        """Loads local India states GeoJSON as an offline fallback."""
        if not self.fallback_india_geojson.exists():
            return None
        try:
            with open(self.fallback_india_geojson, "r", encoding="utf-8") as f:
                data = json.load(f)
            return data
        except Exception as e:
            logger.error("Error loading fallback India GeoJSON: %s", e)
            return None

    def _normalize_feature_properties(
        self,
        geojson_data: Dict[str, Any],
        adm_level: str,
        iso3: str
    ) -> Dict[str, Any]:
        """
        Dynamically detects property names in features and ensures consistent
        normalized properties ('name', 'code', 'parent', 'adm_level').
        """
        features = geojson_data.get("features", [])
        if not features or not isinstance(features, list):
            return geojson_data

        for feat in features:
            if not isinstance(feat, dict):
                continue
            props = feat.get("properties") or {}

            # Detect feature name dynamically
            name = None
            for key in self.NAME_KEYS:
                val = props.get(key)
                if val and isinstance(val, str) and val.strip():
                    name = val.strip()
                    break

            # Detect feature code / ISO
            code = None
            for key in self.CODE_KEYS:
                val = props.get(key)
                if val and isinstance(val, str) and val.strip():
                    code = val.strip()
                    break

            # Detect parent / group
            parent = None
            for key in self.GROUP_KEYS:
                val = props.get(key)
                if val and isinstance(val, str) and val.strip():
                    parent = val.strip()
                    break

            props["norm_name"] = name or props.get("name") or "Unknown"
            props["norm_code"] = code or props.get("id") or props.get("state_code") or ""
            props["norm_adm"] = adm_level
            props["norm_iso3"] = iso3

            if not props.get("name"):
                props["name"] = props["norm_name"]

            feat["properties"] = props

        return geojson_data

    def _filter_features_by_parent(
        self,
        features: List[Dict[str, Any]],
        parent_name: str
    ) -> List[Dict[str, Any]]:
        """
        Filters ADM2 district features matching a parent state name using:
        1. Known state-district membership lookup (e.g. Kerala's 14 districts)
        2. Property matches (shapeGroup, parent, state, NAME_1)
        """
        p_clean = parent_name.strip().lower()
        matched = []

        # 1. State district list lookup
        known_districts = self.STATE_DISTRICTS.get(p_clean)

        for feat in features:
            props = feat.get("properties") or {}
            feat_name = (
                props.get("norm_name") or
                props.get("shapeName") or
                props.get("name") or
                ""
            ).lower().strip()

            if known_districts and feat_name in known_districts:
                matched.append(feat)
                continue

            # Check explicit parent fields
            parent_val = (
                props.get("shapeGroup") or
                props.get("parent") or
                props.get("NAME_1") or
                props.get("state") or
                ""
            ).lower()

            if parent_val and (p_clean in parent_val or parent_val in p_clean) and parent_val != "ind":
                matched.append(feat)

        return matched if matched else features
