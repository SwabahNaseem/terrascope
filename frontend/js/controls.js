/**
 * TerraScope Controls Module
 * Coordinates environmental variable selection, guardrails, start/end dates,
 * aggregation intervals, compare mode, and analysis submit triggers.
 */

let isCurrentlyLoading = false;

/**
 * Initialize Control Inputs and Action Handlers
 * @param {Object} callbacks
 * @param {Function} callbacks.onTrendRequested - Triggered on "Show Trend" button click
 * @param {Function} [callbacks.onVariableChange] - Triggered when variable selection changes
 * @param {Function} [callbacks.onCompareToggle] - Triggered when compare mode is toggled
 */
export function initControls({ onTrendRequested, onVariableChange, onCompareToggle } = {}) {
  const btnShowTrend = document.getElementById('btn-show-trend');
  const variableCheckboxes = document.querySelectorAll('input[name="variable"]');
  const startYearInput = document.getElementById('start-year-select');
  const endYearInput = document.getElementById('end-year-select');
  const aggregationSelect = document.getElementById('aggregation-select');

  // 1. Variable selection guardrail: At least one variable must remain checked
  variableCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', (e) => {
      const checkedBoxes = document.querySelectorAll('input[name="variable"]:checked');
      if (checkedBoxes.length === 0) {
        // Prevent unchecking the last remaining variable
        e.target.checked = true;
        flashWarning(e.target.closest('label'), 'At least one environmental variable must be selected.');
      }

      if (onVariableChange) {
        onVariableChange(getSelectedVariables());
      }
    });
  });

  // 2. Start Year input validation (range: 1981 - 2024)
  if (startYearInput) {
    startYearInput.setAttribute('min', '1981');
    startYearInput.setAttribute('max', '2024');

    startYearInput.addEventListener('change', () => {
      let val = parseInt(startYearInput.value, 10);
      if (isNaN(val) || val < 1981) val = 1981;
      if (val > 2024) val = 2024;
      startYearInput.value = val;

      if (endYearInput) {
        let endVal = parseInt(endYearInput.value, 10);
        if (!isNaN(endVal) && endVal <= val) {
          endYearInput.value = Math.min(2025, val + 1);
        }
      }
    });
  }

  // 3. End Year input validation (range: 1982 - 2025)
  if (endYearInput) {
    endYearInput.removeAttribute('disabled');
    endYearInput.setAttribute('type', 'number');
    endYearInput.setAttribute('min', '1982');
    endYearInput.setAttribute('max', '2025');
    if (!endYearInput.value || isNaN(parseInt(endYearInput.value, 10))) {
      endYearInput.value = '2024';
    }

    endYearInput.addEventListener('change', () => {
      let val = parseInt(endYearInput.value, 10);
      if (isNaN(val) || val < 1982) val = 1982;
      if (val > 2025) val = 2025;

      if (startYearInput) {
        let startVal = parseInt(startYearInput.value, 10);
        if (!isNaN(startVal) && val <= startVal) {
          val = Math.min(2025, startVal + 1);
        }
      }
      endYearInput.value = val;
    });
  }

  // 4. Compare Mode toggle check (dynamically inject if not present in DOM)
  ensureCompareModeToggle(onCompareToggle);

  // 5. Submit trigger
  if (btnShowTrend) {
    btnShowTrend.addEventListener('click', () => {
      if (isCurrentlyLoading) return;
      if (onTrendRequested) {
        onTrendRequested(getSelectedOptions());
      }
    });
  }
}

/**
 * Reads user selections from control card
 * @returns {Object} Selected options
 */
export function getSelectedOptions() {
  const selectedVariables = getSelectedVariables();
  const startYearInput = document.getElementById('start-year-select');
  const endYearInput = document.getElementById('end-year-select');
  const aggregationSelect = document.getElementById('aggregation-select');
  const compareToggle = document.getElementById('compare-mode-toggle');

  let startYear = parseInt(startYearInput?.value || '2000', 10);
  if (isNaN(startYear) || startYear < 1981) startYear = 1981;
  if (startYear > 2024) startYear = 2024;

  let endYear = parseInt(endYearInput?.value || '2024', 10);
  if (isNaN(endYear) || endYear < 1982) endYear = 1982;
  if (endYear > 2025) endYear = 2025;
  if (endYear <= startYear) endYear = Math.min(2025, startYear + 1);

  const aggregation = aggregationSelect?.value || 'yearly';
  const compareMode = compareToggle ? compareToggle.checked : false;

  return {
    variables: selectedVariables.length > 0 ? selectedVariables : ['temperature'],
    startYear: startYear,
    endYear: endYear,
    aggregation: aggregation,
    compareMode: compareMode
  };
}

/**
 * Gets array of checked variable names
 * @returns {string[]}
 */
export function getSelectedVariables() {
  const variableCheckboxes = document.querySelectorAll('input[name="variable"]:checked');
  return Array.from(variableCheckboxes).map(cb => cb.value);
}

/**
 * Updates loading state of the Show Trend button
 * @param {boolean} isLoading
 */
export function setControlsLoading(isLoading) {
  isCurrentlyLoading = isLoading;
  const btnShowTrend = document.getElementById('btn-show-trend');
  if (!btnShowTrend) return;

  if (isLoading) {
    btnShowTrend.disabled = true;
    btnShowTrend.style.opacity = '0.75';
    btnShowTrend.style.cursor = 'not-allowed';
    btnShowTrend.innerHTML = `
      <span style="display: inline-block; width: 14px; height: 14px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 6px; vertical-align: middle;"></span>
      Analyzing...
    `;

    // Ensure CSS animation exists
    if (!document.getElementById('spin-keyframes-style')) {
      const style = document.createElement('style');
      style.id = 'spin-keyframes-style';
      style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
      document.head.appendChild(style);
    }
  } else {
    btnShowTrend.disabled = false;
    btnShowTrend.style.opacity = '1';
    btnShowTrend.style.cursor = 'pointer';
    btnShowTrend.innerHTML = 'Show Trend';
  }
}

/**
 * Injects a Compare Shapes checkbox if not already present in the sidebar controls
 */
function ensureCompareModeToggle(onCompareToggle) {
  if (document.getElementById('compare-mode-toggle')) return;

  const sidebar = document.querySelector('.sidebar-controls');
  const btnShowTrend = document.getElementById('btn-show-trend');

  if (sidebar && btnShowTrend) {
    const compareGroup = document.createElement('div');
    compareGroup.className = 'control-group';
    compareGroup.style.marginTop = '4px';
    compareGroup.innerHTML = `
      <label class="checkbox-item" style="cursor: pointer;" title="Normalize curves to 0-1 scale to compare timing and trajectory shapes">
        <input type="checkbox" id="compare-mode-toggle">
        <span>Compare Shapes (0–1 scale)</span>
      </label>
    `;

    sidebar.insertBefore(compareGroup, btnShowTrend);

    const toggle = compareGroup.querySelector('#compare-mode-toggle');
    if (toggle && onCompareToggle) {
      toggle.addEventListener('change', (e) => {
        onCompareToggle(e.target.checked);
      });
    }
  }
}

/**
 * Visual micro-interaction when user violates guardrail
 */
function flashWarning(element, message) {
  if (!element) return;
  element.style.transition = 'transform 0.1s, color 0.2s';
  element.style.transform = 'translateX(4px)';
  element.style.color = 'var(--accent, #C8643B)';

  setTimeout(() => {
    element.style.transform = 'translateX(-4px)';
  }, 100);

  setTimeout(() => {
    element.style.transform = 'translateX(0)';
    element.style.color = '';
  }, 250);
}
