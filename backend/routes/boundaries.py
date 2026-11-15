"""
Administrative Boundaries Blueprint
Serves authoritative geoBoundaries GeoJSON datasets for countries (ADM0),
states/provinces (ADM1), and districts/counties (ADM2).
"""

from flask import Blueprint, jsonify, request, current_app
from backend.services.geoboundaries import GeoBoundariesService

boundaries_bp = Blueprint("boundaries", __name__)
geoboundaries_service = GeoBoundariesService()


@boundaries_bp.route("/boundaries", methods=["GET"])
def get_boundaries():
    """
    Returns administrative boundaries GeoJSON for a given country and administrative level.
    Query parameters:
        iso3: ISO 3166-1 alpha-3 code (default: 'IND')
        adm: Administrative level - 'ADM0' (country), 'ADM1' (states), 'ADM2' (districts) (default: 'ADM1')
        parent: Optional parent state/region name to filter ADM2 districts (e.g. 'Kerala')
        simplified: Boolean flag to use simplified geometry for responsive rendering (default: 'true')
    """
    iso3 = request.args.get("iso3", "IND").strip().upper()
    adm = request.args.get("adm", "ADM1").strip().upper()
    parent = request.args.get("parent", "").strip() or None
    simplified_param = request.args.get("simplified", "true").strip().lower()
    prefer_simplified = simplified_param not in ("false", "0", "no")

    try:
        data = geoboundaries_service.get_boundaries(
            iso3=iso3,
            adm_level=adm,
            parent_filter=parent,
            prefer_simplified=prefer_simplified
        )
        return jsonify(data), 200
    except Exception as e:
        return jsonify({
            "type": "FeatureCollection",
            "features": [],
            "error": "Failed to load administrative boundaries",
            "details": str(e),
            "attribution": GeoBoundariesService.ATTRIBUTION
        }), 500


@boundaries_bp.route("/boundaries/meta", methods=["GET"])
def get_boundaries_metadata():
    """
    Returns metadata, supported administrative hierarchy, attribution, and license details.
    """
    return jsonify({
        "service": "geoBoundaries Open Administrative Boundaries Service",
        "source": "https://www.geoboundaries.org/",
        "attribution": GeoBoundariesService.ATTRIBUTION,
        "license": "CC-BY 4.0 / Open Data Commons Open Database License (ODbL)",
        "levels": {
            "ADM0": "Country / National boundary",
            "ADM1": "First-level divisions: States, Provinces, Regions, Union Territories",
            "ADM2": "Second-level divisions: Districts, Counties, Municipalities"
        },
        "default_iso3": "IND",
        "caching": "Local disk cache in data/cache/geoboundaries/"
    }), 200
