# TerraScope: Master Implementation Blueprint & Architecture Guide

This document defines the foundational blueprint, component roles, interface contracts, and implementation steps for building TerraScope: Earth System Trend Detective (India Edition).

---

## 1. Monorepo Structural Philosophy

TerraScope adopts an intentional separation of concerns:
- **`backend/`**: Encapsulates data retrieval, spatial sampling, non-parametric statistical computation, and natural language explanation generation. Built as an extensible Flask REST application. Detailed plan in [backend/IMPLEMENTATION.md](file:///C:/Users/Admin/.gemini/antigravity/scratch/terrascope/backend/IMPLEMENTATION.md).
- **`frontend/`**: Encapsulates user controls, spatial choropleth mapping, time-series visualization, and accessibility features. Implemented with clean, standards-compliant HTML5/CSS3 and modular vanilla JavaScript. Detailed plan in [frontend/IMPLEMENTATION.md](file:///C:/Users/Admin/.gemini/antigravity/scratch/terrascope/frontend/IMPLEMENTATION.md).
- **`data/`**: Explicit tiered storage (`raw`, `processed`, `cache`, `sample`) ensuring full offline resilience, reproducible testing, and defense against external API rate limits.
- **`docs/`**: Centralized scientific, architectural, design, and API documentation.
- **`notebooks/`**: Verification and benchmarking scripts cross-referencing Giovanni, KNMI, and GLDAS data.
- **`challenge/`**: NASA Challenge deliverables (presentation deck, demo script, and submission notes).

---

## 2. Detailed Subsystem Implementation Plans

For in-depth technical specifications, algorithm formulations, schema contracts, and component lifecycles, refer to:
- [Backend Implementation Plan (`backend/IMPLEMENTATION.md`)](file:///C:/Users/Admin/.gemini/antigravity/scratch/terrascope/backend/IMPLEMENTATION.md)
  - Architectural layers & Flask application factory
  - REST API routes specification (`/api/states`, `/api/search`, `/api/variables`, `/api/analysis`, `/api/map-trends`, `/api/report`)
  - NASA POWER client with retry & exponential backoff
  - State spatial sampler grid algorithm ($0.5^\circ$ resolution)
  - Mann-Kendall test statistic & Sen's slope estimator ($p < 0.05$ decision criteria)
  - 5-tier direction-of-change classifier
  - Plain-language narrative synthesis engine
  - Synthetic test suites & edge cases
- [Frontend Implementation Plan (`frontend/IMPLEMENTATION.md`)](file:///C:/Users/Admin/.gemini/antigravity/scratch/terrascope/frontend/IMPLEMENTATION.md)
  - Zero-build web standards architecture
  - Central reactive state store (`AppState`)
  - Leaflet.js interactive map with choropleth shading & state isolation
  - Debounced search & local Indian states fuzzy autocomplete
  - Chart.js multi-variable time series with Sen's slope dotted line
  - Color-blind accessible dual visual encoding (symbols `▲▲`, `▲`, `=`, `▼`, `▼▼` + palette)
  - Plain-language summary card & 12-point scientific details drawer
  - Offline fallback demo mode using `data/sample/`

---

## 3. Directory Matrix & Implementation Status

```
terrascope/
├── .env.example                     [Created & Configured]
├── .gitignore                       [Created & Configured]
├── LICENSE                          [Created & Configured]
├── requirements.txt                 [Created & Configured]
├── README.md                        [Created & Configured]
├── IMPLEMENTATION_PLAN.md           [Created & Configured]
│
├── docs/
│   ├── project_overview.md          [Created & Configured]
│   ├── methodology.md               [Created & Configured]
│   ├── data_sources.md              [Created & Configured]
│   ├── design_system.md             [Created & Configured]
│   ├── architecture.md              [Created & Configured]
│   ├── api_specification.md         [Created & Configured]
│   └── resources.md                 [Created & Configured]
│
├── backend/
│   ├── README.md                    [Created & Configured]
│   ├── IMPLEMENTATION.md            [Created & Configured]
│   ├── requirements.txt             [Created & Configured]
│   ├── config.py                    [Created & Configured]
│   ├── app.py                       [Created & Configured]
│   ├── routes/
│   │   ├── __init__.py              [Created & Configured]
│   │   ├── location.py              [Created & Configured]
│   │   ├── analysis.py              [Created & Configured]
│   │   ├── map_trends.py            [Created & Configured]
│   │   └── report.py                [Created & Configured]
│   ├── services/
│   │   ├── __init__.py              [Created & Configured]
│   │   ├── geocoding.py             [Created & Configured]
│   │   ├── nasa_power.py            [Created & Configured]
│   │   ├── state_sampler.py         [Created & Configured]
│   │   ├── data_loader.py           [Created & Configured]
│   │   ├── gpm.py                   [Created & Configured]
│   │   ├── gldas.py                 [Created & Configured]
│   │   └── swot.py                  [Created & Configured]
│   ├── analysis/
│   │   ├── __init__.py              [Created & Configured]
│   │   ├── processing.py            [Created & Configured]
│   │   ├── statistics.py            [Created & Configured]
│   │   ├── trends.py                [Created & Configured]
│   │   ├── significance.py          [Created & Configured]
│   │   └── plain_language.py        [Created & Configured]
│   ├── utils/
│   │   ├── __init__.py              [Created & Configured]
│   │   ├── units.py                 [Created & Configured]
│   │   └── validators.py            [Created & Configured]
│   └── tests/
│       ├── __init__.py              [Created & Configured]
│       ├── test_trends.py           [Created & Configured]
│       ├── test_significance.py     [Created & Configured]
│       ├── test_plain_language.py   [Created & Configured]
│       └── test_services.py         [Created & Configured]
│
├── frontend/
│   ├── README.md                    [Created & Configured]
│   ├── IMPLEMENTATION.md            [Created & Configured]
│   ├── index.html                   [Created & Configured]
│   ├── css/
│   │   ├── theme.css                [Created & Configured]
│   │   └── style.css                [Created & Configured]
│   ├── js/
│   │   ├── script.js                [Created & Configured]
│   │   ├── map.js                   [Created & Configured]
│   │   ├── search.js                [Created & Configured]
│   │   ├── controls.js              [Created & Configured]
│   │   ├── charts.js                [Created & Configured]
│   │   ├── legend.js                [Created & Configured]
│   │   └── report.js                [Created & Configured]
│   └── assets/
│       ├── geo/
│       │   └── india_states.geojson [Created & Configured]
│       └── icons/                   [Created & Configured]
│
├── data/
│   ├── README.md                    [Created & Configured]
│   ├── raw/                         [Directory Created]
│   ├── processed/                   [Directory Created]
│   ├── cache/                       [Directory Created]
│   └── sample/
│       ├── kerala_temperature_sample.json [Created & Configured]
│       └── india_map_trends_sample.json   [Created & Configured]
│
├── notebooks/
│   ├── README.md                    [Created & Configured]
│   └── giovanni_validation.ipynb    [Created & Configured]
│
└── challenge/
    ├── README.md                    [Created & Configured]
    ├── submission_notes.md          [Created & Configured]
    ├── presentation/                [Directory Created]
    └── demo_video/                  [Directory Created]
```

---

## 4. Phase-by-Phase Roadmap

### Phase 1: Prototype Foundation (Milestone 1)
- Connect Leaflet frontend to `data/sample/kerala_temperature_sample.json`.
- Render Chart.js time series with Sen's slope line.
- Display summary card with plain-language text and accessible legend.

### Phase 2: Live Ingestion & Backend Pipeline
- Implement NASA POWER REST API client with exponential backoff and caching.
- Build Geocoding service with local fuzzy lookup and Nominatim fallback.
- Test end-to-end live queries for Kerala.

### Phase 3: Analytical Rigour & Validation
- Implement Mann-Kendall and Sen's slope algorithms with confidence intervals.
- Verify calculations against synthetic series and Giovanni validation notebook.

### Phase 4: National Scale
- Generate state sample grids across all 36 Indian states & union territories.
- Pre-compute baseline series in `data/processed/`.
- Render dynamic national choropleth map.

### Phase 5: Accessibility, Polish & Challenge Deliverables
- WCAG AA contrast and keyboard accessibility validation.
- Challenge slide deck in `challenge/presentation/` and demo video recording in `challenge/demo_video/`.
