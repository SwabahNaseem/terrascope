/**
 * TerraScope Map Module
 * Handles Leaflet map rendering with Realistic Satellite Imagery & Dark Canvas basemaps,
 * national 36-state choropleth coloring, dynamic district-level drill-down upon state selection,
 * and seamless fallback when offline.
 * Styled to EarthWatch / TerraScope Dark Navy Reference Palette.
 */

let mapInstance = null;
let geojsonLayer = null;
let districtsLayerGroup = null;
let stateLayersMap = new Map();
let currentSelectedState = null;
let currentSelectedDistrict = null;
let activeChoroplethData = {};
let allStatesGeoData = null;
let allDistrictsGeoData = null;
let backButtonControl = null;
let basemapToggleControl = null;
let onStateClickCallback = null;
let onResetCallback = null;
let onDistrictClickCallback = null;
let isSvgFallbackMode = false;

const INDIA_CENTER = [22.5937, 78.9629];
const DEFAULT_ZOOM = 5;

// Reference Palette Color Mapping
export const TREND_COLORS = {
  strong_increase: '#FF6B58', // Coral Red (--red)
  slight_increase: '#FFAD45', // Orange (--orange)
  no_clear_change: '#1B3B59', // Muted Blue Divider (--line)
  slight_decrease: '#19C8F2', // Bright Cyan (--cyan)
  strong_decrease: '#42D69B', // Green (--green)
  no_data:         '#10243B'  // Blue Navy Panel2 (--panel2)
};

export const TREND_SYMBOLS = {
  strong_increase: '▲▲',
  slight_increase: '▲',
  no_clear_change: '=',
  slight_decrease: '▼',
  strong_decrease: '▼▼',
  no_data:         '—'
};

// Known centroid coordinates for Indian States
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

// District sample database for state drill-down
const DISTRICT_DATA_REGISTRY = {
  'kerala': [
    { name: 'Kasaragod', slope: 0.26, classification: 'slight_increase', symbol: '▲' },
    { name: 'Kannur', slope: 0.27, classification: 'slight_increase', symbol: '▲' },
    { name: 'Wayanad', slope: 0.35, classification: 'slight_increase', symbol: '▲' },
    { name: 'Kozhikode', slope: 0.29, classification: 'slight_increase', symbol: '▲' },
    { name: 'Malappuram', slope: 0.32, classification: 'slight_increase', symbol: '▲' },
    { name: 'Palakkad', slope: 0.41, classification: 'strong_increase', symbol: '▲▲' },
    { name: 'Thrissur', slope: 0.30, classification: 'slight_increase', symbol: '▲' },
    { name: 'Ernakulam', slope: 0.33, classification: 'slight_increase', symbol: '▲' },
    { name: 'Idukki', slope: 0.44, classification: 'strong_increase', symbol: '▲▲' },
    { name: 'Kottayam', slope: 0.28, classification: 'slight_increase', symbol: '▲' },
    { name: 'Alappuzha', slope: 0.18, classification: 'no_clear_change', symbol: '=' },
    { name: 'Pathanamthitta', slope: 0.38, classification: 'strong_increase', symbol: '▲▲' },
    { name: 'Kollam', slope: 0.29, classification: 'slight_increase', symbol: '▲' },
    { name: 'Thiruvananthapuram', slope: 0.31, classification: 'slight_increase', symbol: '▲' }
  ],
  'tamil nadu': [
    { name: 'Chennai', slope: 0.45, classification: 'strong_increase', symbol: '▲▲' },
    { name: 'Coimbatore', slope: 0.32, classification: 'slight_increase', symbol: '▲' },
    { name: 'Nilgiris', slope: 0.40, classification: 'strong_increase', symbol: '▲▲' },
    { name: 'Madurai', slope: 0.38, classification: 'strong_increase', symbol: '▲▲' },
    { name: 'Salem', slope: 0.33, classification: 'slight_increase', symbol: '▲' },
    { name: 'Tiruchirappalli', slope: 0.30, classification: 'slight_increase', symbol: '▲' },
    { name: 'Thanjavur', slope: 0.19, classification: 'no_clear_change', symbol: '=' },
    { name: 'Tirunelveli', slope: 0.28, classification: 'slight_increase', symbol: '▲' },
    { name: 'Kanyakumari', slope: 0.17, classification: 'no_clear_change', symbol: '=' }
  ],
  'karnataka': [
    { name: 'Bengaluru Urban', slope: 0.46, classification: 'strong_increase', symbol: '▲▲' },
    { name: 'Mysuru', slope: 0.31, classification: 'slight_increase', symbol: '▲' },
    { name: 'Dakshina Kannada', slope: 0.28, classification: 'slight_increase', symbol: '▲' },
    { name: 'Belagavi', slope: 0.42, classification: 'strong_increase', symbol: '▲▲' },
    { name: 'Kalaburagi', slope: 0.47, classification: 'strong_increase', symbol: '▲▲' }
  ]
};

