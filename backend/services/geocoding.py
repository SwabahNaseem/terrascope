"""
Geocoding Service
Handles worldwide location string resolution and reverse geocoding via Maps.co API,
local indexed dictionary matching, and OpenStreetMap Nominatim fallback.

Policy Compliance & Standards:
- Integrates Maps.co forward (https://geocode.maps.co/search) and reverse endpoints with API key.
- Strict caching in data/cache/geocoding.json.
- Rate limiting adherence (<= 1 request per second).
- Comprehensive local dictionary of Indian States/Districts and Major Global Metropolises for instant search.
"""

import difflib
import json
import os
import re
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any, Union
import urllib.parse
import urllib.request
import urllib.error

# Complete dataset of all 36 Indian states and union territories
INDIAN_STATES_DATA = [
    {"name": "Andaman and Nicobar Islands", "code": "AN", "type": "Union Territory", "lat": 11.6670, "lon": 92.7359, "capital": "Port Blair"},
    {"name": "Andhra Pradesh", "code": "AP", "type": "State", "lat": 15.9129, "lon": 79.7400, "capital": "Amaravati"},
    {"name": "Arunachal Pradesh", "code": "AR", "type": "State", "lat": 28.2180, "lon": 94.7278, "capital": "Itanagar"},
    {"name": "Assam", "code": "AS", "type": "State", "lat": 26.2006, "lon": 92.9376, "capital": "Dispur"},
    {"name": "Bihar", "code": "BR", "type": "State", "lat": 25.0961, "lon": 85.3131, "capital": "Patna"},
    {"name": "Chandigarh", "code": "CH", "type": "Union Territory", "lat": 30.7333, "lon": 76.7794, "capital": "Chandigarh"},
    {"name": "Chhattisgarh", "code": "CT", "type": "State", "lat": 21.2787, "lon": 81.8661, "capital": "Raipur"},
    {"name": "Dadra and Nagar Haveli and Daman and Diu", "code": "DH", "type": "Union Territory", "lat": 20.4283, "lon": 72.8397, "capital": "Daman"},
    {"name": "Delhi", "code": "DL", "type": "Union Territory", "lat": 28.7041, "lon": 77.1025, "capital": "New Delhi"},
    {"name": "Goa", "code": "GA", "type": "State", "lat": 15.2993, "lon": 74.1240, "capital": "Panaji"},
    {"name": "Gujarat", "code": "GJ", "type": "State", "lat": 22.2587, "lon": 71.1924, "capital": "Gandhinagar"},
    {"name": "Haryana", "code": "HR", "type": "State", "lat": 29.0588, "lon": 76.0856, "capital": "Chandigarh"},
    {"name": "Himachal Pradesh", "code": "HP", "type": "State", "lat": 31.1048, "lon": 77.1734, "capital": "Shimla"},
    {"name": "Jammu and Kashmir", "code": "JK", "type": "Union Territory", "lat": 33.7782, "lon": 76.5762, "capital": "Srinagar"},
    {"name": "Jharkhand", "code": "JH", "type": "State", "lat": 23.6102, "lon": 85.2799, "capital": "Ranchi"},
    {"name": "Karnataka", "code": "KA", "type": "State", "lat": 15.3173, "lon": 75.7139, "capital": "Bengaluru"},
    {"name": "Kerala", "code": "KL", "type": "State", "lat": 10.8505, "lon": 76.2711, "capital": "Thiruvananthapuram"},
    {"name": "Ladakh", "code": "LA", "type": "Union Territory", "lat": 34.1526, "lon": 77.5771, "capital": "Leh"},
    {"name": "Lakshadweep", "code": "LD", "type": "Union Territory", "lat": 10.5667, "lon": 72.6417, "capital": "Kavaratti"},
    {"name": "Madhya Pradesh", "code": "MP", "type": "State", "lat": 22.9734, "lon": 78.6569, "capital": "Bhopal"},
    {"name": "Maharashtra", "code": "MH", "type": "State", "lat": 19.7515, "lon": 75.7139, "capital": "Mumbai"},
    {"name": "Manipur", "code": "MN", "type": "State", "lat": 24.6637, "lon": 93.9063, "capital": "Imphal"},
    {"name": "Meghalaya", "code": "ML", "type": "State", "lat": 25.4670, "lon": 91.3662, "capital": "Shillong"},
    {"name": "Mizoram", "code": "MZ", "type": "State", "lat": 23.1645, "lon": 92.9376, "capital": "Aizawl"},
    {"name": "Nagaland", "code": "NL", "type": "State", "lat": 26.1584, "lon": 94.5624, "capital": "Kohima"},
    {"name": "Odisha", "code": "OR", "type": "State", "lat": 20.9517, "lon": 85.0985, "capital": "Bhubaneswar"},
    {"name": "Puducherry", "code": "PY", "type": "Union Territory", "lat": 11.9416, "lon": 79.8083, "capital": "Puducherry"},
    {"name": "Punjab", "code": "PB", "type": "State", "lat": 31.1471, "lon": 75.3412, "capital": "Chandigarh"},
    {"name": "Rajasthan", "code": "RJ", "type": "State", "lat": 27.0238, "lon": 74.2179, "capital": "Jaipur"},
    {"name": "Sikkim", "code": "SK", "type": "State", "lat": 27.5330, "lon": 88.5122, "capital": "Gangtok"},
    {"name": "Tamil Nadu", "code": "TN", "type": "State", "lat": 11.1271, "lon": 78.6569, "capital": "Chennai"},
    {"name": "Telangana", "code": "TG", "type": "State", "lat": 18.1124, "lon": 79.0193, "capital": "Hyderabad"},
    {"name": "Tripura", "code": "TR", "type": "State", "lat": 23.9408, "lon": 91.9882, "capital": "Agartala"},
    {"name": "Uttar Pradesh", "code": "UP", "type": "State", "lat": 26.8467, "lon": 80.9462, "capital": "Lucknow"},
    {"name": "Uttarakhand", "code": "UT", "type": "State", "lat": 30.0668, "lon": 79.0193, "capital": "Dehradun"},
    {"name": "West Bengal", "code": "WB", "type": "State", "lat": 22.9868, "lon": 87.8550, "capital": "Kolkata"},
]

