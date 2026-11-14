/**
 * TerraScope Controls Module
 * Coordinates variable multi-select, start/end dates, aggregation interval, and submit triggers.
 */

export function initControls({ onTrendRequested }) {
  const btnShowTrend = document.getElementById('btn-show-trend');
  if (btnShowTrend) {
    btnShowTrend.addEventListener('click', () => {
      if (onTrendRequested) {
        onTrendRequested();
      }
    });
  }
}

/**
 * Reads user selections from control card
 * @returns {Object} Selected options
 */
export function getSelectedOptions() {
  const variableCheckboxes = document.querySelectorAll('input[name="variable"]:checked');
  const selectedVariables = Array.from(variableCheckboxes).map(cb => cb.value);

  const startYear = document.getElementById('start-year-select')?.value || '2000';
  const endYear = 'latest';
  const aggregation = document.getElementById('aggregation-select')?.value || 'yearly';

  return {
    variables: selectedVariables,
    startYear: parseInt(startYear, 10),
    endYear: endYear,
    aggregation: aggregation
  };
}
