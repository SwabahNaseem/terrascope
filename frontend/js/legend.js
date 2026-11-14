/**
 * TerraScope Accessible Legend Component
 * Manages direction-of-change dual-encoding visual representation (symbols + colors),
 * keyboard accessibility, and interactive hover filtering across choropleth polygons.
 */

const LEGEND_ITEMS = [
  { key: 'strong_increase', label: 'Strong increase', symbol: '▲▲', color: 'var(--trend-strong-inc, #A8461F)' },
  { key: 'slight_increase', label: 'Slight increase', symbol: '▲',  color: 'var(--trend-slight-inc, #E3A27F)' },
  { key: 'no_clear_change', label: 'No clear change', symbol: '=',  color: 'var(--trend-neutral, #D9D2BF)', textColor: '#333' },
  { key: 'slight_decrease', label: 'Slight decrease', symbol: '▼',  color: 'var(--trend-slight-dec, #B7C7A3)' },
  { key: 'strong_decrease', label: 'Strong decrease', symbol: '▼▼', color: 'var(--trend-strong-dec, #2F5D3A)' }
];

let activeFilterLock = null;

/**
 * Initialize Interactive Map Legend
 * @param {string} legendContainerId - DOM element ID of the legend overlay
 * @param {Object} [callbacks]
 * @param {Function} [callbacks.onHoverFilter] - Called when a legend tier is hovered / focused
 * @param {Function} [callbacks.onHoverReset] - Called when hover / focus ends
 */
export function initLegend(legendContainerId, { onHoverFilter, onHoverReset } = {}) {
  const legendEl = document.getElementById(legendContainerId);
  if (!legendEl) {
    console.warn(`[TerraScope Legend] Container #${legendContainerId} not found.`);
    return;
  }

  // Ensure accessible ARIA role and label
  legendEl.setAttribute('role', 'region');
  legendEl.setAttribute('aria-label', 'Direction of change map legend');

  // Populate or attach to items in the legend
  const existingItems = legendEl.querySelectorAll('.legend-item');
  if (existingItems.length > 0) {
    // Bind to existing DOM items
    existingItems.forEach((itemEl, index) => {
      const config = LEGEND_ITEMS[index] || { key: 'no_clear_change' };
      setupLegendItemInteractions(itemEl, config.key, { onHoverFilter, onHoverReset });
    });
  } else {
    // Dynamically render legend items
    legendEl.innerHTML = `<h4>Direction of Change</h4>`;
    LEGEND_ITEMS.forEach((item) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'legend-item';
      itemEl.innerHTML = `
        <span class="legend-swatch" style="background-color: ${item.color}; color: ${item.textColor || '#fff'};">${item.symbol}</span>
        <span>${item.label}</span>
      `;
      setupLegendItemInteractions(itemEl, item.key, { onHoverFilter, onHoverReset });
      legendEl.appendChild(itemEl);
    });
  }

  // Reset filter when mouse leaves legend card
  legendEl.addEventListener('mouseleave', () => {
    if (!activeFilterLock && onHoverReset) {
      onHoverReset();
    }
  });
}

function setupLegendItemInteractions(itemEl, classKey, { onHoverFilter, onHoverReset }) {
  itemEl.setAttribute('tabindex', '0');
  itemEl.setAttribute('role', 'button');
  itemEl.setAttribute('aria-label', `Filter map by ${classKey.replace(/_/g, ' ')}`);
  itemEl.style.cursor = 'pointer';
  itemEl.style.transition = 'background-color 0.15s, transform 0.1s';
  itemEl.style.borderRadius = '4px';
  itemEl.style.padding = '2px 4px';

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
      // Clear visual state on sibling items
      const parent = itemEl.parentElement;
      if (parent) {
        parent.querySelectorAll('.legend-item').forEach(el => unhighlightLegendItem(el));
      }
      highlightLegendItem(itemEl);
      itemEl.style.outline = '2px solid var(--primary, #2F5D3A)';
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
  itemEl.style.backgroundColor = 'var(--bg-card-hover, #E7DDCA)';
  itemEl.style.transform = 'translateX(2px)';
}

function unhighlightLegendItem(itemEl) {
  itemEl.style.backgroundColor = 'transparent';
  itemEl.style.transform = 'none';
  itemEl.style.outline = 'none';
}
