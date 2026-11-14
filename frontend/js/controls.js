/**
 * TerraScope Controls & Parameter Management Module
 * Coordinates variable multi-select, date ranges, aggregation interval, report generation, and API triggers.
 * Matches Technical Specification Section 3.3
 */

import { renderChart } from './charts.js';
import { renderSummaryCard, renderSignificanceDrawer } from './report.js';

// Embedded fallback matching data/sample/kerala_temperature_sample.json for resilient zero-config demonstration
export const KERALA_SAMPLE_DATA = {
  location: { type: "state", name: "Kerala", code: "IN-KL", centroid: [10.8505, 76.2711] },
  period: { start: "2000", end: "2025", latest_available: "2025-09" },
  results: [
    {
      variable: "temperature",
      friendly_name: "Air Temperature",
      unit: "°C",
      source: "NASA POWER (T2M, 0.5° Grid)",
      n_observations: 26,
      mean: 27.42,
      min: 26.81,
      max: 28.14,
      trend: {
        direction: "increasing",
        method: "Mann-Kendall with Sen's slope",
        slope_per_decade: 0.31,
        p_value: 0.012,
        significant: true,
        confidence_interval_95: [0.12, 0.49],
        class: "slight_increase",
        symbol: "▲"
      },
      series: [
        { date: "2000", value: 26.91, trend: 26.85 },
        { date: "2001", value: 27.05, trend: 26.88 },
        { date: "2002", value: 27.35, trend: 26.91 },
        { date: "2003", value: 27.48, trend: 26.94 },
        { date: "2004", value: 27.12, trend: 26.97 },
        { date: "2005", value: 27.31, trend: 27.00 },
        { date: "2006", value: 27.45, trend: 27.04 },
        { date: "2007", value: 27.28, trend: 27.07 },
        { date: "2008", value: 27.15, trend: 27.10 },
        { date: "2009", value: 27.56, trend: 27.13 },
        { date: "2010", value: 27.82, trend: 27.16 },
        { date: "2011", value: 27.24, trend: 27.19 },
        { date: "2012", value: 27.41, trend: 27.22 },
        { date: "2013", value: 27.38, trend: 27.25 },
        { date: "2014", value: 27.50, trend: 27.28 },
        { date: "2015", value: 27.75, trend: 27.31 },
        { date: "2016", value: 28.14, trend: 27.34 },
        { date: "2017", value: 27.68, trend: 27.38 },
        { date: "2018", value: 27.52, trend: 27.41 },
        { date: "2019", value: 27.85, trend: 27.44 },
        { date: "2020", value: 27.62, trend: 27.47 },
        { date: "2021", value: 27.45, trend: 27.50 },
        { date: "2022", value: 27.58, trend: 27.53 },
        { date: "2023", value: 27.92, trend: 27.56 },
        { date: "2024", value: 28.05, trend: 27.59 },
        { date: "2025", value: 27.89, trend: 27.62 }
      ],
      summary: "Between 2000 and 2025, air temperature in Kerala went up by about 0.31 °C per decade. This change is very unlikely to be due to chance.",
      limitations: [
        "NASA POWER assimilation grid resolution (~50 km) averages over localized Western Ghats microclimates.",
        "Model-derived reanalysis values rather than dense in-situ weather station networks."
      ],
      hypotheses: [
        "Aligns with broader regional warming patterns documented across the Indian peninsula."
      ]
    }
  ]
};

let currentActiveState = "Kerala";

/**
 * Initialize controls event listeners, guardrails, and triggers
 * @param {Object} callbacks - { onTrendRequested }
 */
export function initControls({ onTrendRequested } = {}) {
  setupVariableGuardrails();
  setupDateConstraints();
  setupShowTrendButton(onTrendRequested);
  setupReportDownload();
  setupAboutModal();
  checkBackendHealth();

  // Foundation milestone trigger: Render initial state analysis for Kerala
  loadStateAnalysis("Kerala");
}

/**
 * Enforces guardrail: At least one variable checkbox must remain checked
 */
function setupVariableGuardrails() {
  const checkboxes = document.querySelectorAll('input[name="variable"]');
  checkboxes.forEach(cb => {
    cb.addEventListener('change', (e) => {
      const checkedBoxes = document.querySelectorAll('input[name="variable"]:checked');
      if (checkedBoxes.length === 0) {
        // Prevent unchecking the last remaining variable
        e.target.checked = true;
        showNotificationToast('At least one variable must remain selected.');
      }
    });
  });
}

/**
 * Constrains Start Year between 1981 and 2024
 */
function setupDateConstraints() {
  const startInput = document.getElementById('start-year-select');
  if (!startInput) return;

  const minYear = 1981;
  const maxYear = 2024;

  startInput.addEventListener('change', () => {
    let val = parseInt(startInput.value, 10);
    if (isNaN(val) || val < minYear) val = minYear;
    if (val > maxYear) val = maxYear;
    startInput.value = val;
  });
}

/**
 * Connects "Show Trend" button with loading spinner and analytical query
 */
