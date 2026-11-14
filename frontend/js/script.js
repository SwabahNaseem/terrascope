/**
 * TerraScope - Frontend Coordinator
 * Main application bootstrapping, event mediation, and module wiring.
 */

import { initMap, zoomToState } from './map.js';
import { initSearch } from './search.js';
import { initControls, getSelectedOptions } from './controls.js';
import { renderChart, updateChartData } from './charts.js';
import { initLegend } from './legend.js';
import { renderSummaryCard, renderSignificanceDrawer } from './report.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('[TerraScope] Initializing Earth System Trend Detective (India Edition)...');

  // Initialize Map with India Bounds
  const map = initMap('map-view', (stateName) => {
    handleStateSelection(stateName);
  });

  // Initialize Search & Autocomplete
  initSearch('location-search-input', 'search-results-dropdown', (selectedLocation) => {
    console.log('[TerraScope] Location selected via search:', selectedLocation);
    if (selectedLocation.type === 'state') {
      zoomToState(selectedLocation.name);
      handleStateSelection(selectedLocation.name);
    }
  });

  // Initialize Controls
  initControls({
    onTrendRequested: () => {
      const options = getSelectedOptions();
      console.log('[TerraScope] Trend analysis requested with options:', options);
    }
  });

  // Initialize Map Legend
  initLegend('map-legend');
});

/**
 * Handle state selection and trigger view updates
 */
function handleStateSelection(stateName) {
  console.log(`[TerraScope] State selected: ${stateName}`);
  const stateStage = document.getElementById('state-analysis-stage');
  if (stateStage) {
    stateStage.classList.add('active');
  }

  // Foundational trigger for Phase 1 milestone
  renderSummaryCard(stateName, 'Air Temperature', 0.3, true);
}