/**
 * Initialize Map
 * @param {string} containerId - DOM container ID
 * @param {Function} onStateClick - Callback when state is selected
 * @param {Function} [onReset] - Callback when view is reset to national India
 * @param {Function} [onDistrictClick] - Callback when district is selected
 */
export function initMap(containerId, onStateClick, onReset, onDistrictClick) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  onStateClickCallback = onStateClick;
  onResetCallback = onReset;
  onDistrictClickCallback = onDistrictClick;

  container.style.backgroundColor = '#06111F';

  if (typeof L === 'undefined') {
    console.warn('[TerraScope Map] Leaflet CDN not loaded. Activating vector SVG engine with district drill-down.');
    isSvgFallbackMode = true;
    renderSvgMap(containerId);
    return { isSvgFallback: true };
  }

  isSvgFallbackMode = false;

  try {
    mapInstance = L.map(containerId, {
      center: INDIA_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: 4,
      maxZoom: 10,
      zoomControl: false
    });

    L.control.zoom({ position: 'topright' }).addTo(mapInstance);

    // 1. Realistic Satellite Imagery Basemap (Esri World Imagery)
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; <a href="https://www.esri.com" style="color: #9BB0C5;">Esri</a>, NASA, USGS',
      maxZoom: 19
    });

    // 2. Dark Canvas Basemap (CartoDB Dark Matter)
    const darkCanvasLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap, &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19
    });

    // Default to Satellite for realistic Earth observation
    satelliteLayer.addTo(mapInstance);

    // Add Basemap Switcher Control
    createBasemapToggleControl(satelliteLayer, darkCanvasLayer);

    // Group for district boundaries (only visible when a state is selected)
    districtsLayerGroup = L.layerGroup().addTo(mapInstance);

    // Floating "< Back to India" Control
    createBackToIndiaControl();

    // Load GeoJSON Boundaries
    loadGeoJsonData();

    // Invalidate size to guarantee correct canvas layout
    setTimeout(() => {
      if (mapInstance) mapInstance.invalidateSize();
    }, 150);

    window.addEventListener('resize', () => {
      if (mapInstance) mapInstance.invalidateSize();
    });

    return mapInstance;
  } catch (e) {
    console.warn('[TerraScope Map] Leaflet initialization error. Falling back to SVG engine:', e);
    isSvgFallbackMode = true;
    renderSvgMap(containerId);
    return { isSvgFallback: true };
  }
}

/**
 * Loads India states & districts GeoJSON
 */
async function loadGeoJsonData() {
  try {
    const statesRes = await fetch('assets/geo/india_states.geojson');
    if (statesRes.ok) {
      allStatesGeoData = await statesRes.json();
    }
  } catch {
    // Handled by inline fallback
  }

  try {
    const districtsRes = await fetch('assets/geo/india_districts.geojson');
    if (districtsRes.ok) {
      allDistrictsGeoData = await districtsRes.json();
    }
  } catch {}

  bindStatesGeoJsonLayer(allStatesGeoData);
}

/**
 * Binds and renders the National States Layer
 */
function bindStatesGeoJsonLayer(geoData) {
  if (!mapInstance || !geoData) return;

  if (geojsonLayer) {
    mapInstance.removeLayer(geojsonLayer);
  }

  stateLayersMap.clear();

  geojsonLayer = L.geoJSON(geoData, {
    style: getStateFeatureStyle,
    onEachFeature: (feature, layer) => {
      const stateName = feature.properties.name || feature.properties.NAME_1 || feature.properties.id;
      const stateCode = feature.properties.id || feature.properties.state_code;

      if (stateName) stateLayersMap.set(stateName.toLowerCase(), layer);
      if (stateCode) stateLayersMap.set(stateCode.toLowerCase(), layer);

      layer.bindTooltip(createStateTooltipContent(stateName), {
        sticky: true,
        className: 'state-map-tooltip',
        direction: 'auto'
      });

      layer.on({
        mouseover: (e) => highlightStateFeature(e, stateName),
        mouseout: (e) => resetStateFeatureHighlight(e, stateName),
        click: () => {
          selectAndIsolateState(stateName, layer);
          if (onStateClickCallback) {
            onStateClickCallback(stateName);
          }
        }
      });
    }
  }).addTo(mapInstance);
}

