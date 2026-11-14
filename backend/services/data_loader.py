"""
Data Loader Service
Handles loading and persisting pre-computed datasets, sample files, and offline fallback responses.
"""

import json
import re
from pathlib import Path
from typing import Dict, Optional, Any


class DataLoaderService:
    """Service for interacting with data/cache, data/sample, and data/processed directories."""

    def __init__(
        self,
        sample_dir: Optional[Path] = None,
        processed_dir: Optional[Path] = None,
        cache_dir: Optional[Path] = None,
        raw_dir: Optional[Path] = None
    ):
        base_dir = Path(__file__).resolve().parent.parent.parent
        self.sample_dir = Path(sample_dir) if sample_dir else base_dir / "data" / "sample"
        self.processed_dir = Path(processed_dir) if processed_dir else base_dir / "data" / "processed"
        self.cache_dir = Path(cache_dir) if cache_dir else base_dir / "data" / "cache"
        self.raw_dir = Path(raw_dir) if raw_dir else base_dir / "data" / "raw"

        # Ensure directories exist
        for d in (self.sample_dir, self.processed_dir, self.cache_dir, self.raw_dir):
            d.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def slugify(name: str) -> str:
        """Converts name to lower-case filesystem-friendly slug."""
        clean = re.sub(r"[^\w\s-]", "", name.lower()).strip()
        return re.sub(r"[-\s]+", "_", clean)

    def load_sample(self, file_name: str) -> Optional[Dict[str, Any]]:
        """Loads a bundled sample JSON dataset."""
        file_path = self.sample_dir / file_name
        if file_path.exists():
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return None
        return None

    def load_processed_state(self, state_name: str, variable: str) -> Optional[Dict[str, Any]]:
        """Loads pre-computed state aggregate data from processed storage."""
        slug = self.slugify(state_name)
        # Check direct processed file
        file_path = self.processed_dir / f"{slug}_{variable}.json"
        if file_path.exists():
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass

        # Check sample fallback
        sample_path = self.sample_dir / f"{slug}_{variable}_sample.json"
        if sample_path.exists():
            try:
                with open(sample_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass

        return None

    def save_processed_state(self, state_name: str, variable: str, data: Dict[str, Any]) -> None:
        """Persists pre-computed state data into processed directory."""
        slug = self.slugify(state_name)
        file_path = self.processed_dir / f"{slug}_{variable}.json"
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception:
            pass

    def load_map_trends(self, variable: str) -> Optional[Dict[str, Any]]:
        """Loads map trends classification for choropleth mapping."""
        # Check processed directory first
        file_path = self.processed_dir / f"map_trends_{variable}.json"
        if file_path.exists():
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass

        # Check bundled sample dataset
        sample_path = self.sample_dir / "india_map_trends_sample.json"
        if sample_path.exists():
            try:
                with open(sample_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if data.get("variable") == variable:
                        return data
                    # If sample is for temperature and requested is temperature
                    if variable == "temperature":
                        return data
            except Exception:
                pass

        return None

    def save_map_trends(self, variable: str, data: Dict[str, Any]) -> None:
        """Persists map trends dataset into processed directory."""
        file_path = self.processed_dir / f"map_trends_{variable}.json"
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception:
            pass

    def get_cache(self, key: str) -> Optional[Dict[str, Any]]:
        """Retrieves cached JSON payload by key."""
        file_path = self.cache_dir / f"{key}.json"
        if file_path.exists():
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return None

    def save_cache(self, key: str, data: Dict[str, Any]) -> None:
        """Persists intermediate response into local cache directory."""
        file_path = self.cache_dir / f"{key}.json"
        file_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception:
            pass
