# TerraScope Backend: Detailed Implementation Plan & Technical Specification

> **Target Platform**: Python 3.10+ / Flask REST API / Pandas / NumPy / SciPy / PyMannKendall  
> **System Scope**: Ingestion of NASA Earth observation data, spatial aggregation across Indian states, non-parametric trend computation, and plain-language synthesis.

---

## 1. Architectural Blueprint & Component Responsibilities

The backend follows a modular Service-Oriented Architecture (SOA) structured into three distinct layers:
1. **HTTP / Routing Layer (`backend/routes/`)**: Request validation, route parsing, JSON serialization, and HTTP status handling.
2. **Ingestion & Service Layer (`backend/services/`)**: External API communication (NASA POWER, Nominatim), spatial polygon grid sampling, local caching, and offline sample data loading.
3. **Analytical & Statistical Engine (`backend/analysis/`)**: Time-series sanitization, missing-value filtering, Mann-Kendall trend detection, Sen's slope estimation, confidence interval generation, and plain-language narrative translation.

```
+-----------------------------------------------------------------------------------+
|                              Flask App (app.py)                                   |
|                  CORS Middleware, Configuration, Error Handlers                   |
+-----------------------------------------------------------------------------------+
          |                           |                         |
          v                           v                         v
+--------------------+      +--------------------+    +--------------------+
| location_bp        |      | analysis_bp        |    | map_trends_bp      |
| /api/states        |      | /api/variables     |    | /api/map-trends    |
| /api/search        |      | /api/analysis      |    +--------------------+
| /api/geocode       |      +--------------------+              |
+--------------------+                |                         |
          |                           v                         v
          |                 +--------------------+    +--------------------+
          |                 | report_bp          |    | State Pre-compute  |
          |                 | /api/report/<id>   |    | data/processed/    |
          |                 +--------------------+    +--------------------+
          |                           |
          +---------------------------+-----------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------------+
|                               Services Layer                                      |
|  +--------------------+  +--------------------+  +-----------------------------+  |
|  | GeocodingService   |  | NasaPowerService   |  | StateSamplerService         |  |
|  | (Nominatim+Fuzzy)  |  | (API+Retry Backoff)|  | (State Grid Point Sampling) |  |
|  +--------------------+  +--------------------+  +-----------------------------+  |
|  +--------------------+  +--------------------+  +-----------------------------+  |
|  | DataLoaderService  |  | GpmService (Stub)  |  | SwotService (Proxy Stub)    |  |
|  +--------------------+  +--------------------+  +-----------------------------+  |
+-----------------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------------+
|                             Analysis Engine                                       |
|  +--------------------+  +--------------------+  +-----------------------------+  |
|  | processing.py      |  | trends.py          |  | plain_language.py           |  |
|  | (Cleaning & Agg)   |  | (MK + Sen's Slope) |  | (Narrative Generation)      |  |
|  +--------------------+  +--------------------+  +-----------------------------+  |
|  +--------------------+  +--------------------+                                   |
|  | statistics.py      |  | significance.py    |                                   |
|  | (Summary Metrics)  |  | (5-Tier Classifier)|                                   |
|  +--------------------+  +--------------------+                                   |
+-----------------------------------------------------------------------------------+
```

---

## 2. Detailed Module Implementation Specifications

### 2.1 Configuration Management (`backend/config.py`)
- **Key Parameters**:
  - `NASA_POWER_BASE_URL`: Defaults to `https://power.larc.nasa.gov/api/temporal/`.
  - `NOMINATIM_BASE_URL`: `https://nominatim.openstreetmap.org/search`.
  - `NOMINATIM_USER_AGENT`: `TerraScope-India-Trend-Detective/1.0 (contact: info@terrascope.org)`.
  - `DEFAULT_SIGNIFICANCE_ALPHA`: $0.05$.
  - `EARLIEST_RECORD_YEAR`: $1981$.
  - Storage paths: `data/cache`, `data/processed`, `data/sample`, `frontend/assets/geo/india_states.geojson`.
- **Implementation Strategy**:
  - Subclasses for `DevelopmentConfig`, `TestingConfig`, and `ProductionConfig`.
  - Graceful fallback when `.env` is absent.

---

### 2.2 Route Endpoints & Schema Contracts

