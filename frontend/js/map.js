/**
 * TerraScope Map Module
 * Handles Leaflet map rendering, GeoJSON boundary styling, choropleth color classification,
 * state isolation, dual-encoding hover tooltips, zoom-to-state animations, and floating navigation controls.
 * Matches Technical Specification Section 3.1, 3.5 & 4.3
 */

import { loadStateAnalysis } from './controls.js';

let mapInstance = null;
let geojsonLayer = null;
let stateLayersMap = new Map(); // Name/code (lowercase) -> Leaflet Layer
let currentSelectedState = null;
let activeChoroplethData = {};
let backButtonControl = null;
let onStateClickCallback = null;
let onResetCallback = null;

const INDIA_CENTER = [22.5937, 78.9629];
const DEFAULT_ZOOM = 5;

// Color mapping matching Design Tokens and Project Specification Section 7.3
export const TREND_COLORS = {
  strong_increase: '#A8461F', // Deep Terracotta
  slight_increase: '#E3A27F', // Light Terracotta
  no_clear_change: '#D9D2BF', // Warm Neutral Grey
  slight_decrease: '#B7C7A3', // Light Sage
  strong_decrease: '#2F5D3A', // Forest Green
  no_data:         '#FAF6EC'  // Hatched Ivory
};

export const CHOROPLETH_COLORS = TREND_COLORS;

export const TREND_SYMBOLS = {
  strong_increase: '▲▲',
  slight_increase: '▲',
  no_clear_change: '=',
  slight_decrease: '▼',
  strong_decrease: '▼▼',
  no_data:         '—'
};

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

// Known centroid fallbacks for all 36 Indian States and Union Territories
const STATE_CENTROIDS = {
  'Andhra Pradesh': [15.9129, 79.7400],
  'Arunachal Pradesh': [28.2180, 94.7278],
  'Assam': [26.2006, 92.9376],
  'Bihar': [25.0961, 85.3131],
  'Chhattisgarh': [21.2787, 81.8661],
  'Goa': [15.2993, 74.1240],
  'Gujarat': [22.2587, 71.1924],
  'Haryana': [29.0588, 76.0856],
  'Himachal Pradesh': [31.1048, 77.1734],
  'Jharkhand': [23.6102, 85.2799],
  'Karnataka': [15.3173, 75.7139],
  'Kerala': [10.8505, 76.2711],
  'Madhya Pradesh': [22.9734, 78.6569],
  'Maharashtra': [19.7515, 75.7139],
  'Manipur': [24.6637, 93.9063],
  'Meghalaya': [25.4670, 91.3662],
  'Mizoram': [23.1645, 92.9376],
  'Nagaland': [26.1584, 94.5624],
  'Odisha': [20.9517, 85.0985],
  'Punjab': [31.1471, 75.3412],
  'Rajasthan': [27.0238, 74.2179],
  'Sikkim': [27.5330, 88.5122],
  'Tamil Nadu': [11.1271, 78.6569],
  'Telangana': [18.1124, 79.0193],
  'Tripura': [23.9408, 91.9882],
  'Uttar Pradesh': [26.8467, 80.9462],
  'Uttarakhand': [30.0668, 79.0193],
  'West Bengal': [22.9868, 87.8550],
  'Andaman and Nicobar Islands': [11.7401, 92.6586],
  'Chandigarh': [30.7333, 76.7794],
  'Dadra and Nagar Haveli and Daman and Diu': [20.4283, 72.8397],
  'Delhi': [28.7041, 77.1025],
  'Jammu and Kashmir': [33.7782, 76.5762],
  'Ladakh': [34.1526, 77.5771],
  'Lakshadweep': [10.5667, 72.6417],
  'Puducherry': [11.9416, 79.8083]
};

/**
 * Initialize Leaflet Map
 * @param {string} containerId - Element ID for map container
 * @param {Function} onStateClick - Callback when state polygon is clicked
 * @param {Function} [onReset] - Callback when view is reset to national overview
 * @returns {L.Map}
 */