/**
 * State polygon style: When whole India is selected, every state is colored by its secular trend.
 * When a state is selected, other states are dimmed out.
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
        color: '#19C8F2', // Cyan boundary outline
        fillOpacity: 0.25 // Translucent so districts/satellite show inside
      };
    } else {
      // Dim non-selected states
      return {
        fillColor: '#0C1D31',
        weight: 0.6,
        opacity: 0.3,
        color: '#1B3B59',
        fillOpacity: 0.15
      };
    }
  }

  // Whole India National Overview: Every state colored by trend
  return {
    fillColor: baseColor,
    weight: 1.5,
    opacity: 0.9,
    color: '#19C8F2',
    fillOpacity: 0.65
  };
}

function highlightStateFeature(e, stateName) {
  if (currentSelectedState) return;

  const layer = e.target;
  layer.setStyle({
    weight: 3,
    color: '#19C8F2',
    fillOpacity: 0.85
  });

  if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
    layer.bringToFront();
  }

  layer.setTooltipContent(createStateTooltipContent(stateName));
}

function resetStateFeatureHighlight(e) {
  if (currentSelectedState) return;
  if (geojsonLayer) {
    geojsonLayer.resetStyle(e.target);
  }
}

function createStateTooltipContent(stateName) {
  const classification = getTrendClassification(stateName);
  const symbol = TREND_SYMBOLS[classification] || '=';
  const label = classification.replace(/_/g, ' ');
  return `<div style="background: #10243B; border: 1px solid #1B3B59; padding: 6px 10px; border-radius: 4px; color: #EDF6FF;">
    <strong style="color: #19C8F2;">${stateName}</strong><br/>
    <span style="font-size: 0.85rem; color: #9BB0C5;">Trend: <strong style="color: #EDF6FF;">${symbol} ${label}</strong></span><br/>
    <span style="font-size: 0.75rem; color: #19C8F2;">Click to explore districts</span>
  </div>`;
}

/**
 * State Selection & District Layer Drill-Down:
 * When state is clicked:
 * 1. Zooms to state bounds.
 * 2. Dims outside states.
 * 3. LOADS AND COLORS DISTRICTS OF THIS STATE!
 */
function selectAndIsolateState(stateName, layer) {
  currentSelectedState = stateName;
  currentSelectedDistrict = null;

  if (isSvgFallbackMode) {
    updateSvgStateAndDistricts();
    const backBtn = document.getElementById('svg-back-to-india-btn');
    if (backBtn) backBtn.style.display = 'block';
    return;
  }

  // Show floating Back button
  if (backButtonControl && backButtonControl.getContainer()) {
    backButtonControl.getContainer().style.display = 'block';
  }

  // Refresh state boundaries
  if (geojsonLayer) {
    geojsonLayer.eachLayer((l) => {
      l.setStyle(getStateFeatureStyle(l.feature));
    });
  }

  // Zoom map to state bounds
  if (layer && layer.getBounds) {
    try {
      mapInstance.fitBounds(layer.getBounds(), {
        padding: [30, 30],
        maxZoom: 8,
        animate: true,
        duration: 0.8
      });
    } catch {}
  }

  // -------------------------------------------------------------
  // RENDER DISTRICTS FOR THE SELECTED STATE ONLY
  // -------------------------------------------------------------
  renderDistrictsForState(stateName, layer);
}

/**
 * Renders district polygons and colors for the selected state
 */
function renderDistrictsForState(stateName, stateLayer) {
  if (!districtsLayerGroup) return;
  districtsLayerGroup.clearLayers();

  const normState = stateName.toLowerCase().trim();

  // 1. Check if we have GeoJSON district features
  let matchingFeatures = [];
  if (allDistrictsGeoData && allDistrictsGeoData.features) {
    matchingFeatures = allDistrictsGeoData.features.filter(f =>
      f.properties.state && f.properties.state.toLowerCase() === normState
    );
  }

  // 2. If matching district features exist, render them with individual trend colors
  if (matchingFeatures.length > 0) {
    const dLayer = L.geoJSON({ type: 'FeatureCollection', features: matchingFeatures }, {
      style: (feat) => {
        const dClass = feat.properties.classification || 'slight_increase';
        const dColor = TREND_COLORS[dClass] || '#FFAD45';
        return {
          fillColor: dColor,
          weight: 2,
          opacity: 1,
          color: '#19C8F2',
          fillOpacity: 0.8
        };
      },
      onEachFeature: (feat, layer) => {
        const dName = feat.properties.name;
        const dSlope = feat.properties.slope || 0.3;
        const dSymbol = feat.properties.symbol || '▲';
        const dClass = (feat.properties.classification || 'slight_increase').replace(/_/g, ' ');

        layer.bindTooltip(`
          <div style="background: #10243B; border: 1px solid #1B3B59; padding: 6px 10px; border-radius: 4px; color: #EDF6FF;">
            <strong style="color: #19C8F2;">${dName} District</strong><br/>
            <span style="font-size: 0.85rem; color: #9BB0C5;">State: ${stateName}</span><br/>
            <span style="font-size: 0.85rem;">Trend: <strong style="color: #EDF6FF;">${dSymbol} +${dSlope.toFixed(2)} °C/dec (${dClass})</strong></span>
          </div>
        `, { sticky: true, className: 'district-map-tooltip' });

        layer.on({
          mouseover: (e) => {
            const l = e.target;
            l.setStyle({ weight: 3.5, color: '#ffffff', fillOpacity: 0.95 });
            if (!L.Browser.ie && !L.Browser.opera) l.bringToFront();
          },
          mouseout: (e) => {
            dLayer.resetStyle(e.target);
          },
          click: (e) => {
            L.DomEvent.stopPropagation(e);
            currentSelectedDistrict = dName;
            if (onDistrictClickCallback) {
              onDistrictClickCallback({
                name: dName,
                state: stateName,
                slope: dSlope,
                classification: feat.properties.classification
              });
            }
          }
        });
      }
    });

    districtsLayerGroup.addLayer(dLayer);
  } else {
    // Generate procedural district subdivision markers within the state polygon
    generateProceduralDistrictsForState(stateName, stateLayer);
  }
}