#### Endpoint 1: `GET /api/states`
- **File**: `backend/routes/location.py`
- **Implementation Steps**:
  1. Read `frontend/assets/geo/india_states.geojson`.
  2. Extract feature properties (`name`, `state_code`, `type`).
  3. Calculate bounding box `[[min_lat, min_lon], [max_lat, max_lon]]` and centroid `[lat, lon]` for each state.
  4. Return JSON response sorted alphabetically by state name.
- **Response Format**:
  ```json
  {
    "status": "success",
    "total": 36,
    "states": [
      {
        "id": "IN-KL",
        "name": "Kerala",
        "code": "KL",
        "type": "State",
        "centroid": [10.8505, 76.2711],
        "bounds": [[8.18, 74.85], [12.80, 77.41]]
      }
    ]
  }
  ```

#### Endpoint 2: `GET /api/search?q={query}`
- **File**: `backend/routes/location.py`
- **Implementation Steps**:
  1. Validate `q` parameter length $\ge 2$. Return empty list if $< 2$.
  2. Invoke `GeocodingService.search_local(query)`.
  3. If local results $< 3$, optionally invoke `GeocodingService.resolve_nominatim(query)`.
  4. Deduplicate results and return up to 6 suggestions.
- **Response Format**:
  ```json
  {
    "status": "success",
    "query": "kerala",
    "suggestions": [
      {
        "name": "Kerala",
        "type": "state",
        "latitude": 10.8505,
        "longitude": 76.2711,
        "display_name": "Kerala, India"
      }
    ]
  }
  ```

#### Endpoint 3: `GET /api/variables`
- **File**: `backend/routes/analysis.py`
- **Implementation Steps**:
  1. Return metadata dictionary of supported Earth observation variables:
     - `temperature` (`T2M`, unit `°C`)
     - `precipitation` (`PRECTOTCORR`, unit `mm`)
     - `soil_moisture` (`GWETTOP`, unit `fraction 0-1`)
     - `water_surface` (`SWOT_PROXY`, unit `index`)
  2. Include description, native parameters, and temporal limits for each.

#### Endpoint 4: `POST /api/analysis`
- **File**: `backend/routes/analysis.py`
- **Implementation Steps**:
  1. Validate payload with `backend/utils/validators.py`:
     - Must include `location` (`type` = "state" or "point", and identifier).
     - Must include non-empty `variables` list.
     - Optional `start_date` (defaults to `2000-01-01`), `end_date` (defaults to latest available), and `aggregation` ("yearly", "seasonal", "monthly").
  2. Retrieve raw time series:
     - If `location.type == "state"`:
       - Check `data/processed/` for pre-computed series.
       - If miss: use `StateSamplerService` to generate interior points, query `NasaPowerService` for each point, and average results into a composite state series.
     - If `location.type == "point"`:
       - Query `NasaPowerService` directly for the single coordinate.
  3. For each requested variable:
     - Clean series with `clean_time_series()` (drop `-999.0` fill values).
     - Aggregate data to target interval with `aggregate_time_series()`.
     - Compute summary statistics with `compute_summary_stats()`.
     - Run `calculate_mann_kendall()` and `calculate_sens_slope()`.
     - Evaluate significance and classify direction with `classify_trend_strength()`.
     - Generate plain-language text using `generate_plain_language_summary()`.
  4. Return complete analysis payload.
- **Response Schema**: Conforms strictly to Section 14 of specification.

#### Endpoint 5: `GET /api/map-trends?variable={var}&start_date={start}&end_date={end}`
- **File**: `backend/routes/map_trends.py`
- **Implementation Steps**:
  1. Check pre-computed state classification cache in `data/processed/map_trends_<variable>.json`.
  2. If absent or expired, compute classification for all 36 states dynamically or load from `data/sample/india_map_trends_sample.json`.
  3. Return key-value dictionary of states mapped to their trend class (`strong_increase`, `slight_increase`, `no_clear_change`, `slight_decrease`, `strong_decrease`), Sen's slope rate, and symbol.

#### Endpoint 6: `GET /api/report/<report_id>`
- **File**: `backend/routes/report.py`
- **Implementation Steps**:
  1. Fetch stored analysis by ID from cache.
  2. Format markdown export containing metadata, 12-point significance report structure (Section 10.3), data limitations, and attribution.
  3. Support query parameter `?format=json|markdown|pdf`.

---

## 3. Ingestion & Service Layer Implementation

