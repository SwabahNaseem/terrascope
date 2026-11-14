# TerraScope: Earth System Trend Detective (India Edition)

TerraScope is an interactive environmental trend analysis platform designed to detect, evaluate, and communicate historical climate trends across Indian states and union territories. It combines satellite Earth observation data (NASA POWER, GLDAS, GPM) with rigorous statistical significance testing (Mann-Kendall and Sen's slope) and translates findings into clear, plain-language summaries.

---

## Project Highlights

- **Monorepo Architecture**: Clean separation between Python Flask backend API services and lightweight, accessible frontend web dashboard.
- **Focus Area**: India national overview with state-by-state drill-down and geocoded location lookup.
- **Key Variables**: Air Temperature (`T2M`), Precipitation (`PRECTOTCORR`), Soil Wetness (`GWETTOP`/`GWETROOT`), and Surface Water indicators.
- **Scientific Rigour**: Mann-Kendall trend detection, Sen's slope rate calculation, and 95% confidence interval estimation.
- **Public Accessibility**: Converts complex p-values and slope rates into everyday, understandable language paired with color-blind accessible symbols.

---

## Monorepo Layout

```
terrascope/
├── backend/            # Python Flask REST API & statistical calculation engine
├── frontend/           # Web client (HTML5, CSS theme system, Leaflet, Chart.js)
├── data/               # Raw, processed, cache, and sample fallback datasets
├── docs/               # System architecture, methodology, and design documentation
├── challenge/          # NASA Challenge presentation, video, and submission materials
├── notebooks/          # Jupyter verification and cross-validation workflows
├── requirements.txt    # Top-level Python dependency specification
├── .env.example        # Environment variable blueprint
└── README.md           # Project entry point
```

---

## Foundational Implementation Documentation

Detailed implementation guides for each component are located in the `docs/` and package directories:

1. [Master Implementation Plan](file:///C:/Users/Admin/.gemini/antigravity/scratch/terrascope/IMPLEMENTATION_PLAN.md) - Phased roadmap and subsystem blueprint.
2. [Backend Implementation Plan](file:///C:/Users/Admin/.gemini/antigravity/scratch/terrascope/backend/IMPLEMENTATION.md) - Routing, ingestion, statistical engine, and schema contracts.
3. [Frontend Implementation Plan](file:///C:/Users/Admin/.gemini/antigravity/scratch/terrascope/frontend/IMPLEMENTATION.md) - State store, Leaflet map, Chart.js, and accessible legend.
4. [Project Overview](file:///C:/Users/Admin/.gemini/antigravity/scratch/terrascope/docs/project_overview.md) - Problem statement, user personas, and scope.
5. [Methodology & Statistics](file:///C:/Users/Admin/.gemini/antigravity/scratch/terrascope/docs/methodology.md) - Statistical tests, trend direction criteria, and limitations.
6. [Data Sources](file:///C:/Users/Admin/.gemini/antigravity/scratch/terrascope/docs/data_sources.md) - NASA POWER variables, geocoding policies, and boundary GeoJSON standards.
7. [Design System](file:///C:/Users/Admin/.gemini/antigravity/scratch/terrascope/docs/design_system.md) - Color tokens, accessible symbols, typography, and chart themes.
8. [System Architecture](file:///C:/Users/Admin/.gemini/antigravity/scratch/terrascope/docs/architecture.md) - Data pipelines, state sampling grid, and caching strategies.
9. [API Specification](file:///C:/Users/Admin/.gemini/antigravity/scratch/terrascope/docs/api_specification.md) - REST endpoints, query parameters, and JSON payloads.
10. [External Resources](file:///C:/Users/Admin/.gemini/antigravity/scratch/terrascope/docs/resources.md) - Validation links (Giovanni, KNMI, AppEEARS).

---

## Quickstart (Development Setup)

### 1. Prerequisites
- Python 3.10+
- Modern Web Browser (Chrome, Firefox, Edge, Safari)

### 2. Environment Setup
```bash
# Clone or navigate into repository
cd terrascope

# Create and activate Python virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env
```

### 3. Running Backend API
```bash
python backend/app.py
# API server starts at http://127.0.0.1:5000
```

### 4. Running Frontend
Open `frontend/index.html` in your browser or serve via any static web server:
```bash
# Using Python's built-in static HTTP server:
cd frontend
python -m http.server 3000
# Accessible at http://localhost:3000
```

---

## Phase 1 Milestone
The initial milestone focuses on validating the pipeline end-to-end:
1. Load India national map and select **Kerala**.
2. Query air temperature time series from NASA POWER API (or fallback sample).
3. Compute Mann-Kendall trend, Sen's slope, and p-value.
4. Render interactive chart with trend line.
5. Display plain-language summary and significance classification badge.
