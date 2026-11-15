"""
TerraScope Configuration Module
Loads configuration settings from environment variables with sensible defaults.
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / ".env")
except ImportError:
    pass


class Config:
    """Base application configuration."""
    SECRET_KEY = os.getenv("SECRET_KEY", "terrascope-dev-secret-key-2026")
    BASE_DIR = BASE_DIR

    # Storage and Cache Paths
    CACHE_DIR = BASE_DIR / os.getenv("CACHE_DIR", "data/cache")
    PROCESSED_DATA_DIR = BASE_DIR / os.getenv("PROCESSED_DATA_DIR", "data/processed")
    SAMPLE_DATA_DIR = BASE_DIR / os.getenv("SAMPLE_DATA_DIR", "data/sample")
    RAW_DATA_DIR = BASE_DIR / os.getenv("RAW_DATA_DIR", "data/raw")
    GEOJSON_FILE_PATH = BASE_DIR / os.getenv("GEOJSON_FILE_PATH", "frontend/assets/geo/india_states.geojson")

    # NASA POWER Settings
    NASA_POWER_BASE_URL = os.getenv("NASA_POWER_API_BASE_URL", "https://power.larc.nasa.gov/api/temporal/")
    NASA_POWER_TIMEOUT = int(os.getenv("NASA_POWER_TIMEOUT_SECONDS", "30"))
    NASA_POWER_MAX_RETRIES = int(os.getenv("NASA_POWER_MAX_RETRIES", "3"))

    # Geocoding Settings
    NOMINATIM_BASE_URL = os.getenv("NOMINATIM_BASE_URL", "https://nominatim.openstreetmap.org/search")
    NOMINATIM_USER_AGENT = os.getenv("NOMINATIM_USER_AGENT", "TerraScope-Trend-Detective/1.0 (contact: info@terrascope.org)")
    NOMINATIM_DELAY = float(os.getenv("NOMINATIM_RATE_LIMIT_DELAY", "1.0"))
    MAPS_CO_BASE_URL = os.getenv("MAPS_CO_BASE_URL", "https://geocode.maps.co/")
    MAPS_CO_API_KEY = os.getenv("MAPS_CO_API_KEY", "6af90b68bd2d8927044351jui42295")

    # GPM IMERG Settings
    GPM_BASE_URL = os.getenv("GPM_BASE_URL", "https://gpm.nasa.gov/data/imerg")
    GPM_CACHE_DIR = BASE_DIR / os.getenv("GPM_CACHE_DIR", "data/cache/gpm")

    # geoBoundaries Settings (Administrative Boundaries ADM0, ADM1, ADM2)
    GEOBOUNDARIES_BASE_URL = os.getenv("GEOBOUNDARIES_BASE_URL", "https://www.geoboundaries.org/api/current/gbOpen/")
    GEOBOUNDARIES_CACHE_DIR = BASE_DIR / os.getenv("GEOBOUNDARIES_CACHE_DIR", "data/cache/geoboundaries")

    # Statistical Defaults
    DEFAULT_SIGNIFICANCE_ALPHA = float(os.getenv("DEFAULT_SIGNIFICANCE_ALPHA", "0.05"))
    DEFAULT_START_YEAR = int(os.getenv("DEFAULT_START_YEAR", "2000"))
    EARLIEST_RECORD_YEAR = 1981

    # CORS
    ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

    @classmethod
    def init_directories(cls):
        """Ensure runtime directories exist."""
        for directory in [cls.CACHE_DIR, cls.PROCESSED_DATA_DIR, cls.SAMPLE_DATA_DIR, cls.RAW_DATA_DIR, cls.GPM_CACHE_DIR, cls.GEOBOUNDARIES_CACHE_DIR]:
            directory.mkdir(parents=True, exist_ok=True)


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    TESTING = False


class TestingConfig(Config):
    """Testing configuration."""
    DEBUG = False
    TESTING = True
    CACHE_DIR = Config.BASE_DIR / "data" / "cache" / "test"


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    TESTING = False


CONFIG_MAP = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}


def get_config():
    """Retrieve active configuration based on FLASK_ENV."""
    env = os.getenv("FLASK_ENV", "development").lower()
    config_cls = CONFIG_MAP.get(env, DevelopmentConfig)
    config_cls.init_directories()
    return config_cls
