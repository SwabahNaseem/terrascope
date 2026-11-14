/**
 * TerraScope Map Module
 * Handles Leaflet map rendering, state GeoJSON boundaries, choropleth styling, and zoom.
 */

let mapInstance = null;
let geojsonLayer = null;

const INDIA_CENTER = [22.5937, 78.9629];
const DEFAULT_ZOOM = 5;

/**
 * Initialize Leaflet Map
 * @param {string} containerId - Element ID for map container
 * @param {Function} onStateClick - Callback when state polygon is clicked
 */
export function initMap(containerId, onStateClick) {
  if (typeof L === 'undefined') {
    console.warn('[TerraScope] Leaflet library not loaded.');
    return null;
  }

  mapInstance = L.map(containerId, {
    center: INDIA_CENTER,
    zoom: DEFAULT_ZOOM,
    minZoom: 4,
    maxZoom: 9
  });

  // Base tile layer (light subtle style)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(mapInstance);

  // Load India States GeoJSON
  loadIndiaGeoJSON(onStateClick);

  return mapInstance;
}

/**
 * Loads India state boundaries from assets
 */
function loadIndiaGeoJSON(onStateClick) {
  fetch('assets/geo/india_states.geojson')
    .then(res => res.json())
    .then(data => {
      geojsonLayer = L.geoJSON(data, {
        style: defaultStateStyle,
        onEachFeature: (feature, layer) => {
          layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight,
            click: (e) => {
              if (onStateClick) {
                onStateClick(feature.properties.NAME_1 || feature.properties.name);
              }
            }
          });
        }
      }).addTo(mapInstance);
    })
    .catch(err => console.warn('[TerraScope] GeoJSON placeholder or fetch notice:', err.message));
}

function defaultStateStyle() {
  return {
    fillColor: '#D9D2BF',
    weight: 1.5,
    opacity: 1,
    color: '#FAF6EC',
    fillOpacity: 0.85
  };
}

function highlightFeature(e) {
  const layer = e.target;
  layer.setStyle({
    weight: 2.5,
    color: '#2F5D3A',
    fillOpacity: 0.95
  });
}

function resetHighlight(e) {
  if (geojsonLayer) {
    geojsonLayer.resetStyle(e.target);
  }
}

/**
 * Focus and zoom map to a specific state
 * @param {string} stateName
 */
export function zoomToState(stateName) {
  console.log(`[TerraScope] Zooming map to state: ${stateName}`);
  // Stub: Will calculate state bounding box and flyToBounds
}