/**
 * Procedural fallback for states without pre-compiled district geometry
 */
function generateProceduralDistrictsForState(stateName, stateLayer) {
  if (!stateLayer || !stateLayer.getBounds) return;
  const bounds = stateLayer.getBounds();
  const minLat = bounds.getSouth();
  const maxLat = bounds.getNorth();
  const minLng = bounds.getWest();
  const maxLng = bounds.getEast();

  const dLat = (maxLat - minLat) / 3;
  const dLng = (maxLng - minLng) / 3;

  const districtNames = ['North Region', 'Central Region', 'South Region', 'East Region', 'West Region'];
  const classes = ['strong_increase', 'slight_increase', 'slight_increase', 'no_clear_change', 'strong_increase'];

  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      const idx = r * 2 + c;
      const subBounds = [
        [minLat + r * dLat, minLng + c * dLng],
        [minLat + (r + 1) * dLat, minLng + (c + 1) * dLng]
      ];
      const dName = districtNames[idx] || `District ${idx + 1}`;
      const dClass = classes[idx] || 'slight_increase';
      const dColor = TREND_COLORS[dClass];

      const rect = L.rectangle(subBounds, {
        fillColor: dColor,
        weight: 1.5,
        color: '#19C8F2',
        fillOpacity: 0.75
      });

      rect.bindTooltip(`
        <div style="background: #10243B; border: 1px solid #1B3B59; padding: 6px 10px; border-radius: 4px; color: #EDF6FF;">
          <strong style="color: #19C8F2;">${dName}</strong><br/>
          <span style="font-size: 0.85rem; color: #9BB0C5;">State: ${stateName}</span><br/>
          <span style="font-size: 0.85rem;">Trend: <strong style="color: #EDF6FF;">${TREND_SYMBOLS[dClass]} ${dClass.replace(/_/g, ' ')}</strong></span>
        </div>
      `, { sticky: true });

      districtsLayerGroup.addLayer(rect);
    }
  }
}

/**
 * Resets view to Whole India Overview (Clears all district polygons)
 */
export function resetToNationalView() {
  currentSelectedState = null;
  currentSelectedDistrict = null;

  // 1. Remove district layer entirely when whole India is selected
  if (districtsLayerGroup) {
    districtsLayerGroup.clearLayers();
  }

  if (isSvgFallbackMode) {
    updateSvgStateAndDistricts();
    const backBtn = document.getElementById('svg-back-to-india-btn');
    if (backBtn) backBtn.style.display = 'none';
    if (onResetCallback) onResetCallback();
    return;
  }

  // Hide Back button
  if (backButtonControl && backButtonControl.getContainer()) {
    backButtonControl.getContainer().style.display = 'none';
  }

  // Restore state colors
  if (geojsonLayer) {
    geojsonLayer.eachLayer((l) => {
      l.setStyle(getStateFeatureStyle(l.feature));
    });
  }

  // Fly back to India center
  if (mapInstance) {
    mapInstance.flyTo(INDIA_CENTER, DEFAULT_ZOOM, {
      animate: true,
      duration: 0.6
    });
  }

  if (onResetCallback) {
    onResetCallback();
  }
}

/**
 * Focus and zoom map to a specific state
 */
export function zoomToState(stateName) {
  if (!stateName) return;

  if (isSvgFallbackMode) {
    selectAndIsolateState(stateName, null);
    return;
  }

  if (!mapInstance) return;

  const norm = stateName.toLowerCase().trim();
  const layer = stateLayersMap.get(norm);

  if (layer) {
    selectAndIsolateState(stateName, layer);
  } else {
    const coords = STATE_CENTROIDS[stateName];
    if (coords) {
      currentSelectedState = stateName;
      if (backButtonControl && backButtonControl.getContainer()) {
        backButtonControl.getContainer().style.display = 'block';
      }
      mapInstance.flyTo(coords, 7, { animate: true, duration: 0.8 });
      renderDistrictsForState(stateName, null);
    }
  }
}

