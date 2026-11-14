"""
TerraScope API Route Blueprints
"""

from backend.routes.location import location_bp
from backend.routes.analysis import analysis_bp
from backend.routes.map_trends import map_trends_bp
from backend.routes.report import report_bp

__all__ = ["location_bp", "analysis_bp", "map_trends_bp", "report_bp"]