### 3.1 NASA POWER API Client (`backend/services/nasa_power.py`)
- **API URL Pattern**:
  `https://power.larc.nasa.gov/api/temporal/daily/point?parameters={params}&community=ag&longitude={lon}&latitude={lat}&start={start}&end={end}&format=JSON`
- **Parameter Mapping**:
  - `temperature` $\rightarrow$ `T2M` (Temperature at 2 Meters)
  - `precipitation` $\rightarrow$ `PRECTOTCORR` (Precipitation Corrected)
  - `soil_moisture` $\rightarrow$ `GWETTOP` (Surface Soil Wetness)
  - `soil_moisture_root` $\rightarrow$ `GWETROOT` (Root Zone Soil Wetness)
- **Robustness & Error Handling**:
  1. **Retries with Exponential Backoff**: Implement `requests.adapters.HTTPAdapter` with `urllib3.util.Retry(total=3, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504])`.
  2. **Fill Value Sentinel Handling**: NASA POWER returns `-999.0` for missing dates. Replace `-999.0` with `NaN` immediately upon ingestion.
  3. **Local Cache Layer**: Cache each unique `(lat, lon, parameter, start, end)` combination as a compressed JSON file in `data/cache/power/`.

---

### 3.2 State Sampler Service (`backend/services/state_sampler.py`)
Because NASA POWER provides point queries rather than area queries:
1. **Grid Generation Algorithm**:
   - For a given state polygon $P$, determine minimum bounding box $[x_{\min}, y_{\min}, x_{\max}, y_{\max}]$.
   - Create a regular 2D grid with resolution step $\Delta = 0.5^\circ$ (~50 km).
   - Test each grid point $(x_i, y_j)$ using a point-in-polygon algorithm.
   - For very small states/UTs (e.g. Chandigarh, Lakshadweep) where no grid point falls inside $P$, use the geographic polygon centroid.
2. **State Aggregation**:
   - For time step $t$, state average is computed as:
     $$\bar{X}_t = \frac{1}{K}\sum_{k=1}^K X_{k, t}$$
     where $K$ is the number of valid internal sample points.
3. **Pre-computation Script (`scripts/precompute_states.py`)**:
   - Scheduled offline worker that queries all 36 states for standard baseline years (1981–present) and stores results in `data/processed/`.

---

### 3.3 Geocoding Service (`backend/services/geocoding.py`)
1. **Local State & District Dictionary**:
   - Store all 36 Indian states, union territories, and 700+ district names in a static local JSON table.
   - Run rapid fuzzy string matching (Levenshtein distance / fuzzy ratio $\ge 80$).
2. **Nominatim Fallback**:
   - Query `https://nominatim.openstreetmap.org/search` with parameters `countrycodes=in`, `format=jsonv2`, `limit=5`.
   - Adhere strictly to Nominatim usage policy: $\le 1$ request per second, identify with `User-Agent`.
   - Cache results in `data/cache/geocoding.json`.

---

## 4. Analytical & Statistical Computing Engine

### 4.1 Processing Pipeline (`backend/analysis/processing.py`)
1. Convert raw timestamp key-value mappings into a Pandas `DataFrame` with `DatetimeIndex`.
2. Mask values where `val == -999.0` as `np.nan`.
3. If missing values represent $> 20\%$ of an observational year, mark that year as incomplete.
4. Temporal Aggregation:
   - **Yearly**: Mean for temperature; annual cumulative sum for precipitation; mean for soil wetness.
   - **Seasonal**: Group by meteorological seasons (Monsoon: Jun–Sep, Post-Monsoon: Oct–Dec, Winter: Jan–Feb, Pre-Monsoon: Mar–May).
   - **Monthly**: Monthly average / sum.

---

### 4.2 Mann-Kendall Trend Detection (`backend/analysis/trends.py`)
1. **Mann-Kendall Test Statistic ($S$)**:
   $$S = \sum_{k=1}^{n-1} \sum_{j=k+1}^n \text{sgn}(x_j - x_k)$$
   $$\text{sgn}(\theta) = \begin{cases} 1 & \text{if } \theta > 0 \\ 0 & \text{if } \theta = 0 \\ -1 & \text{if } \theta < 0 \end{cases}$$
2. **Variance $\text{Var}(S)$**:
   $$\text{Var}(S) = \frac{n(n-1)(2n+5) - \sum_{i=1}^m t_i(t_i-1)(2t_i+5)}{18}$$
   where $m$ is the number of tied groups and $t_i$ is the number of data points in group $i$.