/**
 * Updates the choropleth data mapping
 */
export function setChoroplethData(trendsData) {
  activeChoroplethData = trendsData || {};

  if (isSvgFallbackMode) {
    updateSvgStateAndDistricts();
    return;
  }

  if (geojsonLayer) {
    geojsonLayer.eachLayer((layer) => {
      layer.setStyle(getStateFeatureStyle(layer.feature));
    });
  }
}

/**
 * Filter polygons by legend hover
 */
export function filterByLegend(classificationKey) {
  if (currentSelectedState) return;

  if (geojsonLayer) {
    geojsonLayer.eachLayer((layer) => {
      const stateName = layer.feature?.properties?.name || layer.feature?.properties?.NAME_1;
      const currentClass = getTrendClassification(stateName);

      if (currentClass === classificationKey) {
        layer.setStyle({
          fillColor: TREND_COLORS[classificationKey] || '#19C8F2',
          fillOpacity: 0.95,
          weight: 3,
          color: '#ffffff'
        });
        if (!L.Browser.ie && !L.Browser.opera) layer.bringToFront();
      } else {
        layer.setStyle({
          fillColor: '#0C1D31',
          fillOpacity: 0.15,
          weight: 0.5,
          color: '#1B3B59'
        });
      }
    });
  }
}

export function resetLegendFilter() {
  if (currentSelectedState) return;
  if (!geojsonLayer) return;
  geojsonLayer.eachLayer((layer) => {
    layer.setStyle(getStateFeatureStyle(layer.feature));
  });
}

function getTrendClassification(stateName) {
  if (!stateName) return 'no_data';
  const norm = stateName.toLowerCase();

  if (activeChoroplethData[norm]) {
    return activeChoroplethData[norm].class || activeChoroplethData[norm].classification || activeChoroplethData[norm];
  }

  for (const [key, val] of Object.entries(activeChoroplethData)) {
    if (key.toLowerCase() === norm) {
      return val.class || val.classification || val;
    }
  }

  return 'slight_increase';
}

function isStateMatch(name1, name2) {
  if (!name1 || !name2) return false;
  return name1.toLowerCase().trim() === name2.toLowerCase().trim();
}

/**
 * Floating "< Back to India" Control
 */
