"""
Location Routes Blueprint
Handles worldwide location search, forward geocoding, reverse geocoding,
and states/territories boundary metadata.
"""

from flask import Blueprint, jsonify, request, current_app
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
    Location autocomplete and search worldwide.
    Prioritizes fast local dictionary matching with Maps.co API live resolution worldwide.
    Query parameters:
        q: search query string (minimum 2 characters)
    """
    query = request.args.get("q", "").strip()
    if len(query) < 2:
        return jsonify({
            "status": "success",
            "query": query,
            "suggestions": []
        }), 200

    try:
        # 1. Search local dictionary (instant)
        suggestions = geocoding_service.search_local(query, limit=8)

        # 2. If fewer than 4 results found, query Maps.co API worldwide
        if len(suggestions) < 4:
            maps_match = geocoding_service.resolve_maps_co(query)
            if maps_match:
                existing_names = {s.get("display_name", "").lower() for s in suggestions}
                if maps_match.get("display_name", "").lower() not in existing_names:
                    suggestions.append(maps_match)

        # 3. Fallback to Nominatim if still sparse
        if len(suggestions) < 2:
            nom_match = geocoding_service.resolve_nominatim(query)
            if nom_match:
                existing_names = {s.get("display_name", "").lower() for s in suggestions}
                if nom_match.get("display_name", "").lower() not in existing_names:
                    suggestions.append(nom_match)

        return jsonify({
            "status": "success",
            "query": query,
            "total": len(suggestions),
            "suggestions": suggestions[:8]
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
    Direct geocoding conversion of a location name to coordinates worldwide.
    Query parameters:
        q: location name
    """
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({
            "status": "error",
            "message": "Query parameter 'q' is required."
        }), 400

    try:
        resolved = geocoding_service.resolve(query)
        if resolved:
            return jsonify({
                "status": "success",
                "query": query,
                "coordinates": [resolved["latitude"], resolved["longitude"]],
                "latitude": resolved["latitude"],
                "longitude": resolved["longitude"],
                "details": resolved
            }), 200

        return jsonify({
            "status": "not_found",
            "query": query,
            "message": f"Could not resolve coordinates for '{query}'.",
            "coordinates": None
        }), 404
    except Exception as e:
        return jsonify({
            "status": "error",
            "query": query,
            "message": str(e),
            "coordinates": None
        }), 500


@location_bp.route("/reverse", methods=["GET"])
@location_bp.route("/location/reverse", methods=["GET"])
def reverse_geocode():
    """
    Reverse geocodes lat/lon coordinates to place name worldwide.
    Query parameters:
        lat: latitude float
        lon: longitude float
    """
    try:
        lat = float(request.args.get("lat"))
        lon = float(request.args.get("lon"))
    except (TypeError, ValueError):
        return jsonify({
            "status": "error",
            "message": "Valid 'lat' and 'lon' query parameters are required."
        }), 400

    try:
        res = geocoding_service.reverse_geocode(lat, lon)
        return jsonify({
            "status": "success",
            "latitude": lat,
            "longitude": lon,
            "location": res
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
