/**
 * TerraScope Map Module
 * Handles Leaflet interactive canvas, GeoJSON boundaries, national choropleth styling,
 * state isolation, hover dual-encoding tooltips, and floating reset controls.
 * Matches Technical Specification Section 3.1 & 4.3
 */

import { loadStateAnalysis } from './controls.js';

let mapInstance = null;
let geojsonLayer = null;
let stateTrendsData = {};
let selectedStateName = null;
let onStateSelectedCallback = null;

const INDIA_CENTER = [22.5937, 78.9629];
const DEFAULT_ZOOM = 5;

// Verified fallback classifications matching data/sample/india_map_trends_sample.json
export const FALLBACK_MAP_TRENDS = {
  "Kerala": { class: "slight_increase", slope_per_decade: 0.31, significant: true, symbol: "▲" },
  "Tamil Nadu": { class: "slight_increase", slope_per_decade: 0.28, significant: true, symbol: "▲" },
  "Karnataka": { class: "slight_increase", slope_per_decade: 0.29, significant: true, symbol: "▲" },
  "Maharashtra": { class: "strong_increase", slope_per_decade: 0.42, significant: true, symbol: "▲▲" },
  "Gujarat": { class: "strong_increase", slope_per_decade: 0.46, significant: true, symbol: "▲▲" },
  "Rajasthan": { class: "strong_increase", slope_per_decade: 0.51, significant: true, symbol: "▲▲" },
  "Punjab": { class: "strong_increase", slope_per_decade: 0.48, significant: true, symbol: "▲▲" },
  "Himachal Pradesh": { class: "strong_increase", slope_per_decade: 0.53, significant: true, symbol: "▲▲" },
  "Goa": { class: "no_clear_change", slope_per_decade: 0.08, significant: false, symbol: "=" },
  "Andhra Pradesh": { class: "slight_increase", slope_per_decade: 0.27, significant: true, symbol: "▲" },
  "Telangana": { class: "slight_increase", slope_per_decade: 0.33, significant: true, symbol: "▲" },
  "Madhya Pradesh": { class: "strong_increase", slope_per_decade: 0.44, significant: true, symbol: "▲▲" },
  "Uttar Pradesh": { class: "strong_increase", slope_per_decade: 0.41, significant: true, symbol: "▲▲" },
  "Bihar": { class: "slight_increase", slope_per_decade: 0.25, significant: true, symbol: "▲" },
  "West Bengal": { class: "slight_increase", slope_per_decade: 0.24, significant: true, symbol: "▲" },
  "Odisha": { class: "slight_increase", slope_per_decade: 0.22, significant: true, symbol: "▲" },
  "Haryana": { class: "strong_increase", slope_per_decade: 0.47, significant: true, symbol: "▲▲" },
  "Delhi": { class: "strong_increase", slope_per_decade: 0.49, significant: true, symbol: "▲▲" },
  "Uttarakhand": { class: "strong_increase", slope_per_decade: 0.52, significant: true, symbol: "▲▲" },
  "Jammu and Kashmir": { class: "strong_increase", slope_per_decade: 0.55, significant: true, symbol: "▲▲" },
  "Ladakh": { class: "strong_increase", slope_per_decade: 0.58, significant: true, symbol: "▲▲" },
  "Chhattisgarh": { class: "slight_increase", slope_per_decade: 0.26, significant: true, symbol: "▲" },
  "Jharkhand": { class: "slight_increase", slope_per_decade: 0.29, significant: true, symbol: "▲" },
  "Assam": { class: "slight_increase", slope_per_decade: 0.21, significant: true, symbol: "▲" },
  "Arunachal Pradesh": { class: "slight_increase", slope_per_decade: 0.23, significant: true, symbol: "▲" },
  "Sikkim": { class: "slight_increase", slope_per_decade: 0.28, significant: true, symbol: "▲" },
  "Meghalaya": { class: "no_clear_change", slope_per_decade: 0.05, significant: false, symbol: "=" },
  "Manipur": { class: "slight_increase", slope_per_decade: 0.18, significant: true, symbol: "▲" },
  "Mizoram": { class: "slight_increase", slope_per_decade: 0.17, significant: true, symbol: "▲" },
  "Nagaland": { class: "slight_increase", slope_per_decade: 0.20, significant: true, symbol: "▲" },
  "Tripura": { class: "slight_increase", slope_per_decade: 0.22, significant: true, symbol: "▲" },
  "Chandigarh": { class: "strong_increase", slope_per_decade: 0.48, significant: true, symbol: "▲▲" },
  "Puducherry": { class: "slight_increase", slope_per_decade: 0.27, significant: true, symbol: "▲" },
  "Andaman and Nicobar Islands": { class: "slight_increase", slope_per_decade: 0.19, significant: true, symbol: "▲" },
  "Lakshadweep": { class: "slight_increase", slope_per_decade: 0.22, significant: true, symbol: "▲" },
  "Dadra and Nagar Haveli and Daman and Diu": { class: "strong_increase", slope_per_decade: 0.44, significant: true, symbol: "▲▲" }
};

