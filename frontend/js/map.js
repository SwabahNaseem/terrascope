/**
 * TerraScope Map Module
 * Handles Leaflet map rendering, GeoJSON boundary styling, choropleth color classification,
 * state isolation, zoom-to-state animations, and floating navigation controls.
 */

let mapInstance = null;
let geojsonLayer = null;
let stateLayersMap = new Map(); // Name/code -> Leaflet Layer
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
  no_clear_change: '#D9D2BF', // Beige Grey
  slight_decrease: '#B7C7A3', // Light Sage
  strong_decrease: '#2F5D3A', // Forest Green
  no_data:         '#FAF6EC'  // Hatched Ivory
};

export const TREND_SYMBOLS = {
  strong_increase: '▲▲',
  slight_increase: '▲',
  no_clear_change: '=',
  slight_decrease: '▼',
  strong_decrease: '▼▼',
  no_data:         '—'
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
 */
export function initMap(containerId, onStateClick, onReset) {
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
    zoomControl: false
  });

  // Custom Zoom Control at top-right
  L.control.zoom({ position: 'topright' }).addTo(mapInstance);

  // Subtle light basemap (CartoDB Positron)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(mapInstance);

  // Floating "< Back to India" Leaflet Control
  createBackToIndiaControl();

  // Load India States GeoJSON
  loadIndiaGeoJSON();

  return mapInstance;
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

          // Tooltip showing state name and direction classification
          layer.bindTooltip(createTooltipContent(stateName), {
            sticky: true,
            className: 'state-map-tooltip',
            direction: 'auto'
          });

          layer.on({
            mouseover: (e) => highlightFeature(e, stateName),
            mouseout: (e) => resetFeatureHighlight(e, stateName),
            click: () => {
              selectAndIsolateState(stateName, layer);
              if (onStateClickCallback) {
                onStateClickCallback(stateName);
              }
            }
          });
        }
      }).addTo(mapInstance);
    })
    .catch(err => {
      console.warn('[TerraScope Map] GeoJSON loading notice:', err.message);
    });
}

/**
 * Determines polygon style based on current choropleth data and isolation state
 */
function getStateFeatureStyle(feature) {
  const stateName = feature?.properties?.name || feature?.properties?.NAME_1 || feature?.properties?.id;
  const classification = getTrendClassification(stateName);
  const baseColor = TREND_COLORS[classification] || TREND_COLORS.no_clear_change;

  if (currentSelectedState) {
    const isSelected = isStateMatch(stateName, currentSelectedState);
    if (isSelected) {
      return {
        fillColor: baseColor,
        weight: 3.5,
        opacity: 1,
        color: '#2F5D3A',
        fillOpacity: 0.95
      };
    } else {
      // Dim non-selected states
      return {
        fillColor: '#D9D2BF',
        weight: 0.5,
        opacity: 0.5,
        color: '#A09A8A',
        fillOpacity: 0.05
      };
    }
  }

  // Normal national choropleth mode
  return {
    fillColor: baseColor,
    weight: 1.5,
    opacity: 1,
    color: '#FAF6EC',
    fillOpacity: 0.85
  };
}

function highlightFeature(e, stateName) {
  if (currentSelectedState) return;

  const layer = e.target;
  layer.setStyle({
    weight: 2.5,
    color: '#2F5D3A',
    fillOpacity: 0.95
  });

  if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
    layer.bringToFront();
  }

  // Refresh tooltip with latest trend data
  layer.setTooltipContent(createTooltipContent(stateName));
}

function resetFeatureHighlight(e, stateName) {
  if (currentSelectedState) return;
  if (geojsonLayer) {
    geojsonLayer.resetStyle(e.target);
  }
}

function createTooltipContent(stateName) {
  const classification = getTrendClassification(stateName);
  const symbol = TREND_SYMBOLS[classification] || '=';
  const label = classification.replace(/_/g, ' ');
  return `<strong>${stateName}</strong><br/><span style="font-size: 0.85rem;">Trend: ${symbol} ${label}</span>`;
}

function getTrendClassification(stateName) {
  if (!stateName) return 'no_data';
  const norm = stateName.toLowerCase();

  if (activeChoroplethData[norm]) {
    return activeChoroplethData[norm].class || activeChoroplethData[norm].classification || activeChoroplethData[norm];
  }

  // Direct case check
  for (const [key, val] of Object.entries(activeChoroplethData)) {
    if (key.toLowerCase() === norm) {
      return val.class || val.classification || val;
    }
  }

  return 'no_clear_change';
}

function isStateMatch(name1, name2) {
  if (!name1 || !name2) return false;
  return name1.toLowerCase().trim() === name2.toLowerCase().trim();
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
      btn.innerHTML = '&#8592; Back to India';
      btn.setAttribute('type', 'button');
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
 * Selects and isolates a state on the map
 */
function selectAndIsolateState(stateName, layer) {
  currentSelectedState = stateName;

  // Show floating Back button
  if (backButtonControl && backButtonControl.getContainer()) {
    backButtonControl.getContainer().style.display = 'block';
  }

  // Update styles for all layers
  if (geojsonLayer) {
    geojsonLayer.eachLayer((l) => {
      l.setStyle(getStateFeatureStyle(l.feature));
    });
  }

  // Zoom to polygon bounds
  if (layer && layer.getBounds) {
    try {
      mapInstance.fitBounds(layer.getBounds(), {
        padding: [40, 40],
        maxZoom: 8,
        animate: true,
        duration: 0.8
      });
    } catch {
      // Bounds fallback
    }
  }
}

/**
 * Focus and zoom map to a specific state (by polygon or centroid)
 * @param {string} stateName
 */
export function zoomToState(stateName) {
  if (!stateName || !mapInstance) return;

  const norm = stateName.toLowerCase().trim();
  const layer = stateLayersMap.get(norm);

  if (layer) {
    selectAndIsolateState(stateName, layer);
  } else {
    // Check known state centroid fallback
    const coords = STATE_CENTROIDS[stateName] || STATE_CENTROIDS[findClosestStateName(stateName)];
    if (coords) {
      currentSelectedState = stateName;
      if (backButtonControl && backButtonControl.getContainer()) {
        backButtonControl.getContainer().style.display = 'block';
      }
      mapInstance.flyTo(coords, 7, { animate: true, duration: 0.8 });
    }
  }
}

/**
 * Resets map to default national view and restores full choropleth colors
 */
export function resetToNationalView() {
  currentSelectedState = null;

  // Hide Back button
  if (backButtonControl && backButtonControl.getContainer()) {
    backButtonControl.getContainer().style.display = 'none';
  }

  // Reset polygon styles
  if (geojsonLayer) {
    geojsonLayer.eachLayer((l) => {
      l.setStyle(getStateFeatureStyle(l.feature));
    });
  }

  // Fly to India center
  mapInstance.flyTo(INDIA_CENTER, DEFAULT_ZOOM, {
    animate: true,
    duration: 0.6
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

function findClosestStateName(input) {
  const lower = input.toLowerCase();
  for (const name of Object.keys(STATE_CENTROIDS)) {
    if (name.toLowerCase().includes(lower) || lower.includes(name.toLowerCase())) {
      return name;
    }
  }
  return 'Kerala';
}
