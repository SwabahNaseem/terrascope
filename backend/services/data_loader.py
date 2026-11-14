"""
Data Loader Service
Handles loading and persisting pre-computed datasets, sample files, and offline fallback responses.
"""

from pathlib import Path
from typing import Dict, Optional
import json


class DataLoaderService:
    """Service for interacting with data/cache, data/sample, and data/processed directories."""

    def __init__(self, sample_dir: Path, processed_dir: Path, cache_dir: Path):
        self.sample_dir = Path(sample_dir)
        self.processed_dir = Path(processed_dir)
        self.cache_dir = Path(cache_dir)

    def load_sample(self, file_name: str) -> Optional[Dict]:
        """Loads a bundled sample JSON dataset."""
        file_path = self.sample_dir / file_name
        if file_path.exists():
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return None

    def load_processed_state(self, state_name: str, variable: str) -> Optional[Dict]:
        """Loads pre-computed state aggregate data from processed storage."""
        return None

    def save_cache(self, key: str, data: dict) -> None:
        """Persists intermediate response into local cache directory."""
        pass