// Direction of Change Color Palette mapping (Section 7.3)
export const CHOROPLETH_COLORS = {
  strong_increase: "#A8461F",  // Deep Terracotta
  slight_increase: "#E3A27F",  // Light Terracotta
  no_clear_change: "#D9D2BF",  // Warm Neutral Gray
  slight_decrease: "#B7C7A3",  // Light Sage
  strong_decrease: "#2F5D3A",  // Forest Green
  no_data:         "#FAF6EC"   // Hatched Ivory
};

/**
 * Initialize Leaflet Map
 * @param {string} containerId - Element ID for map container
 * @param {Function} onStateClick - Callback when state polygon is clicked
 * @returns {L.Map}
 */
export function initMap(containerId, onStateClick) {
  if (typeof L === 'undefined') {
    console.warn('[TerraScope Map] Leaflet library not loaded.');
    return null;
  }

  onStateSelectedCallback = onStateClick;

  mapInstance = L.map(containerId, {
    center: INDIA_CENTER,
    zoom: DEFAULT_ZOOM,
    minZoom: 4,
    maxZoom: 9,
    zoomControl: true,
    scrollWheelZoom: true
  });

  // CartoDB Positron high-contrast neutral basemap
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(mapInstance);

  // Setup Back to India button
  setupBackToIndiaButton();

  // Setup Interactive Legend Hovers
  setupLegendInteractivity();

  // Load Choropleth Data & Geometry
  loadMapTrendsAndGeoJSON();

  return mapInstance;
}

/**
 * Connects the floating "< Back to India" button
 */
function setupBackToIndiaButton() {
  const btn = document.getElementById('btn-back-to-india');
  if (!btn) return;

  btn.addEventListener('click', () => {
    resetToNationalView();
  });
}

/**
 * Loads state-wise trends classification followed by India states GeoJSON
 */
async function loadMapTrendsAndGeoJSON() {
  stateTrendsData = { ...FALLBACK_MAP_TRENDS };

  // Try fetching dynamic trends classification from REST API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    const res = await fetch('/api/map-trends?variable=temperature', { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.states && Object.keys(data.states).length > 0) {
        stateTrendsData = { ...stateTrendsData, ...data.states };
      }
    }
  } catch {
    // API offline; continue with verified fallback
  }

  // Load GeoJSON Boundaries
  try {
    const geoRes = await fetch('assets/geo/india_states.geojson');
    if (geoRes.ok) {
      const geojson = await geoRes.json();
      renderGeoJSONLayer(geojson);
    }
  } catch (err) {
    console.warn('[TerraScope Map] Error loading india_states.geojson:', err);
  }
}

/**
 * Renders GeoJSON state polygons with choropleth styling and interactivity
 */
function renderGeoJSONLayer(geojson) {
  if (geojsonLayer && mapInstance) {
    mapInstance.removeLayer(geojsonLayer);
  }

  geojsonLayer = L.geoJSON(geojson, {
    style: (feature) => getChoroplethStyle(feature),
    onEachFeature: (feature, layer) => {
      const stateName = feature.properties.name || feature.properties.NAME_1;
      const trendInfo = stateTrendsData[stateName] || { class: 'no_data', symbol: 'n/a', slope_per_decade: 0 };

      // Accessible tooltip with dual encoding
      const symbol = trendInfo.symbol || '=';
      const slopeText = trendInfo.slope_per_decade ? `${trendInfo.slope_per_decade > 0 ? '+' : ''}${trendInfo.slope_per_decade} °C/decade` : 'Baseline';
      const friendlyClass = formatClassLabel(trendInfo.class);

      layer.bindTooltip(`
        <div style="font-family: var(--font-family-base); padding: 2px;">
          <strong>${stateName}</strong><br>
          <span style="font-weight: 700; color: ${CHOROPLETH_COLORS[trendInfo.class] || '#333'}">${symbol} ${friendlyClass}</span>
          <span style="color: #666; font-size: 0.85em;">(${slopeText})</span>
        </div>
      `, { sticky: true, opacity: 0.95 });

      layer.on({
        mouseover: (e) => handleStateMouseOver(e, stateName),
        mouseout: (e) => handleStateMouseOut(e),
        click: (e) => handleStateClick(e, layer, stateName)
      });
    }
  }).addTo(mapInstance);
}

/**
 * Computes choropleth polygon style based on classification
 */
function getChoroplethStyle(feature) {
  const stateName = feature.properties.name || feature.properties.NAME_1;
  const trend = stateTrendsData[stateName];
  const trendClass = trend ? trend.class : 'no_data';
  const fillColor = CHOROPLETH_COLORS[trendClass] || CHOROPLETH_COLORS.no_data;

  return {
    fillColor: fillColor,
    weight: 1.5,
    opacity: 1,
    color: '#FAF6EC',
    fillOpacity: 0.85
  };
}