export function initMap(containerId = 'map-view', onStateClick, onReset) {
  if (typeof L === 'undefined') {
    console.warn('[TerraScope] Leaflet library not loaded.');
    return null;
  }

  onStateClickCallback = onStateClick;
  onResetCallback = onReset;

  mapInstance = L.map(containerId, {
    center: INDIA_CENTER,
    zoom: DEFAULT_ZOOM,
    minZoom: 4,
    maxZoom: 9,
    zoomControl: false,
    scrollWheelZoom: true
  });

  // Custom Zoom Control at top-right
  L.control.zoom({ position: 'topright' }).addTo(mapInstance);

  // CartoDB Positron high-contrast neutral basemap
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(mapInstance);

  // Connect floating "< Back to India" button in HTML DOM
  setupBackToIndiaButton();

  // Floating "< Back to India" Leaflet Control fallback
  createBackToIndiaControl();

  // Setup interactive legend hover highlighting
  setupLegendInteractivity();

  // Load choropleth trends & India states GeoJSON
  activeChoroplethData = { ...FALLBACK_MAP_TRENDS };
  loadIndiaGeoJSON();

  return mapInstance;
}

/**
 * Connects the floating "< Back to India" button in HTML
 */
function setupBackToIndiaButton() {
  const btn = document.getElementById('btn-back-to-india');
  if (!btn) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetToNationalView();
  });
}

/**
 * Creates floating "< Back to India" Leaflet Control at top-left
 */
function createBackToIndiaControl() {
  const BackControl = L.Control.extend({
    options: { position: 'topleft' },
    onAdd: function () {
      const container = L.DomUtil.create('div', 'map-back-container');
      container.style.display = 'none';

      const btn = L.DomUtil.create('button', 'btn-back-india', container);
      btn.type = 'button';
      btn.innerHTML = `&larr; Back to India`;
      btn.setAttribute('aria-label', 'Reset to National Map of India');
      btn.style.backgroundColor = '#FAF6EC';
      btn.style.color = '#2F5D3A';
      btn.style.border = '2px solid #2F5D3A';
      btn.style.borderRadius = '6px';
      btn.style.padding = '7px 14px';
      btn.style.fontWeight = '700';
      btn.style.fontSize = '0.85rem';
      btn.style.cursor = 'pointer';
      btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.18)';
      btn.style.transition = 'background-color 0.2s, transform 0.1s';

      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.on(btn, 'mouseenter', () => {
        btn.style.backgroundColor = '#EFE6D2';
      });
      L.DomEvent.on(btn, 'mouseleave', () => {
        btn.style.backgroundColor = '#FAF6EC';
      });
      L.DomEvent.on(btn, 'click', (e) => {
        L.DomEvent.stopPropagation(e);
        resetToNationalView();
      });

      return container;
    }
  });

  backButtonControl = new BackControl();
  backButtonControl.addTo(mapInstance);
}

/**
 * Loads India state boundaries from assets and binds interaction events
 */
function loadIndiaGeoJSON() {
  fetch('assets/geo/india_states.geojson')
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      stateLayersMap.clear();

      geojsonLayer = L.geoJSON(data, {
        style: getStateFeatureStyle,
        onEachFeature: (feature, layer) => {
          const stateName = feature.properties.name || feature.properties.NAME_1 || feature.properties.id;
          const stateCode = feature.properties.id || feature.properties.state_code;

          if (stateName) stateLayersMap.set(stateName.toLowerCase(), layer);
          if (stateCode) stateLayersMap.set(stateCode.toLowerCase(), layer);

          // Dual-encoding tooltip (Symbol + Direction + State)
          layer.bindTooltip(createTooltipContent(stateName), {
            sticky: true,
            className: 'state-map-tooltip',
            direction: 'auto'
          });

          layer.on({
            mouseover: (e) => highlightFeature(e, stateName),
            mouseout: (e) => resetFeatureHighlight(e, stateName),
            click: (e) => {
              L.DomEvent.stopPropagation(e);
              handleStateClick(stateName, layer);
            }
          });
        }
      }).addTo(mapInstance);
    })
    .catch(err => {
      console.warn('[TerraScope Map] Error loading india_states.geojson:', err);
    });
}

/**
 * Returns Leaflet styling for a state polygon feature
 */
