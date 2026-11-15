"""
TerraScope State Sampler Service
Generates regular internal sampling grids within Indian state boundaries to compute state averages.
Uses ray-casting point-in-polygon algorithm against official GeoJSON polygons.
"""

from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
import json
import logging

logger = logging.getLogger(__name__)


class StateSamplerService:
    """Service to generate sampling grid points across state polygons."""

    def __init__(self, geojson_path: Optional[str] = None):
        base_dir = Path(__file__).resolve().parent.parent.parent
        self.geojson_path = (
            Path(geojson_path)
            if geojson_path
            else base_dir / "frontend" / "assets" / "geo" / "india_states.geojson"
        )
        self._states_cache: Dict[str, dict] = {}
        self._load_states()

    def _load_states(self) -> None:
        """Loads and indexes state GeoJSON features by normalized name and code."""
        if not self.geojson_path.exists():
            logger.warning("GeoJSON path does not exist: %s", self.geojson_path)
            return

        try:
            with open(self.geojson_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                for feature in data.get("features", []):
                    props = feature.get("properties", {})
                    name = props.get("name", "").strip()
                    code = props.get("state_code", "") or props.get("id", "").replace("IN-", "")

                    geom = feature.get("geometry", {})
                    rings = self._extract_rings(geom.get("coordinates", []), geom.get("type", "Polygon"))

                    entry = {
                        "name": name,
                        "code": code,
                        "rings": rings,
                        "bounds": self._compute_bounds(rings),
                        "centroid": self._compute_centroid(rings),
                    }

                    if name:
                        self._states_cache[name.lower()] = entry
                    if code:
                        self._states_cache[code.lower()] = entry
                        self._states_cache[f"in-{code.lower()}"] = entry
        except (json.JSONDecodeError, OSError) as e:
            logger.warning("Error reading state boundaries: %s", e)

    @staticmethod
    def _extract_rings(coords: Any, geom_type: str) -> List[List[List[float]]]:
        """Extracts exterior coordinate rings [lon, lat] from Polygon or MultiPolygon."""
        rings = []
        if geom_type == "Polygon" and coords:
            rings.append(coords[0])
        elif geom_type == "MultiPolygon" and coords:
            for poly in coords:
                if poly:
                    rings.append(poly[0])
        return rings

    @staticmethod
    def _compute_bounds(rings: List[List[List[float]]]) -> Tuple[float, float, float, float]:
        """Calculates (min_lon, min_lat, max_lon, max_lat)."""
        all_points = [pt for ring in rings for pt in ring]
        if not all_points:
            return (0.0, 0.0, 0.0, 0.0)
        lons = [p[0] for p in all_points]
        lats = [p[1] for p in all_points]
        return (min(lons), min(lats), max(lons), max(lats))

    @staticmethod
    def _compute_centroid(rings: List[List[List[float]]]) -> Tuple[float, float]:
        """Calculates (lat, lon) centroid."""
        all_points = [pt for ring in rings for pt in ring]
        if not all_points:
            return (20.5937, 78.9629)  # India geographic center fallback
        mean_lon = sum(p[0] for p in all_points) / len(all_points)
        mean_lat = sum(p[1] for p in all_points) / len(all_points)
        return (round(mean_lat, 4), round(mean_lon, 4))

    @staticmethod
    def point_in_polygon(lon: float, lat: float, ring: List[List[float]]) -> bool:
        """
        Ray-casting algorithm (Jordan curve theorem) to determine if (lon, lat) is inside polygon ring.
        ring is a list of [lon, lat] pairs.
        """
        inside = False
        n = len(ring)
        if n < 3:
            return False

        p1x, p1y = ring[0]
        for i in range(1, n + 1):
            p2x, p2y = ring[i % n]
            if lat > min(p1y, p2y):
                if lat <= max(p1y, p2y):
                    if lon <= max(p1x, p2x):
                        if p1y != p2y:
                            xinters = (lat - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        else:
                            xinters = p1x
                        if p1x == p2x or lon <= xinters:
                            inside = not inside
            p1x, p1y = p2x, p2y

        return inside

    def get_state_points(
        self, state_name: str, grid_step_deg: float = 0.5, max_points: int = 16
    ) -> List[Tuple[float, float]]:
        """
        Calculates sample latitude/longitude points inside the given state boundary.
        Falls back to geographic centroid for small territories.
        Returns list of (lat, lon) tuples.
        """
        clean_name = state_name.strip().lower()
        state = self._states_cache.get(clean_name)

        if not state:
            # Try fuzzy key lookup
            for k in self._states_cache:
                if clean_name in k or k in clean_name:
                    state = self._states_cache[k]
                    break

        if not state or not state.get("rings"):
            return []

        min_lon, min_lat, max_lon, max_lat = state["bounds"]
        rings = state["rings"]

        points: List[Tuple[float, float]] = []

        # Generate regular grid inside bounding box
        lat = min_lat + (grid_step_deg / 2.0)
        while lat < max_lat:
            lon = min_lon + (grid_step_deg / 2.0)
            while lon < max_lon:
                for ring in rings:
                    if self.point_in_polygon(lon, lat, ring):
                        points.append((round(lat, 4), round(lon, 4)))
                        break
                lon += grid_step_deg
            lat += grid_step_deg

        # If no internal grid points found (small territories like Delhi, Chandigarh, Goa, Lakshadweep)
        if not points:
            centroid_lat, centroid_lon = state["centroid"]
            points.append((centroid_lat, centroid_lon))

        # Thin points evenly if exceeding max_points
        if len(points) > max_points:
            stride = len(points) // max_points
            points = points[::stride][:max_points]

        return points

    def compute_state_average(self, point_series_list: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Combines multiple point time series into an arithmetic state average series.
        point_series_list can be list of dicts with 'series' or raw date-value dicts.
        """
        if not point_series_list:
            return {"series": []}

        date_buckets: Dict[str, List[float]] = {}

        for item in point_series_list:
            # Handle standardized format: item = {"series": [{"date": "2000", "value": 26.9}, ...]}
            series = item.get("series", []) if isinstance(item, dict) else item
            if isinstance(series, list):
                for pt in series:
                    d = str(pt.get("date", ""))
                    val = pt.get("value")
                    if d and val is not None and val != -999.0:
                        date_buckets.setdefault(d, []).append(float(val))
            elif isinstance(series, dict):
                # Handle NASA POWER format: {"20000101": 27.5, ...}
                for d, val in series.items():
                    if val is not None and val != -999.0:
                        date_buckets.setdefault(str(d), []).append(float(val))

        averaged_series = []
        for d in sorted(date_buckets.keys()):
            values = date_buckets[d]
            if values:
                mean_val = round(sum(values) / len(values), 2)
                averaged_series.append({"date": d, "value": mean_val})

        return {"series": averaged_series, "sample_point_count": len(point_series_list)}
