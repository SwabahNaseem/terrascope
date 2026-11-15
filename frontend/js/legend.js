/**
 * TerraScope Accessible Legend Component
 * Manages direction-of-change dual-encoding visual representation (symbols + colors),
 * dynamic legend updates matching selected environmental variables,
 * keyboard accessibility, and interactive hover filtering across choropleth polygons.
 */

export const LEGEND_ITEMS = [
  { key: 'strong_increase', label: 'Strong increase', symbol: '▲▲', color: '#D9480F', textColor: '#FFFFFF' },
  { key: 'slight_increase', label: 'Slight increase', symbol: '▲',  color: '#F76707', textColor: '#FFFFFF' },
  { key: 'no_clear_change', label: 'No clear change', symbol: '=',  color: '#868E96', textColor: '#FFFFFF' },
  { key: 'slight_decrease', label: 'Slight decrease', symbol: '▼',  color: '#20C997', textColor: '#FFFFFF' },
  { key: 'strong_decrease', label: 'Strong decrease', symbol: '▼▼', color: '#087F5B', textColor: '#FFFFFF' }
];

const VARIABLE_METADATA = {
  temperature: {
    title: 'Temperature Trend',
    unit: '°C / decade',
    metric: 'Air Temperature at 2m (T2M)'
  },
  precipitation: {
    title: 'Precipitation Trend',
    unit: 'mm / decade',
    metric: 'Rainfall / GPM Precipitation'
  },
  soil_moisture: {
    title: 'Soil Moisture Trend',
    unit: 'fraction / decade',
    metric: 'Surface Soil Wetness (0–1)'
  },
  water_surface: {
    title: 'Water Surface Trend',
    unit: 'fraction / decade',
    metric: 'Surface Water Index Proxy'
  }
};

let activeFilterLock = null;
let currentLegendContainerId = null;
let currentCallbacks = {};
let currentVariable = 'temperature';

/**
 * Initialize Interactive Map Legend
 * @param {string} legendContainerId - DOM element ID of the legend overlay
 * @param {Object} [callbacks]
 * @param {Function} [callbacks.onHoverFilter] - Called when a legend tier is hovered / focused
 * @param {Function} [callbacks.onHoverReset] - Called when hover / focus ends
 */
export function initLegend(legendContainerId, callbacks = {}) {
  currentLegendContainerId = legendContainerId;
  currentCallbacks = callbacks;

  const legendEl = document.getElementById(legendContainerId);
  if (!legendEl) {
    console.warn(`[TerraScope Legend] Container #${legendContainerId} not found.`);
    return;
  }

  // Ensure accessible ARIA role and label
  legendEl.setAttribute('role', 'region');
  legendEl.setAttribute('aria-label', 'Direction of change environmental map legend');

  renderLegendContent(legendEl, currentVariable);

  // Reset filter when mouse leaves legend card
  legendEl.addEventListener('mouseleave', () => {
    if (!activeFilterLock && currentCallbacks.onHoverReset) {
      currentCallbacks.onHoverReset();
    }
  });
}

/**
 * Updates the legend title, units, and representation according to the selected environmental variable
 * @param {string} variableKey - Variable identifier ('temperature', 'precipitation', 'soil_moisture', 'water_surface')
 * @param {Object} [options] - Additional display options
 */
export function updateLegend(variableKey, options = {}) {
  currentVariable = variableKey || 'temperature';
  if (!currentLegendContainerId) return;

  const legendEl = document.getElementById(currentLegendContainerId);
  if (!legendEl) return;

  activeFilterLock = null;
  renderLegendContent(legendEl, currentVariable, options);
}

/**
 * Renders the HTML structure of the legend with active variable metadata
 */
function renderLegendContent(legendEl, variableKey, options = {}) {
  const meta = VARIABLE_METADATA[variableKey] || {
    title: `${variableKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Trend`,
    unit: 'rate / decade',
    metric: variableKey
  };

  const titleText = options.title || meta.title;
  const unitText = options.unit || meta.unit;

  legendEl.innerHTML = `
    <div class="legend-header" style="margin-bottom: 6px;">
      <h4 style="margin: 0; font-size: 0.88rem; color: #FFDF79; display: flex; justify-content: space-between; align-items: center;">
        <span>${escapeHtml(titleText)}</span>
        <span style="font-size: 0.72rem; opacity: 0.85; font-weight: normal; color: #D6CCA9;">${escapeHtml(unitText)}</span>
      </h4>
    </div>
    <div class="legend-items-wrapper"></div>
  `;

  const wrapper = legendEl.querySelector('.legend-items-wrapper');

  LEGEND_ITEMS.forEach((item) => {
    const itemEl = document.createElement('div');
    itemEl.className = 'legend-item';
    itemEl.innerHTML = `
      <span class="legend-swatch" style="background-color: ${item.color}; color: ${item.textColor || '#fff'}; font-weight: bold; border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 18px; font-size: 0.72rem;">${item.symbol}</span>
      <span style="font-size: 0.82rem; margin-left: 6px; color: #E6EAE1;">${item.label}</span>
    `;
    setupLegendItemInteractions(itemEl, item.key, currentCallbacks);
    wrapper.appendChild(itemEl);
  });
}

function setupLegendItemInteractions(itemEl, classKey, { onHoverFilter, onHoverReset }) {
  itemEl.setAttribute('tabindex', '0');
  itemEl.setAttribute('role', 'button');
  itemEl.setAttribute('aria-label', `Filter map by ${classKey.replace(/_/g, ' ')}`);
  itemEl.style.cursor = 'pointer';
  itemEl.style.transition = 'background-color 0.15s, transform 0.1s';
  itemEl.style.borderRadius = '4px';
  itemEl.style.padding = '3px 5px';
  itemEl.style.display = 'flex';
  itemEl.style.alignItems = 'center';

  // Hover events
  itemEl.addEventListener('mouseenter', () => {
    if (activeFilterLock && activeFilterLock !== classKey) return;
    highlightLegendItem(itemEl);
    if (onHoverFilter) onHoverFilter(classKey);
  });

  itemEl.addEventListener('mouseleave', () => {
    if (!activeFilterLock) {
      unhighlightLegendItem(itemEl);
      if (onHoverReset) onHoverReset();
    }
  });

  // Focus events for keyboard navigation
  itemEl.addEventListener('focus', () => {
    highlightLegendItem(itemEl);
    if (onHoverFilter) onHoverFilter(classKey);
  });

  itemEl.addEventListener('blur', () => {
    if (!activeFilterLock) {
      unhighlightLegendItem(itemEl);
      if (onHoverReset) onHoverReset();
    }
  });

  // Click / Enter / Space to toggle filter lock
  const toggleLock = () => {
    if (activeFilterLock === classKey) {
      activeFilterLock = null;
      unhighlightLegendItem(itemEl);
      if (onHoverReset) onHoverReset();
    } else {
      activeFilterLock = classKey;
      const parent = itemEl.parentElement;
      if (parent) {
        parent.querySelectorAll('.legend-item').forEach(el => unhighlightLegendItem(el));
      }
      highlightLegendItem(itemEl);
      itemEl.style.outline = '2px solid #FFDF79';
      if (onHoverFilter) onHoverFilter(classKey);
    }
  };

  itemEl.addEventListener('click', toggleLock);
  itemEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleLock();
    }
  });
}

function highlightLegendItem(itemEl) {
  itemEl.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
  itemEl.style.transform = 'translateX(2px)';
}

function unhighlightLegendItem(itemEl) {
  itemEl.style.backgroundColor = 'transparent';
  itemEl.style.transform = 'none';
  itemEl.style.outline = 'none';
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
