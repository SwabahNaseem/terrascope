"""
Location Routes Blueprint
Handles location search, geocoding resolution, and states/territories metadata.
"""

from flask import Blueprint, jsonify, request

location_bp = Blueprint("location", __name__)


@location_bp.route("/states", methods=["GET"])
def get_states():
    """
    Returns list of all 36 Indian states and union territories.
    Foundational stub - will load boundaries and metadata from GeoJSON.
    """
    return jsonify({
        "status": "success",
        "message": "States endpoint stub - ready for implementation",
        "total": 0,
        "states": []
    }), 200


@location_bp.route("/search", methods=["GET"])
def search_locations():
    """
    Location autocomplete and fuzzy search for places in India.
    Query parameters:
        q: search query string
    Foundational stub - will query local dictionary before Nominatim.
    """
    query = request.args.get("q", "").strip()
    return jsonify({
        "status": "success",
        "query": query,
        "message": "Search endpoint stub - ready for implementation",
        "suggestions": []
    }), 200


@location_bp.route("/geocode", methods=["GET"])
def geocode_location():
    """
    Direct geocoding conversion of a location name to coordinates.
    Query parameters:
        q: location name in India
    Foundational stub - will integrate Nominatim service with local caching.
    """
    query = request.args.get("q", "").strip()
    return jsonify({
        "status": "success",
        "query": query,
        "message": "Geocode endpoint stub - ready for implementation",
        "coordinates": None
    }), 200
