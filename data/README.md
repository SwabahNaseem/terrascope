# TerraScope Data Directory Architecture

The `data/` directory manages all Earth observation inputs, pre-computed aggregates, transient cache entries, and sample datasets used across TerraScope.

---

## Directory Organization

```
data/
├── raw/         # Unmodified raw JSON / NetCDF responses directly from NASA APIs (git-ignored)
├── processed/   # Cleaned, standardized state-level time series & spatial grids (git-ignored)
├── cache/       # Transient API response cache & geocoding lookup tables (git-ignored)
└── sample/      # Committed baseline datasets ensuring offline demonstration capability
```

---

## Sample Data Policy
Files placed under `data/sample/` are version-controlled and serve two essential roles:
1. **Zero-API Local Demo**: Allow judges, evaluators, and developers to run TerraScope locally without requiring an internet connection or NASA credentials.
2. **Deterministic Automated Testing**: Used by `backend/tests/` to verify trend detection algorithms against known reference values without network fluctuations.

---

## Data Provenance
- Air temperature (`T2M`), precipitation (`PRECTOTCORR`), and soil wetness (`GWETTOP`) originate from the NASA Prediction of Worldwide Energy Resources (POWER) project.
- State boundary vectors conform to Government of India spatial definitions.
