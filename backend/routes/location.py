"""
Location Routes Blueprint
<<<<<<< Updated upstream
Handles location search, geocoding resolution, and states/territories metadata for India.
"""

from flask import Blueprint, jsonify, request
from backend.services.geocoding import GeocodingService
from backend.services.state_sampler import StateSamplerService
=======
Handles location search, geocoding resolution, and states/territories metadata from official boundary standards.
"""

import json
from pathlib import Path
from flask import Blueprint, jsonify, request, current_app

from backend.services.geocoding import GeocodingService
>>>>>>> Stashed changes

location_bp = Blueprint("location", __name__)
geocoding_service = GeocodingService()
state_sampler_service = StateSamplerService()


def _get_geocoding_service() -> GeocodingService:
    cache_path = getattr(current_app.config, "CACHE_DIR", None)
    if cache_path:
        cache_file = Path(cache_path) / "geocoding.json"
    else:
        cache_file = None
    user_agent = getattr(current_app.config, "NOMINATIM_USER_AGENT", None)
    rate_delay = getattr(current_app.config, "NOMINATIM_DELAY", 1.0)
    return GeocodingService(cache_file_path=cache_file, user_agent=user_agent, rate_limit_delay=rate_delay)


def _load_states_geojson():
    base_dir = Path(__file__).resolve().parent.parent.parent
    geojson_path = getattr(current_app.config, "GEOJSON_FILE_PATH", base_dir / "frontend/assets/geo/india_states.geojson")
    geojson_path = Path(geojson_path)
    if not geojson_path.exists():
        return []
    with open(geojson_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("features", [])


@location_bp.route("/states", methods=["GET"])
def get_states():
    """
<<<<<<< Updated upstream
    Returns list of all 36 Indian states and union territories.
    Includes official code, capital, geographic centroid, and bounding box.
    """
    try:
        states = state_sampler_service.get_all_states()
        return jsonify({
            "status": "success",
            "total": len(states),
            "states": states
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to retrieve states: {str(e)}",
            "total": 0,
            "states": []
        }), 500
=======
    Returns list of all 36 Indian states and union territories conforming
    to official Government of India administrative boundaries.
    """
    features = _load_states_geojson()
    states_list = []

    for feat in features:
        props = feat.get("properties", {})
        geom = feat.get("geometry", {})
        raw_coords = geom.get("coordinates", [])

        # Extract all (lon, lat) points to calculate bounds and centroid
        all_pts = []
        geom_type = geom.get("type")
        if geom_type == "Polygon":
            for ring in raw_coords:
                all_pts.extend(ring)
        elif geom_type == "MultiPolygon":
            for poly in raw_coords:
                for ring in poly:
                    all_pts.extend(ring)

        if all_pts:
            lons = [p[0] for p in all_pts]
            lats = [p[1] for p in all_pts]
            centroid = [round(sum(lats) / len(lats), 4), round(sum(lons) / len(lons), 4)]
            bounds = [[round(min(lats), 4), round(min(lons), 4)], [round(max(lats), 4), round(max(lons), 4)]]
        else:
            centroid = [0.0, 0.0]
            bounds = [[0.0, 0.0], [0.0, 0.0]]

        states_list.append({
            "id": props.get("id", f"IN-{props.get('state_code', '')}"),
            "name": props.get("name"),
            "code": props.get("state_code"),
            "type": props.get("type", "State"),
            "centroid": centroid,
            "bounds": bounds
        })

    # Sort alphabetically by state name
    states_list.sort(key=lambda s: s["name"])

    return jsonify({
        "status": "success",
        "total": len(states_list),
        "states": states_list
    }), 200
>>>>>>> Stashed changes


@location_bp.route("/search", methods=["GET"])
def search_locations():
    """
    Location autocomplete and fuzzy search for places in India.
    Prioritizes local fuzzy matching of Indian states/districts over live web calls.
    Query parameters:
<<<<<<< Updated upstream
        q: search query string (minimum 2 characters)
    Prioritizes fast local dictionary matching (states, UTs, cities, districts),
    with optional fallback to OpenStreetMap Nominatim for unlisted towns.
=======
        q: search query string
>>>>>>> Stashed changes
    """
    query = request.args.get("q", "").strip()
    if len(query) < 2:
        return jsonify({
            "status": "success",
            "query": query,
            "suggestions": []
        }), 200

<<<<<<< Updated upstream
    try:
        # 1. Search local dictionary
        suggestions = geocoding_service.search_local(query, limit=6)

        # 2. If fewer than 3 results found, attempt Nominatim lookup
        if len(suggestions) < 3:
            nom_match = geocoding_service.resolve_nominatim(query)
            if nom_match:
                # Avoid duplicates
                existing_names = {s["display_name"].lower() for s in suggestions}
                if nom_match["display_name"].lower() not in existing_names:
                    suggestions.append(nom_match)

        return jsonify({
            "status": "success",
            "query": query,
            "suggestions": suggestions[:6]
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "query": query,
            "message": str(e),
            "suggestions": []
        }), 500
=======
    service = _get_geocoding_service()
    local_results = service.search_local(query)

    suggestions = []
    seen_names = set()

    for item in local_results[:6]:
        seen_names.add(item["name"].lower())
        suggestions.append({
            "name": item["name"],
            "type": item["type"],
            "latitude": item["latitude"],
            "longitude": item["longitude"],
            "display_name": item["display_name"],
            "source": item["source"]
        })

    # If few local results, try Nominatim resolution
    if len(suggestions) < 3:
        nom_result = service.resolve_nominatim(query)
        if nom_result and nom_result["name"].lower() not in seen_names:
            suggestions.append({
                "name": nom_result["name"],
                "type": nom_result["type"],
                "latitude": nom_result["latitude"],
                "longitude": nom_result["longitude"],
                "display_name": nom_result["display_name"],
                "source": nom_result["source"]
            })

    return jsonify({
        "status": "success",
        "query": query,
        "total": len(suggestions),
        "suggestions": suggestions[:6]
    }), 200
>>>>>>> Stashed changes


@location_bp.route("/geocode", methods=["GET"])
def geocode_location():
    """
    Direct geocoding conversion of a location name to coordinates in India.
    Query parameters:
        q: location name in India
    """
    query = request.args.get("q", "").strip()
<<<<<<< Updated upstream
    if len(query) < 2:
        return jsonify({
            "status": "error",
            "message": "Query string must contain at least 2 characters",
            "coordinates": None
        }), 400

    try:
        coords = geocoding_service.get_coordinates(query)
        if coords:
            return jsonify({
                "status": "success",
                "query": query,
                "coordinates": [coords[0], coords[1]],
                "latitude": coords[0],
                "longitude": coords[1]
            }), 200

        return jsonify({
            "status": "not_found",
            "query": query,
            "message": f"Could not resolve coordinates for '{query}' in India",
            "coordinates": None
        }), 404
    except Exception as e:
        return jsonify({
            "status": "error",
            "query": query,
            "message": str(e),
            "coordinates": None
        }), 500
=======
    if not query:
        return jsonify({
            "status": "error",
            "message": "Query parameter 'q' is required."
        }), 400

    service = _get_geocoding_service()
    resolved = service.resolve(query)

    if resolved:
        return jsonify({
            "status": "success",
            "query": query,
            "coordinates": [resolved["latitude"], resolved["longitude"]],
            "details": resolved
        }), 200

    return jsonify({
        "status": "not_found",
        "query": query,
        "message": f"Could not resolve coordinates for '{query}' in India.",
        "coordinates": None
    }), 404
>>>>>>> Stashed changes