function getStateFeatureStyle(feature) {
  const stateName = feature?.properties?.name || feature?.properties?.NAME_1 || feature?.properties?.id;
  const classification = getTrendClassification(stateName);
  const baseColor = TREND_COLORS[classification] || TREND_COLORS.no_clear_change;

  // If a state is selected and isolated, dim others
  if (currentSelectedState) {
    const isSelected = stateName && currentSelectedState.toLowerCase() === stateName.toLowerCase();
    return {
      fillColor: isSelected ? baseColor : '#FAF6EC',
      fillOpacity: isSelected ? 0.9 : 0.06,
      weight: isSelected ? 3.2 : 0.5,
      color: isSelected ? '#1B2A4A' : '#9CAF88',
      opacity: isSelected ? 1 : 0.4
    };
  }

  return {
    fillColor: baseColor,
    fillOpacity: 0.85,
    weight: 1.5,
    color: '#FAF6EC',
    opacity: 1
  };
}

/**
 * Resolves trend classification key for a state
 */
function getTrendClassification(stateName) {
  if (!stateName) return 'no_data';
  const entry = activeChoroplethData[stateName] || activeChoroplethData[findClosestStateName(stateName)];
  if (!entry) return 'no_data';
  return entry.class || entry.direction_class || 'no_clear_change';
}

/**
 * Builds dual-encoding tooltip content
 */
function createTooltipContent(stateName) {
  const classification = getTrendClassification(stateName);
  const symbol = TREND_SYMBOLS[classification] || '—';
  const entry = activeChoroplethData[stateName] || activeChoroplethData[findClosestStateName(stateName)];
  const slope = entry && entry.slope_per_decade != null ? ` (${entry.slope_per_decade > 0 ? '+' : ''}${entry.slope_per_decade}/dec)` : '';

  return `
    <div style="font-family: inherit; font-size: 0.85rem; padding: 2px 4px;">
      <strong style="color: #1B2A4A;">${stateName}</strong><br/>
      <span style="color: #2F5D3A; font-weight: 600;">${symbol} ${formatClassLabel(classification)}</span>${slope}
    </div>
  `;
}

/**
 * State hover highlight
 */
function highlightFeature(e, stateName) {
  if (currentSelectedState) return;

  const layer = e.target;
  layer.setStyle({
    weight: 2.8,
    color: '#2F5D3A',
    fillOpacity: 0.95
  });

  if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
    layer.bringToFront();
  }

  // Refresh tooltip
  layer.setTooltipContent(createTooltipContent(stateName));
}

/**
 * State hover reset
 */
function resetFeatureHighlight(e, stateName) {
  if (currentSelectedState) return;
  if (geojsonLayer) {
    geojsonLayer.resetStyle(e.target);
  }
}

/**
 * Handles click on a state polygon
 */
function handleStateClick(stateName, layer) {
  selectAndIsolateState(stateName, layer);

  if (onStateClickCallback) {
    onStateClickCallback(stateName);
  }

  loadStateAnalysis(stateName);
}

/**
 * Selects and isolates a state on the map
 */
function selectAndIsolateState(stateName, layer) {
  currentSelectedState = stateName;

  // Show floating Back button (DOM element + Leaflet control)
  const backBtn = document.getElementById('btn-back-to-india');
  if (backBtn) {
    backBtn.classList.remove('hidden');
  }
  if (backButtonControl && backButtonControl.getContainer()) {
    backButtonControl.getContainer().style.display = 'block';
  }

  // Update styles for all layers
  if (geojsonLayer) {
    geojsonLayer.eachLayer((l) => {
      l.setStyle(getStateFeatureStyle(l.feature));
      const lName = l.feature?.properties?.name || l.feature?.properties?.NAME_1;
      if (lName && lName.toLowerCase() === stateName.toLowerCase()) {
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
          l.bringToFront();
        }
      }
    });
  }

  // Zoom to polygon bounds
  if (layer && layer.getBounds) {
    try {
      mapInstance.fitBounds(layer.getBounds(), {
        padding: [30, 30],
        maxZoom: 8,
        animate: true,
        duration: 0.75
      });
    } catch {
      // Bounds fallback
    }
  }
}

/**
 * Focus and zoom map to a specific state (invoked from search or direct selection)
 * @param {string} stateName
 */
