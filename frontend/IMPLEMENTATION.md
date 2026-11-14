# TerraScope Frontend: Detailed Implementation Plan & Technical Specification

> **Target Platform**: Modern Web Standards (HTML5 / CSS3 / ES6 Modules / Leaflet 1.9+ / Chart.js 4.4+)  
> **Design Philosophy**: Zero-build dependency-free architecture, accessible dual-encoding, high data density, and organic geological design palette.

---

## 1. Architectural Blueprint & Component Responsibilities

The frontend is constructed as a decoupled, zero-build Single Page Application (SPA). It communicates with the Flask REST backend via clean asynchronous JSON contracts and incorporates a transparent offline fallback to `data/sample/` when backend services are offline.

```
+---------------------------------------------------------------------------------------+
|                                    index.html                                         |
|  Semantic HTML5 Layout, Accessible ARIA Regions, Responsive Viewport Grid             |
+---------------------------------------------------------------------------------------+
        |                     |                       |                     |
        v                     v                       v                     v
+---------------+     +---------------+       +---------------+     +---------------+
| Navbar        |     | Controls Card |       | Map Stage     |     | State Stage   |
| Search Bar    |     | Variables     |       | Leaflet Canvas|     | Summary Card  |
| (search.js)   |     | Dates, Agg    |       | (map.js)      |     | Chart.js      |
+---------------+     | (controls.js) |       | (legend.js)   |     | (charts.js)   |
                      +---------------+       +---------------+     | (report.js)   |
                              |                       |             +---------------+
                              +-----------+-----------+                     |
                                          |                                 |
                                          v                                 |
                        +-----------------------------------+               |
                        |      script.js (App Manager)      |<--------------+
                        |  State Store, Event Dispatcher,   |
                        |  API Client & Offline Mock Router |
                        +-----------------------------------+
                                          |
                                          v
                        +-----------------------------------+
                        |   REST API (http://localhost:5000)|
                        |   Fallback -> data/sample/*.json  |
                        +-----------------------------------+
```

---

## 2. Central State Store Architecture (`frontend/js/script.js`)

The application maintains a centralized, single-source-of-truth state object:

```javascript
const AppState = {
  // Navigation & Spatial Focus
  selectedLocation: {
    type: 'state',           // 'state' or 'point'
    name: 'Kerala',
    code: 'IN-KL',
    coordinates: [10.8505, 76.2711],
    bounds: [[8.18, 74.85], [12.80, 77.41]]
  },
  isStateZoomed: false,

  // Selected Parameters
  selectedVariables: ['temperature'], // ['temperature', 'precipitation', 'soil_moisture']
  timeWindow: {
    startYear: 2000,
    endYear: 'latest'
  },
  aggregation: 'yearly',     // 'yearly' | 'seasonal' | 'monthly'
  compareMode: false,        // Normalizes curves onto single 0-1 scale

  // Active Cache & Data Payloads
  currentAnalysis: null,     // Holds active response from POST /api/analysis
  mapTrends: null,           // Holds state-level classifications from GET /api/map-trends
  allStatesGeoJSON: null,    // Cached vector geometry

  // UI Status
  isLoading: false,
  apiConnected: true,
  errorMessage: null
};
```

---

## 3. Detailed Component Implementation Specifications

### 3.1 Leaflet Map & Spatial Isolator (`frontend/js/map.js`)

- **Tile Provider**: CartoDB Positron (clean, neutral, high-contrast basemap).
- **Core Capabilities**:
  1. **National Choropleth Coloring**:
     - Colors every Indian state polygon according to its classification returned by `/api/map-trends`:
       - `strong_increase` $\rightarrow$ `#A8461F` (Deep Terracotta)
       - `slight_increase` $\rightarrow$ `#E3A27F` (Light Terracotta)
       - `no_clear_change` $\rightarrow$ `#D9D2BF` (Beige Grey)
       - `slight_decrease` $\rightarrow$ `#B7C7A3` (Light Sage)
       - `strong_decrease` $\rightarrow$ `#2F5D3A` (Forest Green)
       - `no_data` $\rightarrow$ `#FAF6EC`
  2. **State Selection & Isolation (Section 4.3)**:
     - When a state is clicked or selected from search:
       - Zoom to state polygon: `map.fitBounds(layer.getBounds(), { padding: [30, 30], maxZoom: 8 })`.
       - Dim/mask other states: Set non-selected state polygons to `fillOpacity: 0.05` and `weight: 0.5`.
       - Render a floating `< Back to India` button over the top-left map corner.
  3. **Reset to National View**:
     - Reset zoom to default center `[22.5937, 78.9629]`, zoom level `5`.
     - Restore all state polygon styles to the full choropleth classification.

