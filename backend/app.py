"""
TerraScope Backend Application Entry Point
Flask REST API application factory, route registration, and centralized error handling.
"""

import os
import sys
from pathlib import Path
from flask import Flask, jsonify, redirect

# Ensure project root is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

try:
    from backend.config import get_config
except ImportError:
    from config import get_config


def create_app(config_class=None):
    """Application factory for TerraScope REST API."""
    if config_class is None:
        config_class = get_config()

    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize required runtime cache directories
    if hasattr(config_class, "init_directories"):
        try:
            config_class.init_directories()
        except Exception:
            pass

    # Enable Cross-Origin Resource Sharing
    try:
        from flask_cors import CORS
        CORS(app, origins=app.config.get("ALLOWED_ORIGINS", "*"))
    except ImportError:
        pass

    # Register API Blueprints
    from backend.routes.location import location_bp
    from backend.routes.analysis import analysis_bp
    from backend.routes.map_trends import map_trends_bp
    from backend.routes.report import report_bp
    from backend.routes.boundaries import boundaries_bp

    app.register_blueprint(location_bp, url_prefix="/api")
    app.register_blueprint(analysis_bp, url_prefix="/api")
    app.register_blueprint(map_trends_bp, url_prefix="/api")
    app.register_blueprint(report_bp, url_prefix="/api")
    app.register_blueprint(boundaries_bp, url_prefix="/api")

    @app.route("/", methods=["GET"])
    def index():
        """Root endpoint returning API catalog."""
        return jsonify({
            "service": "TerraScope Earth System Trend Detective API",
            "version": "1.0.0",
            "edition": "Global & India Edition",
            "endpoints": {
                "health": "/api/health",
                "states": "/api/states",
                "boundaries": "/api/boundaries?iso3={iso3}&adm={adm0|adm1|adm2}",
                "search": "/api/search?q={query}",
                "geocode": "/api/geocode?q={query}",
                "reverse": "/api/reverse?lat={lat}&lon={lon}",
                "variables": "/api/variables",
                "analysis": "/api/analysis (POST)",
                "map_trends": "/api/map-trends?variable={variable}",
                "report": "/api/report/{report_id}"
            }
        }), 200

    @app.route("/api/health", methods=["GET"])
    def health_check():
        """Health check endpoint to verify API readiness."""
        return jsonify({
            "status": "ok",
            "service": "terrascope-api",
            "version": "1.0.0",
            "edition": "India Edition"
        }), 200

    @app.errorhandler(400)
    def handle_bad_request(error):
        return jsonify({
            "status": "error",
            "error": "Bad request",
            "message": str(error),
            "code": 400
        }), 400

    @app.errorhandler(404)
    def handle_not_found(error):
        return jsonify({
            "status": "error",
            "error": "Resource not found",
            "code": 404
        }), 404

    @app.errorhandler(405)
    def handle_method_not_allowed(error):
        return jsonify({
            "status": "error",
            "error": "Method not allowed",
            "code": 405
        }), 405

    @app.errorhandler(500)
    def handle_server_error(error):
        return jsonify({
            "status": "error",
            "error": "Internal server error",
            "code": 500
        }), 500

    return app


if __name__ == "__main__":
    app = create_app()
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "5000"))
    app.run(host=host, port=port, debug=app.config.get("DEBUG", True))
