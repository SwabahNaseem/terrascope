# TerraScope Data Directory Architecture

The `data/` directory manages all Earth observation inputs, pre-computed aggregates, transient cache entries, and sample datasets used across TerraScope.

---

## Directory Organization

```
data/
├── raw/         # Unmodified raw JSON / NetCDF responses directly from NASA APIs (git-ignored)
├── processed/   # Cleaned, standardized state-level time series & spatial grids (git-ignored)
│   ├── map_trends_temperature.json    # National 36-state direction classification for temperature
│   ├── map_trends_precipitation.json  # National 36-state direction classification for precipitation
│   ├── map_trends_soil_moisture.json  # National 36-state direction classification for soil wetness
│   └── kerala_temperature.json        # Pre-computed baseline state series
├── cache/       # Transient API response cache & geocoding lookup tables (git-ignored)
│   ├── geocoding.json                 # Nominatim reverse/forward geocoding cache
│   └── power/                         # NASA POWER point response cache files
└── sample/      # Committed baseline datasets ensuring offline demonstration capability
    ├── kerala_temperature_sample.json # Reference 2000-2025 Kerala temperature dataset
    └── india_map_trends_sample.json   # Reference 36-state temperature trend classifications
```

---

## Sample & Processed Data Policy
Files placed under `data/sample/` and `data/processed/` serve two essential roles:
1. **Zero-API Local Demo**: Allow judges, evaluators, and developers to run TerraScope locally without requiring an internet connection or NASA credentials.
2. **Deterministic Automated Testing**: Used by `backend/tests/` to verify trend detection algorithms against known reference values without network fluctuations.

---

## Data Provenance
- Air temperature (`T2M`), precipitation (`PRECTOTCORR`), and soil wetness (`GWETTOP`) originate from the NASA Prediction of Worldwide Energy Resources (POWER) project.
- State boundary vectors conform to Government of India spatial definitions.