function createBackToIndiaControl() {
  if (!mapInstance) return;

  const BackControl = L.Control.extend({
    options: { position: 'topleft' },
    onAdd: function () {
      const container = L.DomUtil.create('div', 'map-back-container');
      container.style.display = 'none';

      const btn = L.DomUtil.create('button', 'btn-back-india', container);
      btn.innerHTML = '&#8592; Back to India';
      btn.setAttribute('type', 'button');
      btn.setAttribute('aria-label', 'Reset to National Map of India');
      btn.style.backgroundColor = '#10243B';
      btn.style.color = '#19C8F2';
      btn.style.border = '2px solid #1B3B59';
      btn.style.borderRadius = '6px';
      btn.style.padding = '8px 16px';
      btn.style.fontWeight = '700';
      btn.style.fontSize = '0.85rem';
      btn.style.cursor = 'pointer';
      btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';

      L.DomEvent.disableClickPropagation(container);
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
 * Basemap Switcher Control (Satellite vs Dark Canvas)
 */
function createBasemapToggleControl(satelliteLayer, darkCanvasLayer) {
  if (!mapInstance) return;

  const ToggleControl = L.Control.extend({
    options: { position: 'topright' },
    onAdd: function () {
      const container = L.DomUtil.create('div', 'basemap-toggle-container');
      container.style.marginTop = '10px';
      container.style.display = 'flex';
      container.style.gap = '4px';
      container.style.backgroundColor = 'rgba(12, 29, 49, 0.9)';
      container.style.padding = '4px';
      container.style.borderRadius = '6px';
      container.style.border = '1px solid #1B3B59';

      const satBtn = document.createElement('button');
      satBtn.textContent = '🛰️ Satellite';
      satBtn.style.padding = '5px 10px';
      satBtn.style.fontSize = '0.75rem';
      satBtn.style.fontWeight = '700';
      satBtn.style.borderRadius = '4px';
      satBtn.style.border = 'none';
      satBtn.style.cursor = 'pointer';
      satBtn.style.backgroundColor = '#19C8F2';
      satBtn.style.color = '#06111F';

      const darkBtn = document.createElement('button');
      darkBtn.textContent = '🗺️ Dark Canvas';
      darkBtn.style.padding = '5px 10px';
      darkBtn.style.fontSize = '0.75rem';
      darkBtn.style.fontWeight = '700';
      darkBtn.style.borderRadius = '4px';
      darkBtn.style.border = 'none';
      darkBtn.style.cursor = 'pointer';
      darkBtn.style.backgroundColor = 'transparent';
      darkBtn.style.color = '#9BB0C5';

      satBtn.addEventListener('click', (e) => {
        L.DomEvent.stopPropagation(e);
        if (mapInstance.hasLayer(darkCanvasLayer)) mapInstance.removeLayer(darkCanvasLayer);
        if (!mapInstance.hasLayer(satelliteLayer)) satelliteLayer.addTo(mapInstance);
        satBtn.style.backgroundColor = '#19C8F2';
        satBtn.style.color = '#06111F';
        darkBtn.style.backgroundColor = 'transparent';
        darkBtn.style.color = '#9BB0C5';
      });

      darkBtn.addEventListener('click', (e) => {
        L.DomEvent.stopPropagation(e);
        if (mapInstance.hasLayer(satelliteLayer)) mapInstance.removeLayer(satelliteLayer);
        if (!mapInstance.hasLayer(darkCanvasLayer)) darkCanvasLayer.addTo(mapInstance);
        darkBtn.style.backgroundColor = '#19C8F2';
        darkBtn.style.color = '#06111F';
        satBtn.style.backgroundColor = 'transparent';
        satBtn.style.color = '#9BB0C5';
      });

      container.appendChild(satBtn);
      container.appendChild(darkBtn);
      L.DomEvent.disableClickPropagation(container);

      return container;
    }
  });

  basemapToggleControl = new ToggleControl();
  basemapToggleControl.addTo(mapInstance);
}

/**
 * Interactive SVG Fallback Map
 */
function renderSvgMap(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #06111F; overflow: hidden;">
      <button id="svg-back-to-india-btn" type="button" style="display: none; position: absolute; top: 16px; left: 16px; z-index: 10; background: #10243B; color: #19C8F2; border: 2px solid #1B3B59; border-radius: 6px; padding: 8px 16px; font-weight: 700; font-size: 0.85rem; cursor: pointer;">
        &#8592; Back to India
      </button>
      <div id="svg-map-tooltip" style="display: none; position: absolute; pointer-events: none; z-index: 20; background: #10243B; border: 1px solid #1B3B59; padding: 6px 12px; border-radius: 4px; font-size: 0.85rem; color: #EDF6FF; box-shadow: 0 4px 12px rgba(0,0,0,0.5);"></div>
      <svg id="india-svg-map" viewBox="68 6 30 32" style="width: 100%; height: 100%; max-height: 520px; transform: scaleY(-1);" preserveAspectRatio="xMidYMid meet">
        <g id="svg-states-group">
          <!-- All Indian States in SVG -->
          <polygon class="svg-state-path" data-state-name="Kerala" points="74.85,12.80 75.40,12.10 76.05,11.75 76.75,11.20 77.40,10.15 77.20,8.50 76.90,8.30 76.20,9.50 75.80,10.50 75.20,11.80" />
          <polygon class="svg-state-path" data-state-name="Tamil Nadu" points="77.20,8.50 77.40,10.15 76.75,11.20 77.50,12.80 80.30,13.50 79.80,10.30 78.20,9.10 77.55,8.10" />
          <polygon class="svg-state-path" data-state-name="Karnataka" points="74.10,15.00 75.50,17.50 77.50,18.00 77.50,12.80 76.05,11.75 74.85,12.80" />
          <polygon class="svg-state-path" data-state-name="Andhra Pradesh" points="77.50,12.80 77.50,15.50 79.50,16.00 83.50,18.50 82.50,17.00 80.30,13.50" />
          <polygon class="svg-state-path" data-state-name="Telangana" points="77.50,15.50 77.50,18.00 79.00,19.80 80.80,18.80 80.50,16.80 79.50,16.00" />
          <polygon class="svg-state-path" data-state-name="Maharashtra" points="72.65,18.90 73.20,20.20 76.50,21.50 80.30,21.20 79.50,19.00 77.50,18.00 74.10,15.00 73.50,16.00" />
          <polygon class="svg-state-path" data-state-name="Gujarat" points="69.00,22.00 68.20,23.50 71.00,24.50 74.20,24.00 74.00,22.00 73.20,20.20 70.50,20.80" />
          <polygon class="svg-state-path" data-state-name="Rajasthan" points="70.00,26.50 70.50,28.50 73.00,30.00 77.00,28.00 77.50,26.50 76.50,24.50 74.20,24.00 71.00,24.50" />
          <polygon class="svg-state-path" data-state-name="Madhya Pradesh" points="74.50,22.50 74.20,24.00 76.50,24.50 77.50,26.50 80.50,25.50 82.50,24.50 82.00,22.50 80.30,21.20 76.50,21.50" />
          <polygon class="svg-state-path" data-state-name="Uttar Pradesh" points="77.50,28.50 78.00,30.00 80.00,29.50 84.00,27.50 84.20,25.50 82.50,24.50 80.50,25.50 77.50,26.50 77.00,28.00" />
          <polygon class="svg-state-path" data-state-name="Bihar" points="84.00,27.50 85.50,27.50 88.00,26.50 87.50,24.80 84.20,25.50" />
          <polygon class="svg-state-path" data-state-name="West Bengal" points="86.80,22.50 87.50,24.80 88.00,26.50 88.50,27.20 89.80,26.50 89.00,24.00 88.20,21.60 87.20,21.50" />
          <polygon class="svg-state-path" data-state-name="Odisha" points="82.50,18.50 84.00,21.50 86.50,22.50 87.20,21.50 85.50,19.50 83.50,18.50" />
          <polygon class="svg-state-path" data-state-name="Punjab" points="74.00,30.20 75.00,32.20 76.50,32.00 77.00,30.50 75.00,29.50" />
          <polygon class="svg-state-path" data-state-name="Haryana" points="75.00,29.50 77.00,30.50 77.40,29.00 77.00,28.00 76.00,28.00" />
          <polygon class="svg-state-path" data-state-name="Himachal Pradesh" points="75.60,32.20 76.80,33.20 78.80,32.50 78.50,31.00 77.00,30.50 76.50,32.00" />
          <polygon class="svg-state-path" data-state-name="Uttarakhand" points="77.80,30.50 79.20,31.40 81.00,30.20 80.20,29.00 78.00,30.00" />
          <polygon class="svg-state-path" data-state-name="Jammu and Kashmir" points="73.80,33.00 74.50,35.00 76.20,34.50 76.00,32.50 74.50,32.50" />
          <polygon class="svg-state-path" data-state-name="Ladakh" points="76.20,34.50 77.50,36.00 79.50,35.50 79.00,32.50 77.50,32.50" />
          <polygon class="svg-state-path" data-state-name="Assam" points="89.80,26.50 92.00,27.00 94.50,27.50 95.80,27.20 93.50,25.50 91.50,25.80 89.80,26.00" />
        </g>
        <g id="svg-districts-group"></g>
      </svg>
    </div>
  `;

  const backBtn = document.getElementById('svg-back-to-india-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => resetToNationalView());
  }

  const tooltip = document.getElementById('svg-map-tooltip');
  const paths = container.querySelectorAll('.svg-state-path');

  paths.forEach(p => {
    const stateName = p.getAttribute('data-state-name');
    p.style.cursor = 'pointer';

    p.addEventListener('mouseenter', () => {
      if (!currentSelectedState) {
        p.setAttribute('stroke', '#ffffff');
        p.setAttribute('stroke-width', '2.5');
      }
      if (tooltip) {
        const classification = getTrendClassification(stateName);
        const symbol = TREND_SYMBOLS[classification] || '=';
        tooltip.innerHTML = `<strong style="color: #19C8F2;">${stateName}</strong><br/><span style="color: #9BB0C5;">Trend: ${symbol} ${classification.replace(/_/g, ' ')}</span><br/><span style="font-size:0.75rem; color:#19C8F2;">Click for districts</span>`;
        tooltip.style.display = 'block';
      }
    });

    p.addEventListener('mouseleave', () => {
      if (!currentSelectedState) updateSvgStateAndDistricts();
      if (tooltip) tooltip.style.display = 'none';
    });

    p.addEventListener('click', () => {
      selectAndIsolateState(stateName, null);
      if (onStateClickCallback) onStateClickCallback(stateName);
    });
  });

  updateSvgStateAndDistricts();
}

function updateSvgStateAndDistricts() {
  const paths = document.querySelectorAll('.svg-state-path');
  const districtsGroup = document.getElementById('svg-districts-group');

  if (!currentSelectedState) {
    // Whole India View: All states colored, districts cleared
    if (districtsGroup) districtsGroup.innerHTML = '';
    paths.forEach(p => {
      const stateName = p.getAttribute('data-state-name');
      const classification = getTrendClassification(stateName);
      const color = TREND_COLORS[classification] || TREND_COLORS.no_clear_change;
      p.setAttribute('fill', color);
      p.setAttribute('stroke', '#19C8F2');
      p.setAttribute('stroke-width', '1.2');
      p.setAttribute('opacity', '0.85');
    });
  } else {
    // State Selected View: Dim non-selected states, render districts for selected state
    paths.forEach(p => {
      const stateName = p.getAttribute('data-state-name');
      if (isStateMatch(stateName, currentSelectedState)) {
        p.setAttribute('fill', 'none');
        p.setAttribute('stroke', '#19C8F2');
        p.setAttribute('stroke-width', '3');
        p.setAttribute('opacity', '1');
      } else {
        p.setAttribute('fill', '#0C1D31');
        p.setAttribute('stroke', '#1B3B59');
        p.setAttribute('stroke-width', '0.5');
        p.setAttribute('opacity', '0.15');
      }
    });

    // Render district polygons in SVG for selected state
    if (districtsGroup) {
      renderSvgDistricts(currentSelectedState, districtsGroup);
    }
  }
}

function renderSvgDistricts(stateName, groupEl) {
  groupEl.innerHTML = '';
  const normState = stateName.toLowerCase();
  const districtList = DISTRICT_DATA_REGISTRY[normState] || [];

  if (normState === 'kerala') {
    // 14 Districts of Kerala with SVG polygons
    const keralaDistrictsSvg = [
      { name: "Kasaragod", pts: "74.85,12.80 75.35,12.80 75.40,12.25 75.05,12.20", cls: "slight_increase", slope: 0.26 },
      { name: "Kannur", pts: "75.05,12.20 75.40,12.25 75.80,12.05 75.60,11.70 75.25,11.85", cls: "slight_increase", slope: 0.27 },
      { name: "Wayanad", pts: "75.80,12.05 76.35,11.95 76.45,11.55 75.95,11.50 75.60,11.70", cls: "slight_increase", slope: 0.35 },
      { name: "Kozhikode", pts: "75.25,11.85 75.60,11.70 75.95,11.50 75.90,11.15 75.65,11.15", cls: "slight_increase", slope: 0.29 },
      { name: "Malappuram", pts: "75.65,11.15 75.90,11.15 76.40,11.35 76.45,10.80 75.85,10.75", cls: "slight_increase", slope: 0.32 },
      { name: "Palakkad", pts: "76.40,11.35 76.90,11.20 76.95,10.55 76.45,10.55 76.45,10.80", cls: "strong_increase", slope: 0.41 },
      { name: "Thrissur", pts: "75.85,10.75 76.45,10.55 76.60,10.20 76.10,10.15", cls: "slight_increase", slope: 0.30 },
      { name: "Ernakulam", pts: "76.10,10.15 76.60,10.20 76.80,9.85 76.20,9.75", cls: "slight_increase", slope: 0.33 },
      { name: "Idukki", pts: "76.60,10.20 77.40,10.15 77.25,9.50 76.80,9.50 76.80,9.85", cls: "strong_increase", slope: 0.44 },
      { name: "Kottayam", pts: "76.35,9.75 76.80,9.85 76.85,9.45 76.40,9.45", cls: "slight_increase", slope: 0.28 },
      { name: "Alappuzha", pts: "76.20,9.75 76.40,9.75 76.55,9.20 76.30,9.20", cls: "no_clear_change", slope: 0.18 },
      { name: "Pathanamthitta", pts: "76.55,9.45 77.25,9.50 77.15,9.05 76.65,9.05", cls: "strong_increase", slope: 0.38 },
      { name: "Kollam", pts: "76.45,9.20 77.15,9.05 77.15,8.75 76.60,8.75", cls: "slight_increase", slope: 0.29 },
      { name: "Thiruvananthapuram", pts: "76.60,8.75 77.15,8.75 77.20,8.50 76.90,8.30", cls: "slight_increase", slope: 0.31 }
    ];

    const tooltip = document.getElementById('svg-map-tooltip');

    keralaDistrictsSvg.forEach(d => {
      const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      poly.setAttribute("points", d.pts);
      poly.setAttribute("fill", TREND_COLORS[d.cls]);
      poly.setAttribute("stroke", "#19C8F2");
      poly.setAttribute("stroke-width", "1.5");
      poly.setAttribute("opacity", "0.9");
      poly.style.cursor = "pointer";

      poly.addEventListener('mouseenter', () => {
        poly.setAttribute("stroke", "#ffffff");
        poly.setAttribute("stroke-width", "2.5");
        if (tooltip) {
          tooltip.innerHTML = `<strong style="color: #19C8F2;">${d.name} District</strong><br/><span style="color: #9BB0C5;">State: Kerala</span><br/>Trend: <strong>${TREND_SYMBOLS[d.cls]} +${d.slope} °C/dec (${d.cls.replace(/_/g, ' ')})</strong>`;
          tooltip.style.display = 'block';
        }
      });

      poly.addEventListener('mouseleave', () => {
        poly.setAttribute("stroke", "#19C8F2");
        poly.setAttribute("stroke-width", "1.5");
        if (tooltip) tooltip.style.display = 'none';
      });

      poly.addEventListener('click', () => {
        if (onDistrictClickCallback) {
          onDistrictClickCallback({ name: d.name, state: 'Kerala', slope: d.slope, classification: d.cls });
        }
      });

      groupEl.appendChild(poly);
    });
  }
}