# Major Indian Cities and Key Districts
MAJOR_INDIAN_CITIES = [
    {"name": "Mumbai", "type": "city", "state": "Maharashtra", "lat": 19.0760, "lon": 72.8777, "country": "India"},
    {"name": "Delhi", "type": "city", "state": "Delhi", "lat": 28.6139, "lon": 77.2090, "country": "India"},
    {"name": "Bengaluru", "type": "city", "state": "Karnataka", "lat": 12.9716, "lon": 77.5946, "country": "India"},
    {"name": "Hyderabad", "type": "city", "state": "Telangana", "lat": 17.3850, "lon": 78.4867, "country": "India"},
    {"name": "Ahmedabad", "type": "city", "state": "Gujarat", "lat": 23.0225, "lon": 72.5714, "country": "India"},
    {"name": "Chennai", "type": "city", "state": "Tamil Nadu", "lat": 13.0827, "lon": 80.2707, "country": "India"},
    {"name": "Kolkata", "type": "city", "state": "West Bengal", "lat": 22.5726, "lon": 88.3639, "country": "India"},
    {"name": "Pune", "type": "city", "state": "Maharashtra", "lat": 18.5204, "lon": 73.8567, "country": "India"},
    {"name": "Jaipur", "type": "city", "state": "Rajasthan", "lat": 26.9124, "lon": 75.7873, "country": "India"},
    {"name": "Lucknow", "type": "city", "state": "Uttar Pradesh", "lat": 26.8467, "lon": 80.9462, "country": "India"},
    {"name": "Kanpur", "type": "city", "state": "Uttar Pradesh", "lat": 26.4499, "lon": 80.3319, "country": "India"},
    {"name": "Nagpur", "type": "city", "state": "Maharashtra", "lat": 21.1458, "lon": 79.0882, "country": "India"},
    {"name": "Indore", "type": "city", "state": "Madhya Pradesh", "lat": 22.7196, "lon": 75.8577, "country": "India"},
    {"name": "Thiruvananthapuram", "type": "city", "state": "Kerala", "lat": 8.5241, "lon": 76.9366, "country": "India"},
    {"name": "Kochi", "type": "city", "state": "Kerala", "lat": 9.9312, "lon": 76.2673, "country": "India"},
    {"name": "Kozhikode", "type": "city", "state": "Kerala", "lat": 11.2588, "lon": 75.7804, "country": "India"},
    {"name": "Wayanad", "type": "district", "state": "Kerala", "lat": 11.6854, "lon": 76.1320, "country": "India"},
    {"name": "Idukki", "type": "district", "state": "Kerala", "lat": 9.8494, "lon": 76.9720, "country": "India"},
    {"name": "Palakkad", "type": "district", "state": "Kerala", "lat": 10.7867, "lon": 76.6548, "country": "India"},
    {"name": "Varanasi", "type": "city", "state": "Uttar Pradesh", "lat": 25.3176, "lon": 82.9739, "country": "India"},
    {"name": "Srinagar", "type": "city", "state": "Jammu and Kashmir", "lat": 34.0837, "lon": 74.7973, "country": "India"},
    {"name": "Bhopal", "type": "city", "state": "Madhya Pradesh", "lat": 23.2599, "lon": 77.4126, "country": "India"},
    {"name": "Patna", "type": "city", "state": "Bihar", "lat": 25.5941, "lon": 85.1376, "country": "India"},
    {"name": "Visakhapatnam", "type": "city", "state": "Andhra Pradesh", "lat": 17.6868, "lon": 83.2185, "country": "India"},
    {"name": "Shimla", "type": "city", "state": "Himachal Pradesh", "lat": 31.1048, "lon": 77.1734, "country": "India"},
    {"name": "Dehradun", "type": "city", "state": "Uttarakhand", "lat": 30.3165, "lon": 78.0322, "country": "India"},
    {"name": "Amritsar", "type": "city", "state": "Punjab", "lat": 31.6340, "lon": 74.8723, "country": "India"},
    {"name": "Bhubaneswar", "type": "city", "state": "Odisha", "lat": 20.2961, "lon": 85.8245, "country": "India"},
    {"name": "Guwahati", "type": "city", "state": "Assam", "lat": 26.1445, "lon": 91.7362, "country": "India"},
]

