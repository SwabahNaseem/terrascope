"""
Geocoding Service
Handles location string resolution to coordinates via local dictionary matching and Nominatim API.

Policy Compliance & Standards:
- Used for arbitrary location coordinate resolution (q=<search_term>&countrycodes=in&format=jsonv2).
- Maximum rate: <= 1 request per second.
- Custom User-Agent identifying TerraScope.
- Strict caching of resolved locations in data/cache/geocoding.json.
- Local fuzzy matching of Indian states/districts prioritized over live web calls.
"""

import difflib
import json
import os
import re
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union
import urllib.parse
import urllib.request
import urllib.error


class GeocodingService:
    """Service for resolving search strings to coordinates in India with strict policy compliance."""

    NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search"
    DEFAULT_USER_AGENT = "TerraScope-India-Trend-Detective/1.0 (contact: info@terrascope.org)"
    MIN_REQUEST_INTERVAL = 1.0  # seconds (<= 1 request per second policy)

    # Comprehensive local dictionary of Indian States, Union Territories, and Major Districts
    LOCAL_INDIAN_LOCATIONS = [
        # --- 28 States ---
        {"name": "Andhra Pradesh", "code": "AP", "type": "State", "lat": 15.9129, "lon": 79.7400, "aliases": ["andhra"]},
        {"name": "Arunachal Pradesh", "code": "AR", "type": "State", "lat": 28.2180, "lon": 94.7278, "aliases": ["arunachal"]},
        {"name": "Assam", "code": "AS", "type": "State", "lat": 26.2006, "lon": 92.9376, "aliases": ["asom"]},
        {"name": "Bihar", "code": "BR", "type": "State", "lat": 25.0961, "lon": 85.3131, "aliases": []},
        {"name": "Chhattisgarh", "code": "CT", "type": "State", "lat": 21.2787, "lon": 81.8661, "aliases": ["chattisgarh", "cg"]},
        {"name": "Goa", "code": "GA", "type": "State", "lat": 15.2993, "lon": 74.1240, "aliases": []},
        {"name": "Gujarat", "code": "GJ", "type": "State", "lat": 22.2587, "lon": 71.1924, "aliases": []},
        {"name": "Haryana", "code": "HR", "type": "State", "lat": 29.0588, "lon": 76.0856, "aliases": []},
        {"name": "Himachal Pradesh", "code": "HP", "type": "State", "lat": 31.1048, "lon": 77.1734, "aliases": ["himachal"]},
        {"name": "Jharkhand", "code": "JH", "type": "State", "lat": 23.6102, "lon": 85.2799, "aliases": []},
        {"name": "Karnataka", "code": "KA", "type": "State", "lat": 15.3173, "lon": 75.7139, "aliases": []},
        {"name": "Kerala", "code": "KL", "type": "State", "lat": 10.8505, "lon": 76.2711, "aliases": []},
        {"name": "Madhya Pradesh", "code": "MP", "type": "State", "lat": 22.9734, "lon": 78.6569, "aliases": ["mp"]},
        {"name": "Maharashtra", "code": "MH", "type": "State", "lat": 19.7515, "lon": 75.7139, "aliases": []},
        {"name": "Manipur", "code": "MN", "type": "State", "lat": 24.6637, "lon": 93.9063, "aliases": []},
        {"name": "Meghalaya", "code": "ML", "type": "State", "lat": 25.4670, "lon": 91.3662, "aliases": []},
        {"name": "Mizoram", "code": "MZ", "type": "State", "lat": 23.1645, "lon": 92.9376, "aliases": []},
        {"name": "Nagaland", "code": "NL", "type": "State", "lat": 26.1584, "lon": 94.5624, "aliases": []},
        {"name": "Odisha", "code": "OD", "type": "State", "lat": 20.9517, "lon": 85.0985, "aliases": ["orissa"]},
        {"name": "Punjab", "code": "PB", "type": "State", "lat": 31.1471, "lon": 75.3412, "aliases": []},
        {"name": "Rajasthan", "code": "RJ", "type": "State", "lat": 27.0238, "lon": 74.2179, "aliases": []},
        {"name": "Sikkim", "code": "SK", "type": "State", "lat": 27.5330, "lon": 88.5122, "aliases": []},
        {"name": "Tamil Nadu", "code": "TN", "type": "State", "lat": 11.1271, "lon": 78.6569, "aliases": ["tamilnadu"]},
        {"name": "Telangana", "code": "TS", "type": "State", "lat": 18.1124, "lon": 79.0193, "aliases": ["telengana"]},
        {"name": "Tripura", "code": "TR", "type": "State", "lat": 23.9408, "lon": 91.9882, "aliases": []},
        {"name": "Uttar Pradesh", "code": "UP", "type": "State", "lat": 26.8467, "lon": 80.9462, "aliases": ["up"]},
        {"name": "Uttarakhand", "code": "UK", "type": "State", "lat": 30.0668, "lon": 79.0193, "aliases": ["uttaranchal"]},
        {"name": "West Bengal", "code": "WB", "type": "State", "lat": 22.9868, "lon": 87.8550, "aliases": ["bengal"]},

        # --- 8 Union Territories ---
        {"name": "Andaman and Nicobar Islands", "code": "AN", "type": "Union Territory", "lat": 11.7401, "lon": 92.6586, "aliases": ["andaman", "nicobar"]},
        {"name": "Chandigarh", "code": "CH", "type": "Union Territory", "lat": 30.7333, "lon": 76.7794, "aliases": []},
        {"name": "Dadra and Nagar Haveli and Daman and Diu", "code": "DD", "type": "Union Territory", "lat": 20.4283, "lon": 72.8397, "aliases": ["daman and diu", "dadra and nagar haveli"]},
        {"name": "Delhi", "code": "DL", "type": "Union Territory", "lat": 28.7041, "lon": 77.1025, "aliases": ["new delhi", "nct of delhi"]},
        {"name": "Jammu and Kashmir", "code": "JK", "type": "Union Territory", "lat": 33.7782, "lon": 76.5762, "aliases": ["kashmir", "j&k"]},
        {"name": "Ladakh", "code": "LA", "type": "Union Territory", "lat": 34.1526, "lon": 77.5771, "aliases": ["leh ladakh"]},
        {"name": "Lakshadweep", "code": "LD", "type": "Union Territory", "lat": 10.5667, "lon": 72.6417, "aliases": ["laccadives"]},
        {"name": "Puducherry", "code": "PY", "type": "Union Territory", "lat": 11.9416, "lon": 79.8083, "aliases": ["pondicherry"]},

        # --- Major Districts & Metropolitan Centers ---
        {"name": "Thiruvananthapuram", "state": "Kerala", "type": "District", "lat": 8.5241, "lon": 76.9366, "aliases": ["trivandrum"]},
        {"name": "Kochi", "state": "Kerala", "type": "District", "lat": 9.9312, "lon": 76.2673, "aliases": ["cochin", "ernakulam"]},
        {"name": "Kozhikode", "state": "Kerala", "type": "District", "lat": 11.2588, "lon": 75.7804, "aliases": ["calicut"]},
        {"name": "Wayanad", "state": "Kerala", "type": "District", "lat": 11.6854, "lon": 76.1320, "aliases": []},
        {"name": "Palakkad", "state": "Kerala", "type": "District", "lat": 10.7867, "lon": 76.6548, "aliases": ["palghat"]},
        {"name": "Idukki", "state": "Kerala", "type": "District", "lat": 9.8494, "lon": 76.9710, "aliases": []},
        {"name": "Bengaluru", "state": "Karnataka", "type": "District", "lat": 12.9716, "lon": 77.5946, "aliases": ["bangalore"]},
        {"name": "Mysuru", "state": "Karnataka", "type": "District", "lat": 12.2958, "lon": 76.6394, "aliases": ["mysore"]},
        {"name": "Mangaluru", "state": "Karnataka", "type": "District", "lat": 12.9141, "lon": 74.8560, "aliases": ["mangalore"]},
        {"name": "Chennai", "state": "Tamil Nadu", "type": "District", "lat": 13.0827, "lon": 80.2707, "aliases": ["madras"]},
        {"name": "Coimbatore", "state": "Tamil Nadu", "type": "District", "lat": 11.0168, "lon": 76.9558, "aliases": []},
        {"name": "Madurai", "state": "Tamil Nadu", "type": "District", "lat": 9.9252, "lon": 78.1198, "aliases": []},
        {"name": "Mumbai", "state": "Maharashtra", "type": "District", "lat": 19.0760, "lon": 72.8777, "aliases": ["bombay"]},
        {"name": "Pune", "state": "Maharashtra", "type": "District", "lat": 18.5204, "lon": 73.8567, "aliases": ["poona"]},
        {"name": "Nagpur", "state": "Maharashtra", "type": "District", "lat": 21.1458, "lon": 79.0882, "aliases": []},
        {"name": "Hyderabad", "state": "Telangana", "type": "District", "lat": 17.3850, "lon": 78.4867, "aliases": []},
        {"name": "Visakhapatnam", "state": "Andhra Pradesh", "type": "District", "lat": 17.6868, "lon": 83.2185, "aliases": ["vizag"]},
        {"name": "Vijayawada", "state": "Andhra Pradesh", "type": "District", "lat": 16.5062, "lon": 80.6480, "aliases": []},
        {"name": "Kolkata", "state": "West Bengal", "type": "District", "lat": 22.5726, "lon": 88.3639, "aliases": ["calcutta"]},
        {"name": "Howrah", "state": "West Bengal", "type": "District", "lat": 22.5958, "lon": 88.2636, "aliases": []},
        {"name": "Ahmedabad", "state": "Gujarat", "type": "District", "lat": 23.0225, "lon": 72.5714, "aliases": []},
        {"name": "Surat", "state": "Gujarat", "type": "District", "lat": 21.1702, "lon": 72.8311, "aliases": []},
        {"name": "Jaipur", "state": "Rajasthan", "type": "District", "lat": 26.9124, "lon": 75.7873, "aliases": []},
        {"name": "Jodhpur", "state": "Rajasthan", "type": "District", "lat": 26.2389, "lon": 73.0243, "aliases": []},
        {"name": "Lucknow", "state": "Uttar Pradesh", "type": "District", "lat": 26.8467, "lon": 80.9462, "aliases": []},
        {"name": "Kanpur", "state": "Uttar Pradesh", "type": "District", "lat": 26.4499, "lon": 80.3319, "aliases": []},
        {"name": "Varanasi", "state": "Uttar Pradesh", "type": "District", "lat": 25.3176, "lon": 82.9739, "aliases": ["banaras", "kashi"]},
        {"name": "Patna", "state": "Bihar", "type": "District", "lat": 25.5941, "lon": 85.1376, "aliases": []},
        {"name": "Bhopal", "state": "Madhya Pradesh", "type": "District", "lat": 23.2599, "lon": 77.4126, "aliases": []},
        {"name": "Indore", "state": "Madhya Pradesh", "type": "District", "lat": 22.7196, "lon": 75.8577, "aliases": []},
        {"name": "Ranchi", "state": "Jharkhand", "type": "District", "lat": 23.3441, "lon": 85.3096, "aliases": []},
        {"name": "Bhubaneswar", "state": "Odisha", "type": "District", "lat": 20.2961, "lon": 85.8245, "aliases": []},
        {"name": "Guwahati", "state": "Assam", "type": "District", "lat": 26.1445, "lon": 91.7362, "aliases": []},
        {"name": "Shillong", "state": "Meghalaya", "type": "District", "lat": 25.5788, "lon": 91.8933, "aliases": []},
        {"name": "Imphal", "state": "Manipur", "type": "District", "lat": 24.8170, "lon": 93.9368, "aliases": []},
        {"name": "Agartala", "state": "Tripura", "type": "District", "lat": 23.8315, "lon": 91.2868, "aliases": []},
        {"name": "Aizawl", "state": "Mizoram", "type": "District", "lat": 23.7271, "lon": 92.7176, "aliases": []},
        {"name": "Kohima", "state": "Nagaland", "type": "District", "lat": 25.6751, "lon": 94.1086, "aliases": []},
        {"name": "Itanagar", "state": "Arunachal Pradesh", "type": "District", "lat": 27.0844, "lon": 93.6053, "aliases": []},
        {"name": "Gangtok", "state": "Sikkim", "type": "District", "lat": 27.3389, "lon": 88.6065, "aliases": []},
        {"name": "Dehradun", "state": "Uttarakhand", "type": "District", "lat": 30.3165, "lon": 78.0322, "aliases": []},
        {"name": "Shimla", "state": "Himachal Pradesh", "type": "District", "lat": 31.1048, "lon": 77.1734, "aliases": []},
        {"name": "Srinagar", "state": "Jammu and Kashmir", "type": "District", "lat": 34.0837, "lon": 74.7973, "aliases": []},
        {"name": "Jammu", "state": "Jammu and Kashmir", "type": "District", "lat": 32.7266, "lon": 74.8570, "aliases": []},
        {"name": "Leh", "state": "Ladakh", "type": "District", "lat": 34.1526, "lon": 77.5771, "aliases": []},
        {"name": "Port Blair", "state": "Andaman and Nicobar Islands", "type": "District", "lat": 11.6234, "lon": 92.7265, "aliases": []},
        {"name": "Kavaratti", "state": "Lakshadweep", "type": "District", "lat": 10.5667, "lon": 72.6417, "aliases": []}
    ]

    def __init__(
        self,
        cache_file_path: Optional[Union[str, Path]] = None,
        user_agent: Optional[str] = None,
        rate_limit_delay: float = MIN_REQUEST_INTERVAL
    ):
        base_dir = Path(__file__).resolve().parent.parent.parent
        self.cache_file_path = Path(cache_file_path or (base_dir / "data" / "cache" / "geocoding.json"))
        self.user_agent = user_agent or self.DEFAULT_USER_AGENT
        self.rate_limit_delay = max(rate_limit_delay, self.MIN_REQUEST_INTERVAL)
        self._last_request_time: float = 0.0
        self._cache: Dict[str, dict] = {}
        self._load_cache()

    def _load_cache(self) -> None:
        """Loads cached geocoding records from data/cache/geocoding.json."""
        if self.cache_file_path.exists():
            try:
                with open(self.cache_file_path, "r", encoding="utf-8") as f:
                    self._cache = json.load(f)
            except Exception:
                self._cache = {}
        else:
            self._cache = {}
            # Ensure parent directories exist
            try:
                self.cache_file_path.parent.mkdir(parents=True, exist_ok=True)
                with open(self.cache_file_path, "w", encoding="utf-8") as f:
                    json.dump({}, f, indent=2)
            except Exception:
                pass

    def _save_cache(self) -> None:
        """Persists cache to disk."""
        try:
            self.cache_file_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.cache_file_path, "w", encoding="utf-8") as f:
                json.dump(self._cache, f, indent=2)
        except Exception:
            pass

    def _normalize_key(self, query: str) -> str:
        """Normalizes search query for consistent caching and matching."""
        return re.sub(r"[^\w\s]", "", query).strip().lower()

    def search_local(self, query: str, threshold: float = 0.55) -> List[dict]:
        """
        Search local dictionary of Indian states, union territories, and major districts
        using fuzzy string matching. Prioritized over live web calls.
        """
        norm_query = self._normalize_key(query)
        if not norm_query:
            return []

        results = []
        for loc in self.LOCAL_INDIAN_LOCATIONS:
            loc_name = loc["name"].lower()
            aliases = [a.lower() for a in loc.get("aliases", [])]
            state_ctx = loc.get("state", "").lower()

            # Direct exact match or prefix match
            score = 0.0
            if norm_query == loc_name:
                score = 1.0
            elif loc_name.startswith(norm_query):
                score = 0.95
            elif norm_query in loc_name:
                score = 0.85
            elif any(norm_query == a for a in aliases):
                score = 0.95
            elif any(a.startswith(norm_query) for a in aliases):
                score = 0.88
            else:
                # SequenceMatcher fuzzy comparison
                ratio_name = difflib.SequenceMatcher(None, norm_query, loc_name).ratio()
                max_alias_ratio = max(
                    [difflib.SequenceMatcher(None, norm_query, a).ratio() for a in aliases],
                    default=0.0
                )
                score = max(ratio_name, max_alias_ratio)

            if score >= threshold:
                display_name = f"{loc['name']}, {loc.get('state', 'India')}" if "state" in loc else f"{loc['name']}, India"
                results.append({
                    "name": loc["name"],
                    "state": loc.get("state", loc["name"]),
                    "type": loc["type"].lower(),
                    "latitude": loc["lat"],
                    "longitude": loc["lon"],
                    "display_name": display_name,
                    "confidence": round(score, 3),
                    "source": "local_dictionary"
                })

        # Sort by confidence descending
        results.sort(key=lambda x: x["confidence"], reverse=True)
        return results

    def _enforce_rate_limit(self) -> None:
        """Enforces policy compliance: <= 1 request per second to Nominatim."""
        elapsed = time.time() - self._last_request_time
        if elapsed < self.rate_limit_delay:
            time.sleep(self.rate_limit_delay - elapsed)
        self._last_request_time = time.time()

    def _save_cache(self) -> None:
        """Saves persistent geocoding cache."""
        try:
            self.cache_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.cache_file, "w", encoding="utf-8") as f:
                json.dump(self._cache, f, indent=2)
        except Exception:
            pass

    @staticmethod
    def _similarity(s1: str, s2: str) -> float:
        """Computes string similarity ratio [0.0 - 1.0]."""
        return SequenceMatcher(None, s1.lower(), s2.lower()).ratio()

    def search_local(self, query: str, limit: int = 6) -> List[Dict[str, Any]]:
        """
        Search local dictionary of Indian states, union territories, and major cities/districts.
        Uses exact match, substring, prefix, and fuzzy similarity scoring.
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
                score = 0.9
            elif q in name_lower or q in capital_lower:
                score = 0.8
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
                    "_score": score
                })

        # 2. Match Major Cities & Key Districts
        for item in MAJOR_CITIES_DATA:
            name_lower = item["name"].lower()
            score = 0.0
            if q == name_lower:
                score = 0.95
            elif name_lower.startswith(q):
                score = 0.85
            elif q in name_lower:
                score = 0.75
            else:
                sim = self._similarity(q, name_lower)
                if sim >= 0.72:
                    score = sim * 0.70

            if score > 0:
                results.append({
                    "name": item["name"],
                    "state": item["state"],
                    "type": item["type"],
                    "latitude": item["lat"],
                    "longitude": item["lon"],
                    "display_name": f"{item['name']}, {item['state']}, India",
                    "_score": score
                })

        # Sort descending by score, tie-break by name length
        results.sort(key=lambda x: (x["_score"], -len(x["name"])), reverse=True)

        # Deduplicate by display_name
        seen = set()
        deduped = []
        for r in results:
            key = r["display_name"].lower()
            if key not in seen:
                seen.add(key)
                # Remove internal score
                clean_r = {k: v for k, v in r.items() if not k.startswith("_")}
                deduped.append(clean_r)
                if len(deduped) >= limit:
                    break

        return deduped

    def resolve_nominatim(self, query: str) -> Optional[Dict[str, Any]]:
        """
        Resolves query using OpenStreetMap Nominatim API.
        Strict policy compliance:
        - Query parameters: q=<query>&countrycodes=in&format=jsonv2
        - <= 1 request/sec rate limiting.
        - Custom User-Agent.
        - Strict caching in data/cache/geocoding.json.
        """
        norm_key = self._normalize_key(query)
        if not norm_key:
            return None

        # 1. Check cache first
        if norm_key in self._cache:
            return self._cache[norm_key]

        # 2. Enforce <= 1 request per second
        self._enforce_rate_limit()

        # 3. Build Nominatim query
        query_params = {
            "q": query.strip(),
            "countrycodes": "in",
            "format": "jsonv2",
            "limit": 5,
            "addressdetails": 1
        }
        url = f"{self.NOMINATIM_BASE_URL}?{urllib.parse.urlencode(query_params)}"

        headers = {
            "User-Agent": self.user_agent,
            "Accept": "application/json"
        }

        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=10) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    if data and len(data) > 0:
                        top = data[0]
                        resolved = {
                            "name": top.get("name") or query,
                            "display_name": top.get("display_name", ""),
                            "latitude": float(top["lat"]),
                            "longitude": float(top["lon"]),
                            "type": top.get("type", "location"),
                            "importance": top.get("importance", 0.0),
                            "source": "nominatim_osm"
                        }
                        # Strict caching
                        self._cache[norm_key] = resolved
                        self._save_cache()
                        return resolved
        except Exception:
            pass

        return None

    def resolve(self, query: str) -> Optional[dict]:
        """
        Full resolution strategy prioritizing local fuzzy matching, then cache, then Nominatim.
        """
        norm_key = self._normalize_key(query)
        if not norm_key:
            return None

        # 1. Check cache
        if norm_key in self._cache:
            return self._cache[norm_key]

        # 2. Local fuzzy matching prioritized over live web calls
        local_matches = self.search_local(query, threshold=0.75)
        if local_matches:
            top_match = local_matches[0]
            # Cache the local resolution as well
            self._cache[norm_key] = top_match
            self._save_cache()
            return top_match

        # 3. Fallback to live Nominatim web call
        return self.resolve_nominatim(query)

    def get_coordinates(self, place_name: str) -> Optional[Tuple[float, float]]:
        """
        Convenience method returning (latitude, longitude) for a place name in India.
        """
        res = self.resolve(place_name)
        if res and "latitude" in res and "longitude" in res:
            return float(res["latitude"]), float(res["longitude"])
        return None
