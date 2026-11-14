# TerraScope Frontend Architecture

The TerraScope frontend is a zero-build, dependency-light web client engineered for instant loading, intuitive exploration, and accessibility. It interfaces with the Flask REST API, visualizes geospatial trends on an interactive Leaflet map, and plots multi-variable time series with Chart.js.

---

## Directory Blueprint

```
frontend/
├── index.html           # Main semantic HTML dashboard entry point
├── css/
│   ├── theme.css        # CSS Custom Properties (design tokens & palette)
│   └── style.css        # Component layouts, cards, typography & responsive styles
├── js/
│   ├── script.js        # Main coordinator & application initialization
│   ├── map.js           # Leaflet map manager (GeoJSON styling, choropleth, zoom)
│   ├── search.js        # Location search input, autocomplete & debounce handler
│   ├── controls.js      # Variable checkboxes, date range pickers, view mode toggle
│   ├── charts.js        # Chart.js time series renderer with trend lines & CI bands
│   ├── legend.js        # Accessible 5-tier direction of change legend component
│   └── report.js        # Plain-language narrative & expandable technical details
└── assets/
    ├── geo/
    │   └── india_states.geojson # Official state & union territory boundary geometry
    └── icons/           # Custom SVG symbols & indicators
```

---

## Key Design Principles
1. **Zero-Build Web Standards**: Standard HTML5, CSS3, and ES6 JavaScript modules that run in any modern browser without requiring node or bundling tooling.
2. **Dual Visual Encoding**: Uses distinct colors (`#A8461F`, `#E3A27F`, `#D9D2BF`, `#B7C7A3`, `#2F5D3A`) paired with clear text symbols (`▲▲`, `▲`, `=`, `▼`, `▼▼`) for color-blind accessibility.
3. **Decoupled API Contract**: Operates seamlessly against the local Flask API or in offline demo mode using sample datasets.

---

## Running Frontend
Simply open `frontend/index.html` in a web browser, or use any local HTTP server:
```bash
python -m http.server 3000
```
Then navigate to `http://localhost:3000` in your web browser.