# Major Global Metropolises for Instant Worldwide Autocomplete
MAJOR_GLOBAL_CITIES = [
    {"name": "Tokyo", "country": "Japan", "lat": 35.6762, "lon": 139.6503, "type": "capital"},
    {"name": "London", "country": "United Kingdom", "lat": 51.5074, "lon": -0.1278, "type": "capital"},
    {"name": "New York", "country": "United States", "lat": 40.7128, "lon": -74.0060, "type": "city"},
    {"name": "Paris", "country": "France", "lat": 48.8566, "lon": 2.3522, "type": "capital"},
    {"name": "Singapore", "country": "Singapore", "lat": 1.3521, "lon": 103.8198, "type": "country"},
    {"name": "Sydney", "country": "Australia", "lat": -33.8688, "lon": 151.2093, "type": "city"},
    {"name": "Dubai", "country": "United Arab Emirates", "lat": 25.2048, "lon": 55.2708, "type": "city"},
    {"name": "Berlin", "country": "Germany", "lat": 52.5200, "lon": 13.4050, "type": "capital"},
    {"name": "Rome", "country": "Italy", "lat": 41.9028, "lon": 12.4964, "type": "capital"},
    {"name": "Madrid", "country": "Spain", "lat": 40.4168, "lon": -3.7038, "type": "capital"},
    {"name": "Toronto", "country": "Canada", "lat": 43.6532, "lon": -79.3832, "type": "city"},
    {"name": "Beijing", "country": "China", "lat": 39.9042, "lon": 116.4074, "type": "capital"},
    {"name": "Shanghai", "country": "China", "lat": 31.2304, "lon": 121.4737, "type": "city"},
    {"name": "Seoul", "country": "South Korea", "lat": 37.5665, "lon": 126.9780, "type": "capital"},
    {"name": "Bangkok", "country": "Thailand", "lat": 13.7563, "lon": 100.5018, "type": "capital"},
    {"name": "Cairo", "country": "Egypt", "lat": 30.0444, "lon": 31.2357, "type": "capital"},
    {"name": "Nairobi", "country": "Kenya", "lat": -1.2921, "lon": 36.8219, "type": "capital"},
    {"name": "São Paulo", "country": "Brazil", "lat": -23.5505, "lon": -46.6333, "type": "city"},
    {"name": "Buenos Aires", "country": "Argentina", "lat": -34.6037, "lon": -58.3816, "type": "capital"},
    {"name": "Cape Town", "country": "South Africa", "lat": -33.9249, "lon": 18.4241, "type": "city"},
    {"name": "San Francisco", "country": "United States", "lat": 37.7749, "lon": -122.4194, "type": "city"},
    {"name": "Los Angeles", "country": "United States", "lat": 34.0522, "lon": -118.2437, "type": "city"},
    {"name": "Chicago", "country": "United States", "lat": 41.8781, "lon": -87.6298, "type": "city"},
    {"name": "Moscow", "country": "Russia", "lat": 55.7558, "lon": 37.6173, "type": "capital"},
    {"name": "Istanbul", "country": "Turkey", "lat": 41.0082, "lon": 28.9784, "type": "city"},
]