---

### 3.2 Location Search & Autocomplete (`frontend/js/search.js`)

- **Input Handling**:
  - Debounce timer ($250\,\text{ms}$) on keyup/input to prevent wasteful processing.
- **Search Logic**:
  1. If input length $< 2$, close dropdown.
  2. Search static list of 36 Indian states and union territories.
  3. If results $< 3$, query backend `GET /api/search?q={query}`.
  4. Highlight matching substring in dropdown items.
- **Keyboard Navigation**:
  - `ArrowDown` / `ArrowUp` to navigate dropdown items.
  - `Enter` to select highlighted item.
  - `Escape` or click outside to dismiss dropdown.

---

### 3.3 Controls & Parameter Management (`frontend/js/controls.js`)

- **Variable Selection**:
  - Checkbox group for `temperature`, `precipitation`, `soil_moisture`, and `water_surface`.
  - Guardrail: At least one variable must remain checked. If user unchecks all, automatically prevent unchecking or re-check default (`temperature`).
- **Date Range Selectors**:
  - Start Year: Number input constrained between `1981` and `currentYear - 1` (default `2000`).
  - End Year: Displays `"Latest Available"` with dynamic badge indicating latest ingested data month (e.g. `Sep 2025`).
- **Aggregation Frequency**:
  - Dropdown: `Yearly`, `Seasonal` (Monsoon, Post-monsoon, Winter, Pre-monsoon), `Monthly`.
- **Action Triggers**:
  - `"Show Trend"` button with loading state spinner.

---

### 3.4 Scientific Charting Engine (`frontend/js/charts.js`)

- **Rendering Library**: Chart.js 4.4+.
- **Multi-Variable Charting Strategy (Section 4.4)**:
  - Because variables use incompatible units (°C vs mm vs fraction 0–1), render **one dedicated chart per selected variable** in stacked cards.
  - Support an optional `"Compare Shapes"` toggle that normalizes all variables to a dimensionless $[0, 1]$ min-max scale:
    $$x_{\text{norm}} = \frac{x - x_{\min}}{x_{\max} - x_{\min}}$$
- **Dataset Layers on Each Chart**:
  1. **Observed Points & Curve**:
     - Line with circular data points (`pointRadius: 4`, `borderColor: '#2F5D3A'`, `backgroundColor: 'rgba(47, 93, 58, 0.08)'`).
  2. **Sen's Slope Secular Trend Line**:
     - Non-parametric linear trend (`borderDash: [6, 4]`, `borderColor: '#C8643B'`, `borderWidth: 2.5`).
  3. **Confidence Interval Envelope (Where appropriate)**:
     - Shaded band between lower and upper 95% confidence bounds.
  4. **Anomaly Highlighting**:
     - Mark top 5% anomalous years (e.g. record drought or cloudburst year) with accent border rings.
- **Retina & Resize Handling**:
  - Set `maintainAspectRatio: false` with height managed by CSS container (`340px`).

---

### 3.5 Accessible Map Legend (`frontend/js/legend.js`)

- **Dual-Encoding Visual System (Section 7.3 & 7.4)**:
  - Color is never the sole visual indicator. Every swatch contains its corresponding text symbol:
    - Deep Terracotta (`#A8461F`) $\rightarrow$ `▲▲` (Strong increase)
    - Light Terracotta (`#E3A27F`) $\rightarrow$ `▲` (Slight increase)
    - Beige Grey (`#D9D2BF`) $\rightarrow$ `=` (No clear change)
    - Light Sage (`#B7C7A3`) $\rightarrow$ `▼` (Slight decrease)
    - Forest Green (`#2F5D3A`) $\rightarrow$ `▼▼` (Strong decrease)