export function zoomToState(stateName) {
  if (!stateName || !mapInstance) return;

  const norm = stateName.toLowerCase().trim();
  let layer = stateLayersMap.get(norm);

  if (!layer && geojsonLayer) {
    geojsonLayer.eachLayer((l) => {
      const name = l.feature?.properties?.name || l.feature?.properties?.NAME_1;
      if (name && name.toLowerCase() === norm) {
        layer = l;
      }
    });
  }

  if (layer) {
    selectAndIsolateState(stateName, layer);
  } else {
    // Check known state centroid fallback
    const coords = STATE_CENTROIDS[stateName] || STATE_CENTROIDS[findClosestStateName(stateName)];
    if (coords) {
      currentSelectedState = stateName;
      const backBtn = document.getElementById('btn-back-to-india');
      if (backBtn) backBtn.classList.remove('hidden');
      if (backButtonControl && backButtonControl.getContainer()) {
        backButtonControl.getContainer().style.display = 'block';
      }
      mapInstance.flyTo(coords, 7, { animate: true, duration: 0.8 });
    }
  }
}

/**
 * Resets map to default national view of India and restores full choropleth colors
 */
export function resetToNationalView() {
  currentSelectedState = null;

  // Hide Back button (DOM element + Leaflet control)
  const backBtn = document.getElementById('btn-back-to-india');
  if (backBtn) {
    backBtn.classList.add('hidden');
  }
  if (backButtonControl && backButtonControl.getContainer()) {
    backButtonControl.getContainer().style.display = 'none';
  }

  // Reset polygon styles
  if (geojsonLayer) {
    geojsonLayer.eachLayer((l) => {
      geojsonLayer.resetStyle(l);
    });
  }

  // Fly to India center
  mapInstance.setView(INDIA_CENTER, DEFAULT_ZOOM, {
    animate: true,
    duration: 0.75
  });

  if (onResetCallback) {
    onResetCallback();
  }
}

/**
 * Updates the choropleth data mapping and re-renders polygon styles
 * @param {Object} trendsData - Map of state name/code to classification object
 */
export function setChoroplethData(trendsData) {
  activeChoroplethData = trendsData || {};
  if (geojsonLayer) {
    geojsonLayer.eachLayer((layer) => {
      layer.setStyle(getStateFeatureStyle(layer.feature));
    });
  }
}

/**
 * Highlights map polygons that match a specific legend classification
 * @param {string} classificationKey
 */
export function filterByLegend(classificationKey) {
  if (currentSelectedState || !geojsonLayer) return;

  geojsonLayer.eachLayer((layer) => {
    const stateName = layer.feature?.properties?.name || layer.feature?.properties?.NAME_1;
    const currentClass = getTrendClassification(stateName);

    if (currentClass === classificationKey) {
      layer.setStyle({
        fillColor: TREND_COLORS[classificationKey] || '#2F5D3A',
        fillOpacity: 0.95,
        weight: 3,
        color: '#2F5D3A'
      });
      if (!L.Browser.ie && !L.Browser.opera) {
        layer.bringToFront();
      }
    } else {
      layer.setStyle({
        fillColor: '#D9D2BF',
        fillOpacity: 0.08,
        weight: 0.5,
        color: '#B0A894'
      });
    }
  });
}

/**
 * Resets legend hover filter back to active choropleth view
 */
export function resetLegendFilter() {
  if (currentSelectedState || !geojsonLayer) return;
  geojsonLayer.eachLayer((layer) => {
    layer.setStyle(getStateFeatureStyle(layer.feature));
  });
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
      if (currentSelectedState || !geojsonLayer) return;
      filterByLegend(targetClass);
    });

    item.addEventListener('mouseleave', () => {
      if (currentSelectedState || !geojsonLayer) return;
      resetLegendFilter();
    });
  });
}

function formatClassLabel(className) {
  if (!className) return 'No clear change';
  return className.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function findClosestStateName(input) {
  if (!input) return 'Kerala';
  const lower = input.toLowerCase();
  for (const name of Object.keys(STATE_CENTROIDS)) {
    if (name.toLowerCase().includes(lower) || lower.includes(name.toLowerCase())) {
      return name;
    }
  }
  return 'Kerala';
}
