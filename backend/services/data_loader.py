"""
TerraScope Data Loader Service
Handles loading and persisting pre-computed datasets, sample files, and offline fallback responses.
Interacts with data/cache, data/sample, and data/processed directories.
"""

from pathlib import Path
from typing import Dict, Optional, Any, List
import json
import os
import re


class DataLoaderService:
    """Service for interacting with data/cache, data/sample, and data/processed directories."""

    def __init__(
        self,
        sample_dir: Optional[Path] = None,
        processed_dir: Optional[Path] = None,
        cache_dir: Optional[Path] = None,
    ):
        base_dir = Path(__file__).resolve().parent.parent.parent

        self.sample_dir = Path(sample_dir) if sample_dir else base_dir / "data" / "sample"
        self.processed_dir = Path(processed_dir) if processed_dir else base_dir / "data" / "processed"
        self.cache_dir = Path(cache_dir) if cache_dir else base_dir / "data" / "cache"

        # Ensure base directories exist
        for directory in [self.sample_dir, self.processed_dir, self.cache_dir]:
            try:
                directory.mkdir(parents=True, exist_ok=True)
            except OSError:
                pass

    @staticmethod
    def _sanitize_key(key: str) -> str:
        """Sanitizes cache and file keys to safe alphanumeric filenames."""
        clean = re.sub(r"[^\w\-\.]", "_", key.strip().lower())
        return clean[:120]

    def load_sample(self, file_name: str) -> Optional[Dict[str, Any]]:
        """Loads a bundled sample JSON dataset from data/sample/."""
        file_path = self.sample_dir / file_name
        if not file_path.exists():
            # Try appending .json if omitted
            if not file_name.endswith(".json"):
                file_path = self.sample_dir / f"{file_name}.json"

        if file_path.exists():
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except (json.JSONDecodeError, OSError):
                return None
        return None

    def load_processed_state(self, state_name: str, variable: str = "temperature") -> Optional[Dict[str, Any]]:
        """
        Loads pre-computed state aggregate data from processed storage.
        Falls back to bundled samples if processed file is not yet generated.
        """
        clean_state = self._sanitize_key(state_name)
        clean_var = self._sanitize_key(variable)

        # Candidates in data/processed/
        candidates = [
            self.processed_dir / f"{clean_state}_{clean_var}.json",
            self.processed_dir / f"{clean_state}.json",
            self.processed_dir / f"state_averages_{clean_var}.json",
        ]

        for path in candidates:
            if path.exists():
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        if path.name.startswith("state_averages_"):
                            # Extracted from composite file if structured by state
                            if isinstance(data, dict) and state_name in data:
                                return data[state_name]
                        return data
                except (json.JSONDecodeError, OSError):
                    continue

        # Offline fallback: Check sample datasets (e.g. Kerala sample)
        if clean_state in ("kerala", "in_kl") and clean_var in ("temperature", "t2m"):
            sample = self.load_sample("kerala_temperature_sample.json")
            if sample:
                return sample

        return None

    def save_processed_state(self, state_name: str, variable: str, data: Dict[str, Any]) -> Path:
        """Persists pre-computed state aggregate data to data/processed/."""
        clean_state = self._sanitize_key(state_name)
        clean_var = self._sanitize_key(variable)
        target_path = self.processed_dir / f"{clean_state}_{clean_var}.json"

        with open(target_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

        return target_path

    def load_map_trends(self, variable: str = "temperature") -> Optional[Dict[str, Any]]:
        """
        Loads national state choropleth classification data.
        Checks processed directory first, then falls back to bundled sample.
        """
        clean_var = self._sanitize_key(variable)
        processed_file = self.processed_dir / f"map_trends_{clean_var}.json"

        if processed_file.exists():
            try:
                with open(processed_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except (json.JSONDecodeError, OSError):
                pass

        # Fallback to bundled sample
        return self.load_sample("india_map_trends_sample.json")

    def save_map_trends(self, variable: str, data: Dict[str, Any]) -> Path:
        """Persists national state choropleth classification data."""
        clean_var = self._sanitize_key(variable)
        target_path = self.processed_dir / f"map_trends_{clean_var}.json"

        with open(target_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

        return target_path

    def load_cache(self, key: str, namespace: str = "default") -> Optional[Dict[str, Any]]:
        """
        Retrieves cached response from local disk cache directory.
        """
        clean_ns = self._sanitize_key(namespace)
        clean_k = self._sanitize_key(key)
        target_dir = self.cache_dir / clean_ns
        target_file = target_dir / f"{clean_k}.json"

        if target_file.exists():
            try:
                with open(target_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except (json.JSONDecodeError, OSError):
                return None
        return None

    def save_cache(self, key: str, data: Dict[str, Any], namespace: str = "default") -> None:
        """
        Persists response payload into local cache directory.
        """
        clean_ns = self._sanitize_key(namespace)
        clean_k = self._sanitize_key(key)
        target_dir = self.cache_dir / clean_ns

        try:
            target_dir.mkdir(parents=True, exist_ok=True)
            target_file = target_dir / f"{clean_k}.json"
            with open(target_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except OSError:
            pass
