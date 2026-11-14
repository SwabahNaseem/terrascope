"""
State Sampler Service
Generates regular internal sampling grids within Indian state boundaries to compute state averages.
Uses an efficient ray-casting point-in-polygon algorithm without external binary dependencies.
"""

import json
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any

from backend.services.geocoding import INDIAN_STATES_DATA


def point_in_polygon(x: float, y: float, polygon: List[List[float]]) -> bool:
    """
    Ray-casting algorithm to determine if a point (x=lon, y=lat) is inside a polygon.
    Polygon is a list of [lon, lat] pairs.
    """
    num_points = len(polygon)
    inside = False

    p1x, p1y = polygon[0]
    for i in range(1, num_points + 1):
        p2x, p2y = polygon[i % num_points]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y

    return inside


class StateSamplerService:
    """Service to generate sampling grid points across state polygons."""

    def __init__(self, geojson_path: Optional[str] = None):
        base_dir = Path(__file__).resolve().parent.parent.parent
        self.geojson_path = Path(geojson_path) if geojson_path else base_dir / "frontend" / "assets" / "geo" / "india_states.geojson"
        self._features_by_name: Dict[str, dict] = {}
        self._features_by_code: Dict[str, dict] = {}
        self._load_geojson()

    def _load_geojson(self) -> None:
        """Loads and indexes GeoJSON state features."""
        if not self.geojson_path.exists():
            return

        try:
            with open(self.geojson_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                features = data.get("features", [])
                for feat in features:
                    props = feat.get("properties", {})
                    name = props.get("name", "").strip().lower()
                    code = props.get("state_code", "").strip().upper()
                    if name:
                        self._features_by_name[name] = feat
                    if code:
                        self._features_by_code[code] = feat
        except Exception:
            pass

    def get_state_feature(self, identifier: str) -> Optional[dict]:
        """Looks up GeoJSON feature by state name or code."""
        ident = identifier.strip().lower()
        if ident in self._features_by_name:
            return self._features_by_name[ident]
        code_upper = identifier.strip().upper().replace("IN-", "")
        if code_upper in self._features_by_code:
            return self._features_by_code[code_upper]
        return None

    def get_all_states(self) -> List[Dict[str, Any]]:
        """
        Returns list of all 36 Indian states and union territories with bounding boxes and centroids.
        Combines GeoJSON features with comprehensive national state definitions.
        """
        states_out: List[Dict[str, Any]] = []

        for item in INDIAN_STATES_DATA:
            name = item["name"]
            code = item["code"]
            feat = self.get_state_feature(name)

            centroid = [item["lat"], item["lon"]]
            # Default bounds estimate around centroid (~1.5 to 2.5 degrees)
            bounds = [
                [round(item["lat"] - 1.5, 2), round(item["lon"] - 1.5, 2)],
                [round(item["lat"] + 1.5, 2), round(item["lon"] + 1.5, 2)]
            ]

            if feat:
                geom = feat.get("geometry", {})
                gtype = geom.get("type")
                coords = geom.get("coordinates", [])
                rings = []
                if gtype == "Polygon" and coords:
                    rings = coords
                elif gtype == "MultiPolygon" and coords:
                    for poly in coords:
                        rings.extend(poly)

                all_pts = [pt for ring in rings for pt in ring]
                if all_pts:
                    min_lon = min(pt[0] for pt in all_pts)
                    max_lon = max(pt[0] for pt in all_pts)
                    min_lat = min(pt[1] for pt in all_pts)
                    max_lat = max(pt[1] for pt in all_pts)
                    bounds = [[round(min_lat, 2), round(min_lon, 2)], [round(max_lat, 2), round(max_lon, 2)]]
                    centroid = [round((min_lat + max_lat) / 2.0, 4), round((min_lon + max_lon) / 2.0, 4)]

            states_out.append({
                "id": f"IN-{code}",
                "name": name,
                "code": code,
                "type": item["type"],
                "capital": item.get("capital", ""),
                "centroid": centroid,
                "bounds": bounds
            })

        states_out.sort(key=lambda s: s["name"])
        return states_out

    def get_state_points(self, state_name: str, grid_step_deg: float = 0.5) -> List[Tuple[float, float]]:
        """
        Calculates sample (latitude, longitude) grid points inside the given state polygon.
        Falls back to geographic centroid for small territories or if grid produces no interior points.
        """
        feat = self.get_state_feature(state_name)

        # Fallback centroid lookup if no feature
        fallback_centroid = None
        for item in INDIAN_STATES_DATA:
            if item["name"].lower() == state_name.lower() or item["code"].lower() == state_name.lower():
                fallback_centroid = (item["lat"], item["lon"])
                break

        if not feat:
            return [fallback_centroid] if fallback_centroid else [(20.5937, 78.9629)]

        geom = feat.get("geometry", {})
        gtype = geom.get("type")
        coords = geom.get("coordinates", [])

        polygons: List[List[List[float]]] = []
        if gtype == "Polygon":
            polygons.append(coords[0])
        elif gtype == "MultiPolygon":
            for poly in coords:
                polygons.append(poly[0])

        all_pts = [pt for poly in polygons for pt in poly]
        if not all_pts:
            return [fallback_centroid] if fallback_centroid else [(20.5937, 78.9629)]

        min_lon = min(pt[0] for pt in all_pts)
        max_lon = max(pt[0] for pt in all_pts)
        min_lat = min(pt[1] for pt in all_pts)
        max_lat = max(pt[1] for pt in all_pts)

        centroid = ((min_lat + max_lat) / 2.0, (min_lon + max_lon) / 2.0)

        # Generate regular grid points
        sample_points: List[Tuple[float, float]] = []
        cur_lat = min_lat + grid_step_deg / 2.0
        while cur_lat <= max_lat:
            cur_lon = min_lon + grid_step_deg / 2.0
            while cur_lon <= max_lon:
                # Check point in any polygon of state
                for poly in polygons:
                    if point_in_polygon(cur_lon, cur_lat, poly):
                        sample_points.append((round(cur_lat, 4), round(cur_lon, 4)))
                        break
                cur_lon += grid_step_deg
            cur_lat += grid_step_deg

        # If boundary is small or no grid points matched, use centroid
        if not sample_points:
            sample_points = [centroid]

        return sample_points

    @staticmethod
    def compute_state_average(point_series_list: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Combines multiple point time series into an arithmetic state average series.
        Expected input: list of dicts mapping timestamp string -> float value.
        """
        if not point_series_list:
            return {}

        accumulator: Dict[str, List[float]] = {}
        for series in point_series_list:
            if not isinstance(series, dict):
                continue
            for date_key, val in series.items():
                if val is not None and val != -999.0 and isinstance(val, (int, float)):
                    if date_key not in accumulator:
                        accumulator[date_key] = []
                    accumulator[date_key].append(float(val))

        averaged: Dict[str, float] = {}
        for date_key, values in accumulator.items():
            if values:
                averaged[date_key] = round(sum(values) / len(values), 3)

        return averaged
