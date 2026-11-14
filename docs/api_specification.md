# TerraScope REST API Specification

## Base URL
Default local development: `http://127.0.0.1:5000/api`

---

## 1. Get States & Territories
- **Route**: `GET /api/states`
- **Description**: Returns all 36 Indian states and union territories with bounding box, centroid, and official code.
- **Response**:
```json
{
  "total": 36,
  "states": [
    {
      "code": "IN-KL",
      "name": "Kerala",
      "capital": "Thiruvananthapuram",
      "centroid": [10.8505, 76.2711],
      "bounds": [[8.18, 74.85], [12.80, 77.41]]
    }
  ]
}
```

---

## 2. Search & Geocode Locations
- **Route**: `GET /api/search?q={query}`
- **Description**: Suggests locations matching query string. Prioritizes local Indian state/district dictionary before querying Nominatim.
- **Response**:
```json
{
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

---

## 3. Supported Environmental Variables
- **Route**: `GET /api/variables`
- **Description**: Lists supported climatic variables, units, time ranges, and source attribution.
- **Response**:
```json
{
  "variables": [
    {
      "id": "temperature",
      "name": "Air Temperature",
      "parameter_code": "T2M",
      "unit": "°C",
      "source": "NASA POWER",
      "earliest_year": 1981,
      "description": "Near-surface air temperature at 2 meters above ground level"
    },
    {
      "id": "precipitation",
      "name": "Precipitation / Rainfall",
      "parameter_code": "PRECTOTCORR",
      "unit": "mm",
      "source": "NASA POWER",
      "earliest_year": 1981,
      "description": "Precipitation corrected for surface model dynamics"
    },
    {
      "id": "soil_moisture",
      "name": "Soil Wetness",
      "parameter_code": "GWETTOP",
      "unit": "fraction",
      "source": "NASA POWER",
      "earliest_year": 1981,
      "description": "Surface soil moisture fraction (0 = dry, 1 = saturated)"
    }
  ]
}
```

---

## 4. Run Trend & Significance Analysis
- **Route**: `POST /api/analysis`
- **Request Body**:
```json
{
  "location": {
    "type": "state",
    "name": "Kerala",
    "coordinates": [10.8505, 76.2711]
  },
  "variables": ["temperature"],
  "start_date": "2000-01-01",
  "end_date": "latest",
  "aggregation": "yearly"
}
```
- **Response**:
```json
{
  "location": {
    "name": "Kerala",
    "type": "state"
  },
  "period": {
    "start": "2000",
    "end": "2025",
    "latest_available": "2025-09"
  },
  "results": [
    {
      "variable": "temperature",
      "friendly_name": "Air Temperature",
      "unit": "°C",
      "source": "NASA POWER (T2M)",
      "n_observations": 26,
      "mean": 27.42,
      "min": 26.81,
      "max": 28.14,
      "trend": {
        "direction": "increasing",
        "method": "Mann-Kendall with Sen's slope",
        "slope_per_decade": 0.31,
        "p_value": 0.012,
        "significant": true,
        "confidence_interval_95": [0.12, 0.49],
        "class": "slight_increase",
        "symbol": "▲"
      },
      "series": [
        { "date": "2000", "value": 26.91, "trend_value": 26.85 }
      ],
      "summary": "Between 2000 and 2025, air temperature in Kerala went up by about 0.3 °C per decade. This change is very unlikely to be due to chance.",
      "limitations": [
        "NASA POWER assimilation has a coarse spatial grid (~50km).",
        "Point and state averages reflect gridded models rather than localized weather station records."
      ],
      "hypotheses": [
        "Consistent with broad-scale regional warming observed across peninsular India."
      ]
    }
  ]
}
```

---

## 5. Map Trends (State-Wise Direction Classification)
- **Route**: `GET /api/map-trends?variable={variable}&start={start}&end={end}`
- **Description**: Returns the pre-calculated direction classification for all 36 Indian states for choropleth map rendering.
- **Response**:
```json
{
  "variable": "temperature",
  "period": { "start": "2000", "end": "2025" },
  "states": {
    "Kerala": { "class": "slight_increase", "slope_per_decade": 0.31, "significant": true, "symbol": "▲" },
    "Punjab": { "class": "strong_increase", "slope_per_decade": 0.45, "significant": true, "symbol": "▲▲" },
    "Goa": { "class": "no_clear_change", "slope_per_decade": 0.05, "significant": false, "symbol": "=" }
  }
}
```

---

## 6. Report Export
- **Route**: `GET /api/report/{id}`
- **Description**: Generates markdown or JSON export containing complete scientific summary, citation info, and data provenance.
