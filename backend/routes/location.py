"""
Location Routes Blueprint
Handles location search, geocoding resolution, and states/territories metadata for India.
"""

from flask import Blueprint, jsonify, request
from backend.services.geocoding import GeocodingService
from backend.services.state_sampler import StateSamplerService

location_bp = Blueprint("location", __name__)
geocoding_service = GeocodingService()
state_sampler_service = StateSamplerService()


@location_bp.route("/states", methods=["GET"])
def get_states():
    """
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


@location_bp.route("/search", methods=["GET"])
def search_locations():
    """
    Location autocomplete and fuzzy search for places in India.
    Query parameters:
        q: search query string (minimum 2 characters)
    Prioritizes fast local dictionary matching (states, UTs, cities, districts),
    with optional fallback to OpenStreetMap Nominatim for unlisted towns.
    """
    query = request.args.get("q", "").strip()
    if len(query) < 2:
        return jsonify({
            "status": "success",
            "query": query,
            "suggestions": []
        }), 200

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


@location_bp.route("/geocode", methods=["GET"])
def geocode_location():
    """
    Direct geocoding conversion of a location name to coordinates in India.
    Query parameters:
        q: location name in India
    """
    query = request.args.get("q", "").strip()
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