/**
 * State hover highlight
 */
function handleStateMouseOver(e, stateName) {
  if (selectedStateName) return; // Do not alter hover when state is isolated

  const layer = e.target;
  layer.setStyle({
    weight: 2.8,
    color: '#2F5D3A',
    fillOpacity: 0.95
  });

  if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
    layer.bringToFront();
  }
}

/**
 * State hover reset
 */
function handleStateMouseOut(e) {
  if (selectedStateName) return;
  if (geojsonLayer) {
    geojsonLayer.resetStyle(e.target);
  }
}

/**
 * Handles click on a state polygon: zooms and isolates state
 */
function handleStateClick(e, layer, stateName) {
  if (e && e.originalEvent) {
    L.DomEvent.stopPropagation(e);
  }
  isolateAndZoomState(layer, stateName);
}

/**
 * Isolates a state polygon, dims all others, and zooms
 */
function isolateAndZoomState(layer, stateName) {
  if (!mapInstance || !geojsonLayer || !layer) return;

  selectedStateName = stateName;

  // 1. Zoom to state polygon bounds (Section 4.3)
  mapInstance.fitBounds(layer.getBounds(), {
    padding: [30, 30],
    maxZoom: 8,
    animate: true,
    duration: 0.75
  });

  // 2. Dim non-selected states (fillOpacity: 0.05, weight: 0.5)
  geojsonLayer.eachLayer((l) => {
    const lName = l.feature.properties.name || l.feature.properties.NAME_1;
    if (lName === stateName) {
      l.setStyle({
        weight: 3.2,
        color: '#2F5D3A',
        fillOpacity: 0.9
      });
      if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        l.bringToFront();
      }
    } else {
      l.setStyle({
        fillOpacity: 0.06,
        weight: 0.5,
        color: '#9CAF88'
      });
    }
  });

  // 3. Show floating "< Back to India" button
  const backBtn = document.getElementById('btn-back-to-india');
  if (backBtn) {
    backBtn.classList.remove('hidden');
  }

  // 4. Trigger state selection callback & load analysis
  if (onStateSelectedCallback) {
    onStateSelectedCallback(stateName);
  }
  loadStateAnalysis(stateName);
}

/**
 * Focus and zoom map to a specific state (invoked from search or direct selection)
 * @param {string} stateName
 */
export function zoomToState(stateName) {
  if (!geojsonLayer || !mapInstance) {
    console.warn('[TerraScope Map] GeoJSON layer not ready for zoom.');
    return;
  }

  let targetLayer = null;
  geojsonLayer.eachLayer((layer) => {
    const name = layer.feature.properties.name || layer.feature.properties.NAME_1;
    if (name.toLowerCase() === stateName.toLowerCase()) {
      targetLayer = layer;
    }
  });

  if (targetLayer) {
    isolateAndZoomState(targetLayer, stateName);
  } else {
    console.log(`[TerraScope Map] State "${stateName}" not found in current GeoJSON.`);
  }
}

/**
 * Reset map to full national view of India
 */
export function resetToNationalView() {
  if (!mapInstance || !geojsonLayer) return;

  selectedStateName = null;

  // Reset zoom to India centroid
  mapInstance.setView(INDIA_CENTER, DEFAULT_ZOOM, {
    animate: true,
    duration: 0.75
  });

  // Restore full choropleth styles on all polygons
  geojsonLayer.eachLayer((layer) => {
    geojsonLayer.resetStyle(layer);
  });

  // Hide "< Back to India" button
  const backBtn = document.getElementById('btn-back-to-india');
  if (backBtn) {
    backBtn.classList.add('hidden');
  }
}

/**
 * Interactive Legend Highlighting (Section 3.5)
 * Hovering on a legend item dims all polygons not matching that classification
 */
function setupLegendInteractivity() {
  const legendItems = document.querySelectorAll('.map-legend-overlay .legend-item');
  legendItems.forEach(item => {
    const targetClass = item.getAttribute('data-class');

    item.addEventListener('mouseenter', () => {
      if (selectedStateName || !geojsonLayer) return;

      geojsonLayer.eachLayer((layer) => {
        const sName = layer.feature.properties.name || layer.feature.properties.NAME_1;
        const trend = stateTrendsData[sName];
        const itemClass = trend ? trend.class : 'no_data';

        if (itemClass === targetClass) {
          layer.setStyle({
            weight: 3,
            color: '#2F5D3A',
            fillOpacity: 0.95
          });
        } else {
          layer.setStyle({
            fillOpacity: 0.08,
            weight: 0.5,
            color: '#D9D2BF'
          });
        }
      });
    });

    item.addEventListener('mouseleave', () => {
      if (selectedStateName || !geojsonLayer) return;
      geojsonLayer.eachLayer((layer) => {
        geojsonLayer.resetStyle(layer);
      });
    });
  });
}

function formatClassLabel(className) {
  if (!className) return 'No clear change';
  return className.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