3. **Standardized Test Statistic ($Z$)**:
   $$Z = \begin{cases} \frac{S - 1}{\sqrt{\text{Var}(S)}} & \text{if } S > 0 \\ 0 & \text{if } S = 0 \\ \frac{S + 1}{\sqrt{\text{Var}(S)}} & \text{if } S < 0 \end{cases}$$
4. **$p$-value Calculation**:
   - Two-tailed cumulative normal distribution probability:
     $$p = 2 \times (1 - \Phi(|Z|))$$
   - Trend is deemed statistically significant if $p < 0.05$.

---

### 4.3 Sen's Slope Estimator & 95% Confidence Interval (`backend/analysis/trends.py`)
1. Compute all pairwise slopes $Q_{i} = \frac{x_j - x_k}{j - k}$ for all $1 \le k < j \le n$.
2. The Sen's slope estimator is:
   $$\beta = \text{median}(Q)$$
3. Compute change per decade:
   $$\text{Rate}_{\text{decade}} = \beta \times 10$$
4. Compute 95% non-parametric two-sided confidence limits using ranks $M_1 = \frac{N - C_{\alpha}}{2}$ and $M_2 = \frac{N + C_{\alpha}}{2}$ where $C_{\alpha} = Z_{1 - \alpha/2} \sqrt{\text{Var}(S)}$.

---

### 4.4 5-Tier Direction Classification (`backend/analysis/significance.py`)

Classification logic strictly implements Section 7.3 and Section 10 of the specification:

```python
def classify_trend(variable, slope_per_decade, p_value, alpha=0.05):
    if p_value >= alpha:
        return {"class": "no_clear_change", "symbol": "=", "name": "No clear change"}
    
    # Thresholds per decade
    thresholds = {
        "temperature": 0.25,      # 0.25 °C / decade
        "precipitation": 5.0,     # 5.0 mm/year or 5% / decade
        "soil_moisture": 0.05,    # 0.05 fraction / decade
    }
    strong_thresh = thresholds.get(variable, 0.25)
    
    if slope_per_decade > 0:
        if slope_per_decade >= strong_thresh:
            return {"class": "strong_increase", "symbol": "▲▲", "name": "Strong increase"}
        return {"class": "slight_increase", "symbol": "▲", "name": "Slight increase"}
    else:
        if abs(slope_per_decade) >= strong_thresh:
            return {"class": "strong_decrease", "symbol": "▼▼", "name": "Strong decrease"}
        return {"class": "slight_decrease", "symbol": "▼", "name": "Slight decrease"}
```

---

### 4.5 Plain-Language Narrative Engine (`backend/analysis/plain_language.py`)
Generates user-facing summaries matching Section 11 of the specification:

| Condition | Output Template |
|---|---|
| Significant Increase ($p < 0.05$, $\beta > 0$) | `"Between {start} and {end}, {variable} in {location} went up by about {rate} {unit} per decade. This change is very unlikely to be due to chance."` |
| Significant Decrease ($p < 0.05$, $\beta < 0$) | `"Between {start} and {end}, {variable} in {location} went down by about {rate} {unit} per decade. This change is very unlikely to be due to chance."` |
| Not Significant ($p \ge 0.05$) | `"{variable} in {location} moved up and down between {start} and {end}, but there is no clear long-term change. The pattern could be normal year-to-year variation."` |
| Data Insufficient ($N < 10$) | `"There is not enough data between {start} and {end} to say whether the change in {location} is real."` |

---

## 5. Testing & Verification Suite

1. **Synthetic Series Testing (`backend/tests/test_trends.py`)**:
   - Monotonically increasing linear sequence $\rightarrow$ verify $p < 0.001$, slope $> 0$.
   - Monotonically decreasing sequence $\rightarrow$ verify $p < 0.001$, slope $< 0$.
   - Flat sequence with zero slope $\rightarrow$ verify $p > 0.9$, slope $= 0$.
   - White noise Gaussian sequence $\rightarrow$ verify $p > 0.05$ (fails significance).
2. **Significance & Plain Language Testing (`backend/tests/test_plain_language.py`)**:
   - Verify proper template substitution, unit formatting, and absence of scientific jargon in the headline text.
3. **NASA API Resilience Testing (`backend/tests/test_services.py`)**:
   - Mock network timeouts and HTTP 429 rate limit responses; confirm retry behavior and fallback to `data/sample/`.