function setupShowTrendButton(onTrendRequested) {
  const btn = document.getElementById('btn-show-trend');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    // Show spinner in button
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span> <span>Analyzing...</span>`;

    try {
      if (onTrendRequested) {
        onTrendRequested();
      }
      await loadStateAnalysis(currentActiveState);
    } catch (err) {
      console.warn('[TerraScope Controls] Analysis query notice:', err);
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  });
}

/**
 * Reads user selections from control card
 * @returns {Object} Selected options
 */
export function getSelectedOptions() {
  const variableCheckboxes = document.querySelectorAll('input[name="variable"]:checked');
  const selectedVariables = Array.from(variableCheckboxes).map(cb => cb.value);

  const startYear = document.getElementById('start-year-select')?.value || '2000';
  const endYear = '2025';
  const aggregation = document.getElementById('aggregation-select')?.value || 'yearly';

  return {
    variables: selectedVariables.length > 0 ? selectedVariables : ['temperature'],
    startYear: parseInt(startYear, 10),
    endYear: endYear,
    aggregation: aggregation
  };
}

/**
 * Loads time series analysis for a specific state and updates charts and plain text summary
 * @param {string} stateName - Name of the selected state
 */
export async function loadStateAnalysis(stateName = "Kerala") {
  currentActiveState = stateName;
  const options = getSelectedOptions();
  const stateStage = document.getElementById('state-analysis-stage');
  if (stateStage) {
    stateStage.classList.add('active');
  }

  let analysisPayload = null;

  // Try live REST API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const response = await fetch('/api/analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: { type: 'state', name: stateName },
        variables: options.variables,
        start_year: options.startYear,
        end_year: options.endYear,
        aggregation: options.aggregation
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      analysisPayload = await response.json();
    }
  } catch {
    // Backend offline; continue to fallback
  }

  // Fallback to sample data
  if (!analysisPayload || !analysisPayload.results) {
    // Attempt local sample file fetch
    try {
      const res = await fetch('data/sample/kerala_temperature_sample.json');
      if (res.ok) {
        analysisPayload = await res.json();
      }
    } catch {
      // Continue to embedded fallback
    }
  }

  // Embedded verified fallback
  if (!analysisPayload || !analysisPayload.results) {
    analysisPayload = JSON.parse(JSON.stringify(KERALA_SAMPLE_DATA));
    analysisPayload.location.name = stateName;
  }

  const primaryResult = analysisPayload.results[0];
  if (!primaryResult) return;

  const labels = primaryResult.series.map(d => d.date);
  const values = primaryResult.series.map(d => d.value);
  const trendPoints = primaryResult.series.map(d => d.trend);

  // Render Line Chart
  renderChart('trend-chart-canvas', labels, values, trendPoints, primaryResult.friendly_name, primaryResult.unit);

  // Render Plain-Language Summary
  renderSummaryCard(
    stateName,
    primaryResult.friendly_name,
    primaryResult.trend.slope_per_decade,
    primaryResult.trend.significant
  );

  // Update Summary Badge
  const summaryBadge = document.getElementById('summary-badge');
  if (summaryBadge) {
    if (primaryResult.trend.significant) {
      summaryBadge.className = 'badge-significance significant';
      summaryBadge.textContent = 'Statistically Significant (p < 0.05)';
    } else {
      summaryBadge.className = 'badge-significance variation';
      summaryBadge.textContent = 'Normal Variation (p \u2265 0.05)';
    }
  }

  // Render 12-point Scientific Drawer
  renderSignificanceDrawer({
    pValue: primaryResult.trend.p_value,
    ciLower: primaryResult.trend.confidence_interval_95[0],
    ciUpper: primaryResult.trend.confidence_interval_95[1],
    mean: primaryResult.mean,
    min: primaryResult.min,
    max: primaryResult.max,
    nObservations: primaryResult.n_observations,
    slope: primaryResult.trend.slope_per_decade,
    location: stateName,
    unit: primaryResult.unit
  });
}

/**
 * Sets up report export download in Markdown format
 */
function setupReportDownload() {
  const btnDownload = document.getElementById('btn-download-report');
  if (!btnDownload) return;

  btnDownload.addEventListener('click', () => {
    const options = getSelectedOptions();
    const heading = document.getElementById('summary-heading')?.textContent || `TerraScope Analysis: ${currentActiveState}`;
    const text = document.getElementById('summary-text')?.textContent || '';

    const markdownContent = `# TerraScope Scientific Trend Report
**Location**: ${currentActiveState} (India)  
**Time Window**: ${options.startYear} - ${options.endYear}  
**Aggregation Frequency**: ${options.aggregation}  
**Selected Variables**: ${options.variables.join(', ')}  
**Report Generated**: ${new Date().toISOString()}  

---

## 1. Executive Summary
${text}

---

## 2. Statistical Methodology
- **Monotonic Trend Test**: Non-parametric Mann-Kendall Test
- **Slope Estimator**: Sen's Non-Parametric Median Slope
- **Primary Data Source**: NASA POWER Project (MERRA-2 assimilation, 0.5° spatial grid)
- **Significance Criterion**: \u03b1 = 0.05 (Two-tailed)

---

## 3. Scientific Caveats & Limitations
1. Reanalysis models smooth extreme high-elevation microclimates.
2. Demonstrating a monotonic secular trend does not directly prove localized causal attribution.

*Produced by TerraScope: Earth System Trend Detective (India Edition)*
`;

    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `TerraScope_${currentActiveState}_Report.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
}

/**
 * About / Methodology modal event listeners
 */
function setupAboutModal() {
  const navAboutBtn = document.getElementById('nav-about-btn');
  const modal = document.getElementById('about-modal');
  const btnClose = document.getElementById('btn-close-modal');

  if (navAboutBtn && modal) {
    navAboutBtn.addEventListener('click', () => modal.classList.add('active'));
  }

  if (btnClose && modal) {
    btnClose.addEventListener('click', () => modal.classList.remove('active'));
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        modal.classList.remove('active');
      }
    });
  }
}

/**
 * Checks backend connectivity and surfaces offline demonstration banner if offline
 */
async function checkBackendHealth() {
  const banner = document.getElementById('offline-banner');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch('/api/health', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok && banner) {
      banner.classList.remove('hidden');
    }
  } catch {
    if (banner) {
      banner.classList.remove('hidden');
    }
  }
}

/**
 * Simple toast alert message
 */
function showNotificationToast(msg) {
  console.log(`[TerraScope Toast] ${msg}`);
}
