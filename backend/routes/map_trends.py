"""
Map Trends Routes Blueprint
Supplies state-wise direction and strength of change classification for choropleth mapping.
"""

from flask import Blueprint, jsonify, request

map_trends_bp = Blueprint("map_trends", __name__)


@map_trends_bp.route("/map-trends", methods=["GET"])
def get_map_trends():
    """
    Returns state-by-state classification for choropleth map coloring.
    Query parameters:
        variable: "temperature" | "precipitation" | "soil_moisture"
        start_date: YYYY
        end_date: YYYY | "latest"
    Foundational stub - returns schema structure ready for implementation.
    """
    variable = request.args.get("variable", "temperature")
    start_date = request.args.get("start_date", "2000")
    end_date = request.args.get("end_date", "latest")

    return jsonify({
        "status": "success",
        "message": "Map trends endpoint stub - ready for implementation",
        "variable": variable,
        "period": {
            "start": start_date,
            "end": end_date
        },
        "states": {}
    }), 200
