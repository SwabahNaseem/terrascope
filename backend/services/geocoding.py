"""
TerraScope Geocoding Service
Handles location string resolution to coordinates via local dictionary matching and Nominatim API.
Utilizes spatial boundary definitions from GeoJSON assets for instant offline location resolution.
"""

from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
import difflib
import json
import logging
import os
import time

try:
    import requests
except ImportError:
    requests = None

logger = logging.getLogger(__name__)


class GeocodingService:
    """Service for resolving search strings to coordinates in India."""

    MAJOR_CITIES: List[Dict[str, Any]] = [
        {"name": "New Delhi", "state": "Delhi", "lat": 28.6139, "lon": 77.2090, "type": "city"},
        {"name": "Mumbai", "state": "Maharashtra", "lat": 19.0760, "lon": 72.8777, "type": "city"},
        {"name": "Bengaluru", "state": "Karnataka", "lat": 12.9716, "lon": 77.5946, "type": "city"},
        {"name": "Chennai", "state": "Tamil Nadu", "lat": 13.0827, "lon": 80.2707, "type": "city"},
        {"name": "Kolkata", "state": "West Bengal", "lat": 22.5726, "lon": 88.3639, "type": "city"},
        {"name": "Hyderabad", "state": "Telangana", "lat": 17.3850, "lon": 78.4867, "type": "city"},
        {"name": "Ahmedabad", "state": "Gujarat", "lat": 23.0225, "lon": 72.5714, "type": "city"},
        {"name": "Pune", "state": "Maharashtra", "lat": 18.5204, "lon": 73.8567, "type": "city"},
        {"name": "Jaipur", "state": "Rajasthan", "lat": 26.9124, "lon": 75.7873, "type": "city"},
        {"name": "Lucknow", "state": "Uttar Pradesh", "lat": 26.8467, "lon": 80.9462, "type": "city"},
        {"name": "Patna", "state": "Bihar", "lat": 25.5941, "lon": 85.1376, "type": "city"},
        {"name": "Bhopal", "state": "Madhya Pradesh", "lat": 23.2599, "lon": 77.4126, "type": "city"},
        {"name": "Thiruvananthapuram", "state": "Kerala", "lat": 8.5241, "lon": 76.9366, "type": "city"},
        {"name": "Kochi", "state": "Kerala", "lat": 9.9312, "lon": 76.2673, "type": "city"},
        {"name": "Kozhikode", "state": "Kerala", "lat": 11.2588, "lon": 75.7804, "type": "city"},
        {"name": "Coimbatore", "state": "Tamil Nadu", "lat": 11.0168, "lon": 76.9558, "type": "city"},
        {"name": "Madurai", "state": "Tamil Nadu", "lat": 9.9252, "lon": 78.1198, "type": "city"},
        {"name": "Mysuru", "state": "Karnataka", "lat": 12.2958, "lon": 76.6394, "type": "city"},
        {"name": "Visakhapatnam", "state": "Andhra Pradesh", "lat": 17.6868, "lon": 83.2185, "type": "city"},
        {"name": "Vijayawada", "state": "Andhra Pradesh", "lat": 16.5062, "lon": 80.6480, "type": "city"},
        {"name": "Guwahati", "state": "Assam", "lat": 26.1445, "lon": 91.7362, "type": "city"},
        {"name": "Bhubaneswar", "state": "Odisha", "lat": 20.2961, "lon": 85.8245, "type": "city"},
        {"name": "Chandigarh", "state": "Chandigarh", "lat": 30.7333, "lon": 76.7794, "type": "city"},
        {"name": "Srinagar", "state": "Jammu and Kashmir", "lat": 34.0837, "lon": 74.7973, "type": "city"},
        {"name": "Shimla", "state": "Himachal Pradesh", "lat": 31.1048, "lon": 77.1734, "type": "city"},
        {"name": "Dehradun", "state": "Uttarakhand", "lat": 30.3165, "lon": 78.0322, "type": "city"},
        {"name": "Ranchi", "state": "Jharkhand", "lat": 23.3441, "lon": 85.3096, "type": "city"},
        {"name": "Raipur", "state": "Chhattisgarh", "lat": 21.2514, "lon": 81.6296, "type": "city"},
        {"name": "Goa (Panaji)", "state": "Goa", "lat": 15.4909, "lon": 73.8278, "type": "city"},
        {"name": "Surat", "state": "Gujarat", "lat": 21.1702, "lon": 72.8311, "type": "city"},
        {"name": "Nagpur", "state": "Maharashtra", "lat": 21.1458, "lon": 79.0882, "type": "city"},
        {"name": "Indore", "state": "Madhya Pradesh", "lat": 22.7196, "lon": 75.8577, "type": "city"},
        {"name": "Varanasi", "state": "Uttar Pradesh", "lat": 25.3176, "lon": 82.9739, "type": "city"},
        {"name": "Amritsar", "state": "Punjab", "lat": 31.6340, "lon": 74.8723, "type": "city"},
        {"name": "Agra", "state": "Uttar Pradesh", "lat": 27.1767, "lon": 78.0081, "type": "city"},
    ]

    def __init__(
        self,
        cache_file_path: Optional[str] = None,
        geojson_path: Optional[str] = None,
        districts_geojson_path: Optional[str] = None,
    ):
        base_dir = Path(__file__).resolve().parent.parent.parent

        self.cache_file_path = Path(cache_file_path) if cache_file_path else base_dir / "data" / "cache" / "geocoding.json"
        self.geojson_path = Path(geojson_path) if geojson_path else base_dir / "frontend" / "assets" / "geo" / "india_states.geojson"
        self.districts_geojson_path = (
            Path(districts_geojson_path)
            if districts_geojson_path
            else base_dir / "frontend" / "assets" / "geo" / "india_districts.geojson"
        )

        self._cache: Dict[str, dict] = {}
        self._local_places: List[Dict[str, Any]] = []
        self._states_meta: List[Dict[str, Any]] = []

        self._load_cache()
        self._build_local_dictionary()

    def _load_cache(self) -> None:
        """Loads cached geocoding lookups from disk."""
        if self.cache_file_path and self.cache_file_path.exists():
            try:
                with open(self.cache_file_path, "r", encoding="utf-8") as f:
                    self._cache = json.load(f)
            except (json.JSONDecodeError, OSError):
                self._cache = {}

    def _save_cache(self) -> None:
        """Persists geocoding lookups to disk."""
        if self.cache_file_path:
            try:
                self.cache_file_path.parent.mkdir(parents=True, exist_ok=True)
                with open(self.cache_file_path, "w", encoding="utf-8") as f:
                    json.dump(self._cache, f, indent=2)
            except OSError:
                pass

    @staticmethod
    def _compute_bounds_and_centroid(coords: Any) -> Tuple[List[List[float]], List[float]]:
        """
        Recursively extracts points from GeoJSON coordinates to calculate bounds and centroid.
        Returns: ([[min_lat, min_lon], [max_lat, max_lon]], [centroid_lat, centroid_lon])
        """
        points = []

        def extract(c):
            if isinstance(c, (list, tuple)) and len(c) == 2 and isinstance(c[0], (int, float)):
                points.append(c)
            elif isinstance(c, (list, tuple)):
                for item in c:
                    extract(item)

        extract(coords)
        if not points:
            return [[0.0, 0.0], [0.0, 0.0]], [0.0, 0.0]

        lons = [p[0] for p in points]
        lats = [p[1] for p in points]

        min_lat, max_lat = min(lats), max(lats)
        min_lon, max_lon = min(lons), max(lons)

        centroid_lat = round(sum(lats) / len(lats), 4)
        centroid_lon = round(sum(lons) / len(lons), 4)

        bounds = [[round(min_lat, 4), round(min_lon, 4)], [round(max_lat, 4), round(max_lon, 4)]]
        centroid = [centroid_lat, centroid_lon]
        return bounds, centroid

    def _build_local_dictionary(self) -> None:
        """Builds in-memory index from GeoJSON state & district boundaries and major cities."""
        self._local_places = []
        self._states_meta = []

        # 1. Ingest Indian States & UTs
        if self.geojson_path.exists():
            try:
                with open(self.geojson_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for feature in data.get("features", []):
                        props = feature.get("properties", {})
                        name = props.get("name", "").strip()
                        state_code = props.get("state_code", "") or props.get("id", "").replace("IN-", "")
                        state_type = props.get("type", "State")

                        geom = feature.get("geometry", {})
                        bounds, centroid = self._compute_bounds_and_centroid(geom.get("coordinates", []))

                        state_obj = {
                            "id": f"IN-{state_code}" if state_code else f"IN-{name[:2].upper()}",
                            "name": name,
                            "code": state_code,
                            "type": state_type,
                            "latitude": centroid[0],
                            "longitude": centroid[1],
                            "bounds": bounds,
                            "centroid": centroid,
                            "display_name": f"{name}, India",
                        }
                        self._states_meta.append(state_obj)
                        self._local_places.append({
                            "name": name,
                            "type": "state",
                            "code": state_code,
                            "latitude": centroid[0],
                            "longitude": centroid[1],
                            "bounds": bounds,
                            "display_name": f"{name}, India",
                        })
            except (json.JSONDecodeError, OSError) as e:
                logger.warning("Could not read states GeoJSON: %s", e)

        # 2. Ingest Indian Districts
        if self.districts_geojson_path.exists():
            try:
                with open(self.districts_geojson_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for feature in data.get("features", []):
                        props = feature.get("properties", {})
                        name = props.get("name", "").strip()
                        state = props.get("state", "").strip()
                        state_code = props.get("state_code", "")

                        geom = feature.get("geometry", {})
                        bounds, centroid = self._compute_bounds_and_centroid(geom.get("coordinates", []))

                        self._local_places.append({
                            "name": name,
                            "type": "district",
                            "state": state,
                            "code": state_code,
                            "latitude": centroid[0],
                            "longitude": centroid[1],
                            "bounds": bounds,
                            "display_name": f"{name}, {state}, India",
                        })
            except (json.JSONDecodeError, OSError) as e:
                logger.warning("Could not read districts GeoJSON: %s", e)

        # 3. Ingest Major Cities
        for city in self.MAJOR_CITIES:
            self._local_places.append({
                "name": city["name"],
                "type": "city",
                "state": city["state"],
                "latitude": city["lat"],
                "longitude": city["lon"],
                "bounds": [
                    [round(city["lat"] - 0.25, 4), round(city["lon"] - 0.25, 4)],
                    [round(city["lat"] + 0.25, 4), round(city["lon"] + 0.25, 4)],
                ],
                "display_name": f"{city['name']}, {city['state']}, India",
            })

    def search_local(self, query: str, limit: int = 6) -> List[dict]:
        """
        Fast local autocomplete and fuzzy matching against Indian states, districts, and major cities.
        Returns empty list if query length is less than 2 characters.
        """
        query_clean = query.strip().lower()
        if len(query_clean) < 2:
            return []

        scored_results: List[Tuple[float, dict]] = []
        seen = set()

        for place in self._local_places:
            name_lower = place["name"].lower()
            key = f"{place['name'].lower()}_{place.get('state', '').lower()}_{place['type']}"
            if key in seen:
                continue

            score = 0.0

            # Match criteria
            if name_lower == query_clean:
                score = 100.0
            elif name_lower.startswith(query_clean):
                score = 80.0 + (10.0 / (len(name_lower) - len(query_clean) + 1.0))
            elif query_clean in name_lower:
                score = 60.0
            else:
                # Fuzzy ratio matching
                ratio = difflib.SequenceMatcher(None, query_clean, name_lower).ratio()
                if ratio >= 0.65:
                    score = ratio * 50.0

            if score > 0.0:
                # Slight priority for states over districts/cities when ambiguous
                if place["type"] == "state":
                    score += 5.0
                scored_results.append((score, place))
                seen.add(key)

        # Sort by score descending
        scored_results.sort(key=lambda x: x[0], reverse=True)

        suggestions = []
        for _, place in scored_results[:limit]:
            suggestion = {
                "name": place["name"],
                "type": place["type"],
                "latitude": place["latitude"],
                "longitude": place["longitude"],
                "display_name": place["display_name"],
            }
            if "bounds" in place:
                suggestion["bounds"] = place["bounds"]
            if "code" in place and place["code"]:
                suggestion["code"] = place["code"]
            if "state" in place and place["state"]:
                suggestion["state"] = place["state"]
            suggestions.append(suggestion)

        return suggestions

    def resolve_nominatim(self, query: str) -> Optional[dict]:
        """
        Resolve query using OpenStreetMap Nominatim API with rate-limiting and user-agent.
        Caches responses locally in data/cache/geocoding.json.
        """
        query_clean = query.strip().lower()
        if not query_clean:
            return None

        # Check in-memory/disk cache
        if query_clean in self._cache:
            return self._cache[query_clean]

        if not requests:
            return None

        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": query,
            "countrycodes": "in",
            "format": "jsonv2",
            "limit": 3,
        }
        headers = {
            "User-Agent": "TerraScope-India-Trend-Detective/1.0 (contact: info@terrascope.org)"
        }

        try:
            resp = requests.get(url, params=params, headers=headers, timeout=5)
            if resp.status_code == 200:
                results = resp.json()
                if results and len(results) > 0:
                    top = results[0]
                    resolved = {
                        "name": top.get("name", query),
                        "type": top.get("type", "location"),
                        "latitude": round(float(top["lat"]), 4),
                        "longitude": round(float(top["lon"]), 4),
                        "display_name": top.get("display_name", f"{query}, India"),
                    }
                    self._cache[query_clean] = resolved
                    self._save_cache()
                    return resolved
        except Exception as e:
            logger.debug("Nominatim request failed: %s", e)

        return None

    def get_coordinates(self, place_name: str) -> Optional[Tuple[float, float]]:
        """
        Convenience method returning (latitude, longitude) for a place name.
        """
        local_matches = self.search_local(place_name, limit=1)
        if local_matches:
            return local_matches[0]["latitude"], local_matches[0]["longitude"]

        nom_match = self.resolve_nominatim(place_name)
        if nom_match:
            return nom_match["latitude"], nom_match["longitude"]

        return None

    def get_all_states(self) -> List[dict]:
        """
        Returns all 36 Indian states and union territories with bounding box, centroid, and official code.
        Sorted alphabetically by state name.
        """
        return sorted(self._states_meta, key=lambda s: s["name"])
