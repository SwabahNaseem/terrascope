# TerraScope Backend API

The TerraScope backend is a Python Flask service responsible for location resolution, earth observation data ingestion from the NASA POWER API, non-parametric statistical trend analysis, and natural language narrative synthesis.

---

## Directory Architecture

```
backend/
├── app.py               # Flask application factory and entry point
├── config.py            # Environment-aware configuration settings
├── requirements.txt     # Backend Python package requirements
├── routes/              # HTTP request endpoints (Blueprints)
│   ├── location.py      # States list, search suggestions, geocoding
│   ├── analysis.py      # Main analysis orchestration (POST /api/analysis)
│   ├── map_trends.py    # National state-level choropleth classification
│   └── report.py        # Report generation and download
├── services/            # External and internal data providers
│   ├── geocoding.py     # Nominatim and local fuzzy matching service
│   ├── nasa_power.py    # NASA POWER REST API client with retry backoff
│   ├── state_sampler.py # Geographic sampling grid generator for states
│   ├── data_loader.py   # Local fallback & pre-computed JSON data loader
│   ├── gpm.py           # (Future) GPM IMERG satellite precipitation service
│   ├── gldas.py         # (Future) GLDAS hydrological model service
│   └── swot.py          # (Future) SWOT surface water indicators
├── analysis/            # Scientific statistical engine
│   ├── processing.py    # Cleaning, aggregation (monthly/yearly), missing values
│   ├── statistics.py    # Descriptive statistics (mean, std, percentiles)
│   ├── trends.py        # Mann-Kendall test & Sen's slope calculation
│   ├── significance.py  # p-value classification, hypothesis evaluation
│   └── plain_language.py# Natural language summary translation
├── utils/               # Shared helpers
│   ├── units.py         # Unit formatting and display names
│   └── validators.py    # Request parameter input validation
└── tests/               # Pytest test suite
    ├── test_trends.py
    ├── test_significance.py
    ├── test_plain_language.py
    └── test_services.py
```

---

## Running Locally

```bash
# Navigate to project root or backend
cd terrascope

# Install dependencies
pip install -r backend/requirements.txt

# Run the Flask development server
python backend/app.py
```

The server listens on `http://127.0.0.1:5000` by default.

---

## Health Check
- `GET http://127.0.0.1:5000/api/health`
- Response: `{"status": "ok", "service": "terrascope-api", "version": "1.0.0"}`