- **Interactive Legend Highlighting**:
  - Hovering over a legend item (e.g. "Strong increase") dims all other map polygons and highlights matching states.

---

### 3.6 Plain-Language Summary & Statistical Report Drawer (`frontend/js/report.js`)

- **Summary Card**:
  - High-visibility banner above charts.
  - Headline: Location, variable, decade slope rate, and confidence badge.
  - Plain-language narrative generated from the standardized templates.
- **12-Point Scientific Details Drawer (Section 10.3)**:
  - Expandable `<details>` accordion revealing:
    1. Location & Geographic Centroid
    2. Selected Variable & Unit
    3. Dataset Source & Native Resolution (`NASA POWER 0.5° Grid`)
    4. Observation Time Window & Sample Count ($N$)
    5. Descriptive Metrics (Mean, Std Dev, Min, Max)
    6. Mann-Kendall Test Statistic ($S$, $Z$, and exact $p$-value)
    7. Sen's Slope Rate per Decade
    8. 95% Confidence Interval for Slope
    9. Autocorrelation & Seasonality Handling Applied
    10. Direction & Magnitude Classification Class
    11. Spatial Limitations & Assimilation Uncertainty
    12. Research Hypotheses & Non-Causality Disclaimer
- **Export Capabilities**:
  - `"Download Report"` button generates downloadable Markdown file or printable layout.

---

## 4. Design System & CSS Token Implementation

All styles strictly derive from `frontend/css/theme.css`:

```css
:root {
  /* Surface Tokens */
  --bg-base: #FAF6EC;
  --bg-card: #EFE6D2;
  --primary: #2F5D3A;
  --secondary: #9CAF88;
  --accent: #C8643B;
  --text-main: #3B3F1F;
  --text-muted: #6B7052;
  --border-color: #D6CCA9;

  /* Choropleth Legend Tokens */
  --trend-strong-inc: #A8461F;
  --trend-slight-inc: #E3A27F;
  --trend-neutral:    #D9D2BF;
  --trend-slight-dec: #B7C7A3;
  --trend-strong-dec: #2F5D3A;
}
```

- **WCAG AA Compliance**: Dark Olive (`#3B3F1F`) on Warm Ivory (`#FAF6EC`) provides a contrast ratio $> 10:1$, exceeding standard accessibility requirements.
- **Tabular Monospace Numbers**: Data tables and metrics use monospace font to guarantee clean vertical number alignment.

---

## 5. Offline Fallback & Demo Mode Architecture

To guarantee that the application can be demonstrated seamlessly during evaluation without live internet access or active NASA endpoints:
1. `script.js` tests backend connectivity on load via `GET /api/health`.
2. If backend is unavailable or returns an error:
   - Sets `state.apiConnected = false`.
   - Displays a non-intrusive notification: `"Running in Offline Demonstration Mode"`.
   - Routes requests directly to `data/sample/kerala_temperature_sample.json` and `data/sample/india_map_trends_sample.json`.
   - Allows full interactive exploration of Kerala and national choropleth trends.

---

## 6. Implementation Phasing & Milestones

- **Milestone 1 (Working Prototype)**:
  - India map with Kerala selectable.
  - Interactive Chart.js graph rendering Kerala temperature trendline from sample data.
  - Summary card with plain-language text and accessible legend.
- **Milestone 2 (Backend Integration)**:
  - Real-time queries to Flask `/api/analysis` and dynamic state boundary zoom.
- **Milestone 3 (Multi-Variable & Comparison Mode)**:
  - Stacking precipitation and soil moisture charts; normalized overlay toggle.
- **Milestone 4 (National Choropleth)**:
  - Real-time variable switching on national map with interactive legend hover.
- **Milestone 5 (Export & Accessibility Polish)**:
  - Report download, keyboard navigation, and screen reader announcements.
