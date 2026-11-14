# Data Sources & Ingestion Standards

## 1. Primary Data Provider: NASA POWER API
The NASA Prediction Of Worldwide Energy Resources (POWER) project provides solar and meteorological datasets derived from NASA assimilation models and satellite observations.

- **Base Endpoint**: `https://power.larc.nasa.gov/api/temporal/`
- **Spatial Resolution**: $0.5^\circ \times 0.5^\circ$ latitude/longitude grid.
- **Coverage**: 1981 to present (typically lagged by 2–3 months).

### Parameter Specifications

| Parameter Code | Internal Key | Friendly Name | Native Units | Display Units | Notes |
|---|---|---|---|---|---|
| `T2M` | `temperature` | Air Temperature at 2 Meters | °C | °C | Daily mean, aggregated to monthly/yearly |
| `PRECTOTCORR` | `precipitation` | Precipitation Corrected | mm/day | mm/year or mm/month | Summed over aggregation window |
| `GWETTOP` | `soil_moisture_top` | Surface Soil Wetness (0–5 cm) | 0–1 fraction | Fraction (0 to 1) | Dimensionless soil moisture ratio |
| `GWETROOT` | `soil_moisture_root` | Root Zone Soil Wetness (0–100 cm) | 0–1 fraction | Fraction (0 to 1) | Dimensionless root zone ratio |

## 2. Water Surface Elevation & Extent (SWOT & Proxies)
- **Status in Phase 1**: Surface water measurement across entire states via NASA POWER is unavailable.
- **Implementation Strategy**:
  1. Default indicator: Soil wetness / GLDAS runoff proxy clearly annotated in UI.
  2. Future Phase: Ingest SWOT (Surface Water and Ocean Topography) vector lake products for designated Indian reservoirs (e.g. Idukki, Nagarjuna Sagar, Sardar Sarovar) with launch-era disclaimer (2022 onwards).

## 3. Geocoding & Boundary Services

### 3.1 Nominatim (OpenStreetMap)
- Used for arbitrary location coordinate resolution (`q=<search_term>&countrycodes=in&format=jsonv2`).
- **Policy Compliance**:
  - Maximum rate: $\le 1$ request per second.
  - Custom `User-Agent` identifying TerraScope.
  - Strict caching of resolved locations in `data/cache/geocoding.json`.
  - Local fuzzy matching of Indian states/districts prioritized over live web calls.

### 3.2 India Administrative Boundaries
- Official India boundary GeoJSON stored under `frontend/assets/geo/india_states.geojson`.
- Depicts all 28 states and 8 union territories following Government of India guidelines.

## 4. Validation Datasets
- **NASA Giovanni**: Monthly time series extraction for ground-truth comparison.
- **Data Rods for Hydrology**: Point time series from GLDAS for soil moisture verification.
- **KNMI Climate Explorer**: Cross-validation of Mann-Kendall statistics.
