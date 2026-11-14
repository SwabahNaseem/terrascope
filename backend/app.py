"""
TerraScope Backend Application Entry Point
Flask REST API application factory and route registration.
"""

import os
from flask import Flask, jsonify
from flask_cors import CORS
from backend.config import get_config


def create_app(config_class=None):
    """Application factory for TerraScope REST API."""
    if config_class is None:
        config_class = get_config()

    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable Cross-Origin Resource Sharing
    CORS(app, origins=app.config.get("ALLOWED_ORIGINS", "*"))

    # Register API Blueprints
    from backend.routes.location import location_bp
    from backend.routes.analysis import analysis_bp
    from backend.routes.map_trends import map_trends_bp
    from backend.routes.report import report_bp

    app.register_blueprint(location_bp, url_prefix="/api")
    app.register_blueprint(analysis_bp, url_prefix="/api")
    app.register_blueprint(map_trends_bp, url_prefix="/api")
    app.register_blueprint(report_bp, url_prefix="/api")

    @app.route("/api/health", methods=["GET"])
    def health_check():
        """Health check endpoint to verify API readiness."""
        return jsonify({
            "status": "ok",
            "service": "terrascope-api",
            "version": "1.0.0",
            "edition": "India Edition"
        }), 200

    @app.errorhandler(404)
    def handle_not_found(error):
        return jsonify({"error": "Resource not found", "status": 404}), 404

    @app.errorhandler(500)
    def handle_server_error(error):
        return jsonify({"error": "Internal server error", "status": 500}), 500

    return app


if __name__ == "__main__":
    app = create_app()
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "5000"))
    app.run(host=host, port=port, debug=app.config.get("DEBUG", True))