class GeocodingService:
    """Service for resolving search strings to coordinates worldwide using Maps.co API & fallbacks."""

    MAPS_CO_BASE_URL = "https://geocode.maps.co/"
    MAPS_CO_API_KEY = "6af90b68bd2d8927044351jui42295"
    NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search"
    DEFAULT_USER_AGENT = "TerraScope-Trend-Detective/1.0 (contact: info@terrascope.org)"
    MIN_REQUEST_INTERVAL = 1.0  # seconds

    # Common historical & alternate city aliases
    CITY_ALIASES = {
        "bangalore": "bengaluru",
        "bombay": "mumbai",
        "calcutta": "kolkata",
        "madras": "chennai",
        "cochin": "kochi",
        "trivandrum": "thiruvananthapuram",
        "calicut": "kozhikode",
        "alleppey": "alappuzha",
        "quilon": "kollam",
        "palghat": "palakkad",
        "cannannore": "kannur",
        "banaras": "varanasi",
        "benares": "varanasi",
        "baroda": "vadodara",
        "poona": "pune"
    }

    def __init__(
        self,
        cache_file_path: Optional[Union[str, Path]] = None,
        maps_co_api_key: Optional[str] = None,
        user_agent: Optional[str] = None,
        rate_limit_delay: float = MIN_REQUEST_INTERVAL
    ):
        base_dir = Path(__file__).resolve().parent.parent.parent
        self.cache_file = Path(cache_file_path or (base_dir / "data" / "cache" / "geocoding.json"))
        self.maps_co_api_key = maps_co_api_key or self.MAPS_CO_API_KEY
        self.user_agent = user_agent or self.DEFAULT_USER_AGENT
        self.rate_limit_delay = max(rate_limit_delay, self.MIN_REQUEST_INTERVAL)
        self._last_request_time: float = 0.0
        self._cache: Dict[str, Any] = {}
        self._load_cache()

    @property
    def cache_file_path(self) -> Path:
        """Compatibility property for test assertions."""
        return self.cache_file

    def _load_cache(self) -> None:
        """Loads persistent geocoding cache."""
        if self.cache_file.exists():
            try:
                with open(self.cache_file, "r", encoding="utf-8") as f:
                    self._cache = json.load(f)
            except Exception:
                self._cache = {}
        else:
            self._cache = {}
            try:
                self.cache_file.parent.mkdir(parents=True, exist_ok=True)
                with open(self.cache_file, "w", encoding="utf-8") as f:
                    json.dump({}, f, indent=2)
            except Exception:
                pass

    def _save_cache(self) -> None:
        """Persists cache to disk."""
        try:
            self.cache_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.cache_file, "w", encoding="utf-8") as f:
                json.dump(self._cache, f, indent=2)
        except Exception:
            pass

    def _normalize_key(self, query: str) -> str:
        """Normalizes search query for consistent caching and matching."""
        return re.sub(r"[^\w\s]", "", query).strip().lower()

    def _enforce_rate_limit(self) -> None:
        """Enforces policy compliance: <= 1 request per second."""
        elapsed = time.time() - self._last_request_time
        if elapsed < self.rate_limit_delay:
            time.sleep(self.rate_limit_delay - elapsed)
        self._last_request_time = time.time()

    @staticmethod
    def _similarity(s1: str, s2: str) -> float:
        """Computes string similarity ratio [0.0 - 1.0]."""
        return difflib.SequenceMatcher(None, s1.lower(), s2.lower()).ratio()

    def search_local(self, query: str, limit: int = 8) -> List[Dict[str, Any]]:
        """
        Search local dictionary of Indian states/districts and major global cities.
        Zero latency and offline-resilient.
        """
        q = query.strip().lower()
        if not q or len(q) < 2:
            return []

        results = []

        # 1. Match Indian States and Union Territories
        for item in INDIAN_STATES_DATA:
            name_lower = item["name"].lower()
            code_lower = item["code"].lower()
            capital_lower = item.get("capital", "").lower()

            score = 0.0
            if q == name_lower or q == code_lower:
                score = 1.0
            elif name_lower.startswith(q) or capital_lower.startswith(q):
                score = 0.92
            elif q in name_lower or q in capital_lower:
                score = 0.82
            else:
                sim = max(self._similarity(q, name_lower), self._similarity(q, capital_lower))
                if sim >= 0.70:
                    score = sim * 0.75

            if score > 0:
                results.append({
                    "name": item["name"],
                    "code": f"IN-{item['code']}",
                    "state_code": item["code"],
                    "type": "state" if item["type"] == "State" else "union_territory",
                    "latitude": item["lat"],
                    "longitude": item["lon"],
                    "capital": item.get("capital", ""),
                    "display_name": f"{item['name']}, India",
                    "country": "India",
                    "_score": score
                })

        # 2. Match Major Indian Cities
        alias_target = self.CITY_ALIASES.get(q)
        for item in MAJOR_INDIAN_CITIES:
            name_lower = item["name"].lower()
            score = 0.0
            if q == name_lower:
                score = 0.98
            elif alias_target and alias_target == name_lower:
                score = 0.95
            elif name_lower.startswith(q):
                score = 0.88
            elif q in name_lower:
                score = 0.78
            else:
                sim = self._similarity(q, name_lower)
                if sim >= 0.72:
                    score = sim * 0.72

            if score > 0:
                results.append({
                    "name": item["name"],
                    "state": item["state"],
                    "type": item["type"],
                    "latitude": item["lat"],
                    "longitude": item["lon"],
                    "display_name": f"{item['name']}, {item['state']}, India",
                    "country": "India",
                    "_score": score
                })

        # 3. Match Major Global Metropolises
        for item in MAJOR_GLOBAL_CITIES:
            name_lower = item["name"].lower()
            country_lower = item["country"].lower()
            score = 0.0
            if q == name_lower or q == country_lower:
                score = 0.99
            elif name_lower.startswith(q) or country_lower.startswith(q):
                score = 0.90
            elif q in name_lower or q in country_lower:
                score = 0.80
            else:
                sim = max(self._similarity(q, name_lower), self._similarity(q, country_lower))
                if sim >= 0.72:
                    score = sim * 0.72

            if score > 0:
                results.append({
                    "name": item["name"],
                    "country": item["country"],
                    "type": item["type"],
                    "latitude": item["lat"],
                    "longitude": item["lon"],
                    "display_name": f"{item['name']}, {item['country']}",
                    "_score": score
                })

        results.sort(key=lambda x: (x["_score"], -len(x["name"])), reverse=True)

        seen = set()
        deduped = []
        for r in results:
            key = r["display_name"].lower()
            if key not in seen:
                seen.add(key)
                clean_r = {k: v for k, v in r.items() if not k.startswith("_")}
                deduped.append(clean_r)
                if len(deduped) >= limit:
                    break

        return deduped

    def resolve_maps_co(self, query: str) -> Optional[Dict[str, Any]]:
        """
        Forward geocodes query worldwide using Maps.co API with API Key.
        Endpoint: https://geocode.maps.co/search?q={query}&api_key={api_key}
        """
        q = query.strip()
        if not q or len(q) < 2:
            return None

        cache_key = f"mapsco_{q.lower()}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        self._enforce_rate_limit()

        params = urllib.parse.urlencode({
            "q": q,
            "api_key": self.maps_co_api_key
        })
        url = f"{self.MAPS_CO_BASE_URL.rstrip('/')}/search?{params}"

        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": self.user_agent, "Accept": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=8) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    if data and isinstance(data, list) and len(data) > 0:
                        top = data[0]
                        res = {
                            "name": top.get("display_name", "").split(",")[0].strip() or q,
                            "display_name": top.get("display_name", q),
                            "latitude": float(top["lat"]),
                            "longitude": float(top["lon"]),
                            "type": top.get("type", "location"),
                            "importance": top.get("importance", 0.0),
                            "source": "maps_co"
                        }
                        self._cache[cache_key] = res
                        self._save_cache()
                        return res
        except Exception:
            pass

        return None

    def reverse_maps_co(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        """
        Reverse geocodes coordinates worldwide using Maps.co API with API Key.
        Endpoint: https://geocode.maps.co/reverse?lat={lat}&lon={lon}&api_key={api_key}
        """
        cache_key = f"mapsco_rev_{lat:.4f}_{lon:.4f}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        self._enforce_rate_limit()

        params = urllib.parse.urlencode({
            "lat": f"{lat:.6f}",
            "lon": f"{lon:.6f}",
            "api_key": self.maps_co_api_key
        })
        url = f"{self.MAPS_CO_BASE_URL.rstrip('/')}/reverse?{params}"

        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": self.user_agent, "Accept": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=8) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    if data and "display_name" in data:
                        addr = data.get("address", {})
                        name = (
                            addr.get("city")
                            or addr.get("town")
                            or addr.get("village")
                            or addr.get("state")
                            or addr.get("country")
                            or data["display_name"].split(",")[0].strip()
                        )
                        res = {
                            "name": name,
                            "display_name": data["display_name"],
                            "latitude": float(data.get("lat", lat)),
                            "longitude": float(data.get("lon", lon)),
                            "address": addr,
                            "source": "maps_co_reverse"
                        }
                        self._cache[cache_key] = res
                        self._save_cache()
                        return res
        except Exception:
            pass

        return None

    def resolve_nominatim(self, query: str) -> Optional[Dict[str, Any]]:
        """
        Fallback forward geocoding using OpenStreetMap Nominatim.
        """
        q = query.strip()
        if not q or len(q) < 2:
            return None

        cache_key = f"nom_{q.lower()}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        self._enforce_rate_limit()

        params = urllib.parse.urlencode({
            "q": q,
            "format": "jsonv2",
            "limit": 1
        })
        url = f"{self.NOMINATIM_BASE_URL}?{params}"

        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": self.user_agent, "Accept": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=8) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    if data and isinstance(data, list) and len(data) > 0:
                        top = data[0]
                        res = {
                            "name": top.get("name") or q,
                            "display_name": top.get("display_name", q),
                            "latitude": float(top["lat"]),
                            "longitude": float(top["lon"]),
                            "type": top.get("type", "location"),
                            "source": "nominatim_osm"
                        }
                        self._cache[cache_key] = res
                        self._save_cache()
                        return res
        except Exception:
            pass

        return None

    def resolve(self, query: str) -> Optional[Dict[str, Any]]:
        """
        Universal geocoding resolution pipeline:
        1. Local indexed dictionary (instant, zero-latency)
        2. Persistent cache check
        3. Maps.co API worldwide forward resolution
        4. Nominatim fallback
        """
        q = query.strip()
        if not q:
            return None

        # 1. Local search high confidence
        local_matches = self.search_local(q, limit=1)
        if local_matches:
            # If high confidence or exact match
            match = local_matches[0]
            if match["name"].lower() == q.lower() or q.lower() in match["name"].lower():
                return match

        # 2. Maps.co API call
        maps_res = self.resolve_maps_co(q)
        if maps_res:
            return maps_res

        # 3. Nominatim Fallback
        nom_res = self.resolve_nominatim(q)
        if nom_res:
            return nom_res

        # 4. Fallback to any local fuzzy match
        if local_matches:
            return local_matches[0]

        return None

    def reverse_geocode(self, lat: float, lon: float) -> Dict[str, Any]:
        """Reverse geocode coordinates with Maps.co and offline geometric fallback."""
        rev = self.reverse_maps_co(lat, lon)
        if rev:
            return rev

        # Fallback: find nearest known location in local database
        best_loc = None
        min_dist_sq = float("inf")
        all_local = INDIAN_STATES_DATA + MAJOR_INDIAN_CITIES + MAJOR_GLOBAL_CITIES
        for loc in all_local:
            d_sq = (loc["lat"] - lat) ** 2 + (loc["lon"] - lon) ** 2
            if d_sq < min_dist_sq:
                min_dist_sq = d_sq
                best_loc = loc

        if best_loc and min_dist_sq < 4.0:  # within ~2 degrees
            return {
                "name": best_loc["name"],
                "display_name": f"{best_loc['name']} Region ({lat:.2f}°, {lon:.2f}°)",
                "latitude": lat,
                "longitude": lon,
                "source": "nearest_local_match"
            }

        return {
            "name": f"Coordinates ({lat:.2f}°, {lon:.2f}°)",
            "display_name": f"Location at {lat:.4f}°, {lon:.4f}°",
            "latitude": lat,
            "longitude": lon,
            "source": "coordinates_only"
        }

    def get_coordinates(self, place_name: str) -> Optional[Tuple[float, float]]:
        """Convenience method returning (latitude, longitude) for any place worldwide."""
        res = self.resolve(place_name)
        if res and "latitude" in res and "longitude" in res:
            return float(res["latitude"]), float(res["longitude"])
        return None
