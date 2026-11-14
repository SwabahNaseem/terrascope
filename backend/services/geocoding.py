"""
Geocoding Service
Handles location string resolution to coordinates via local dictionary matching and Nominatim API.
"""

import json
import time
from difflib import SequenceMatcher
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

# Complete dataset of all 36 Indian states and union territories
INDIAN_STATES_DATA = [
    {"name": "Andaman and Nicobar Islands", "code": "AN", "type": "Union Territory", "lat": 11.667, "lon": 92.7359, "capital": "Port Blair"},
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
MAJOR_CITIES_DATA = [
    {"name": "Mumbai", "type": "city", "state": "Maharashtra", "lat": 19.0760, "lon": 72.8777},
    {"name": "Delhi", "type": "city", "state": "Delhi", "lat": 28.6139, "lon": 77.2090},
    {"name": "Bengaluru", "type": "city", "state": "Karnataka", "lat": 12.9716, "lon": 77.5946},
    {"name": "Hyderabad", "type": "city", "state": "Telangana", "lat": 17.3850, "lon": 78.4867},
    {"name": "Ahmedabad", "type": "city", "state": "Gujarat", "lat": 23.0225, "lon": 72.5714},
    {"name": "Chennai", "type": "city", "state": "Tamil Nadu", "lat": 13.0827, "lon": 80.2707},
    {"name": "Kolkata", "type": "city", "state": "West Bengal", "lat": 22.5726, "lon": 88.3639},
    {"name": "Surat", "type": "city", "state": "Gujarat", "lat": 21.1702, "lon": 72.8311},
    {"name": "Pune", "type": "city", "state": "Maharashtra", "lat": 18.5204, "lon": 73.8567},
    {"name": "Jaipur", "type": "city", "state": "Rajasthan", "lat": 26.9124, "lon": 75.7873},
    {"name": "Lucknow", "type": "city", "state": "Uttar Pradesh", "lat": 26.8467, "lon": 80.9462},
    {"name": "Kanpur", "type": "city", "state": "Uttar Pradesh", "lat": 26.4499, "lon": 80.3319},
    {"name": "Nagpur", "type": "city", "state": "Maharashtra", "lat": 21.1458, "lon": 79.0882},
    {"name": "Indore", "type": "city", "state": "Madhya Pradesh", "lat": 22.7196, "lon": 75.8577},
    {"name": "Thiruvananthapuram", "type": "city", "state": "Kerala", "lat": 8.5241, "lon": 76.9366},
    {"name": "Kochi", "type": "city", "state": "Kerala", "lat": 9.9312, "lon": 76.2673},
    {"name": "Kozhikode", "type": "city", "state": "Kerala", "lat": 11.2588, "lon": 75.7804},
    {"name": "Wayanad", "type": "district", "state": "Kerala", "lat": 11.6854, "lon": 76.1320},
    {"name": "Idukki", "type": "district", "state": "Kerala", "lat": 9.8494, "lon": 76.9720},
    {"name": "Palakkad", "type": "district", "state": "Kerala", "lat": 10.7867, "lon": 76.6548},
    {"name": "Varanasi", "type": "city", "state": "Uttar Pradesh", "lat": 25.3176, "lon": 82.9739},
    {"name": "Srinagar", "type": "city", "state": "Jammu and Kashmir", "lat": 34.0837, "lon": 74.7973},
    {"name": "Bhopal", "type": "city", "state": "Madhya Pradesh", "lat": 23.2599, "lon": 77.4126},
    {"name": "Patna", "type": "city", "state": "Bihar", "lat": 25.5941, "lon": 85.1376},
    {"name": "Visakhapatnam", "type": "city", "state": "Andhra Pradesh", "lat": 17.6868, "lon": 83.2185},
    {"name": "Coimbatore", "type": "city", "state": "Tamil Nadu", "lat": 11.0168, "lon": 76.9558},
    {"name": "Madurai", "type": "city", "state": "Tamil Nadu", "lat": 9.9252, "lon": 78.1198},
    {"name": "Guwahati", "type": "city", "state": "Assam", "lat": 26.1445, "lon": 91.7362},
    {"name": "Shimla", "type": "city", "state": "Himachal Pradesh", "lat": 31.1048, "lon": 77.1734},
    {"name": "Dehradun", "type": "city", "state": "Uttarakhand", "lat": 30.3165, "lon": 78.0322},
    {"name": "Amritsar", "type": "city", "state": "Punjab", "lat": 31.6340, "lon": 74.8723},
    {"name": "Bhubaneswar", "type": "city", "state": "Odisha", "lat": 20.2961, "lon": 85.8245},
]


class GeocodingService:
    """Service for resolving search strings to coordinates in India."""

    def __init__(
        self,
        cache_file_path: Optional[str] = None,
        user_agent: str = "TerraScope-India-Trend-Detective/1.0 (contact: info@terrascope.org)",
        rate_limit_delay: float = 1.0
    ):
        base_dir = Path(__file__).resolve().parent.parent.parent
        self.cache_file = Path(cache_file_path) if cache_file_path else base_dir / "data" / "cache" / "geocoding.json"
        self.user_agent = user_agent
        self.rate_limit_delay = rate_limit_delay
        self._last_request_time = 0.0
        self._cache: Dict[str, Any] = self._load_cache()

    def _load_cache(self) -> Dict[str, Any]:
        """Loads persistent geocoding cache."""
        if self.cache_file.exists():
            try:
                with open(self.cache_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return {}
        return {}

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
        Resolve query using OpenStreetMap Nominatim API with rate-limiting and user-agent.
        Checks local cache first, falls back to live query, and caches responses.
        """
        q = query.strip()
        if not q or len(q) < 2:
            return None

        cache_key = q.lower()
        if cache_key in self._cache:
            return self._cache[cache_key]

        # Rate limiting adherence
        elapsed = time.time() - self._last_request_time
        if elapsed < self.rate_limit_delay:
            time.sleep(self.rate_limit_delay - elapsed)

        try:
            import urllib.request
            import urllib.parse

            params = urllib.parse.urlencode({
                "q": q,
                "countrycodes": "in",
                "format": "jsonv2",
                "limit": 1
            })
            url = f"https://nominatim.openstreetmap.org/search?{params}"
            req = urllib.request.Request(url, headers={"User-Agent": self.user_agent})

            self._last_request_time = time.time()
            with urllib.request.urlopen(req, timeout=10) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    if data and isinstance(data, list) and len(data) > 0:
                        top = data[0]
                        res = {
                            "name": top.get("name") or q,
                            "type": top.get("type", "location"),
                            "latitude": float(top["lat"]),
                            "longitude": float(top["lon"]),
                            "display_name": top.get("display_name", f"{q}, India")
                        }
                        self._cache[cache_key] = res
                        self._save_cache()
                        return res
        except Exception:
            pass

        return None

    def get_coordinates(self, place_name: str) -> Optional[Tuple[float, float]]:
        """
        Convenience method returning (latitude, longitude) for a place name in India.
        """
        if not place_name:
            return None

        # Check local search first
        local = self.search_local(place_name, limit=1)
        if local:
            return (local[0]["latitude"], local[0]["longitude"])

        # Try Nominatim resolution
        nom = self.resolve_nominatim(place_name)
        if nom:
            return (nom["latitude"], nom["longitude"])

        return None
