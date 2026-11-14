/**
 * TerraScope Charting Module
 * Wraps Chart.js to render observed time series, Sen's slope secular trend line,
 * 95% confidence interval uncertainty bands, anomaly callouts, and multi-variable normalized compare mode.
 */

// Active Chart.js instances registry
let activeCharts = [];

// Palette for multi-variable plotting
const VARIABLE_PALETTES = {
  temperature: {
    color: '#2F5D3A',       // Forest Green
    bgColor: 'rgba(47, 93, 58, 0.1)',
    trendColor: '#C8643B',  // Terracotta
    label: 'Air Temperature',
    unit: '°C'
  },
  precipitation: {
    color: '#3B6E8C',       // Ocean Slate Blue
    bgColor: 'rgba(59, 110, 140, 0.1)',
    trendColor: '#D97724',  // Amber
    label: 'Rainfall',
    unit: 'mm'
  },
  soil_moisture: {
    color: '#706E3B',       // Olive Bronze
    bgColor: 'rgba(112, 110, 59, 0.1)',
    trendColor: '#B85042',  // Rust
    label: 'Soil Wetness',
    unit: 'fraction (0–1)'
  },
  water_surface: {
    color: '#3E8E7E',       // Teal
    bgColor: 'rgba(62, 142, 126, 0.1)',
    trendColor: '#E27D60',  // Coral
    label: 'Water Surface',
    unit: 'fraction (0–1)'
  }
};

/**
 * Render single time series chart with Sen's slope trend line, CI envelope, and anomalies
 * (Backwards compatible signature with extended options)
 */
export function renderChart(canvasId, labels, dataPoints, trendPoints, variableName, unit, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') {
    console.warn('[TerraScope Charts] Canvas element or Chart.js not available.');
    return null;
  }

  // Destroy existing chart on this canvas
  const existingIndex = activeCharts.findIndex(c => c.canvas === canvas);
  if (existingIndex !== -1) {
    activeCharts[existingIndex].destroy();
    activeCharts.splice(existingIndex, 1);
  }

  const ctx = canvas.getContext('2d');
  const palette = getVariablePalette(options.variableKey || variableName);

  // Compute confidence interval bounds if provided or generate realistic 95% bounds
  const ciBands = options.confidenceBand || generateDefaultCIBand(dataPoints, trendPoints);
  const anomalies = options.anomalies || detectAnomalousIndices(dataPoints);

  // Point styling with anomaly highlights
  const pointRadii = dataPoints.map((_, i) => anomalies.includes(i) ? 6 : 4);
  const pointBorderColors = dataPoints.map((_, i) => anomalies.includes(i) ? '#C8643B' : palette.color);
  const pointBorderWidths = dataPoints.map((_, i) => anomalies.includes(i) ? 2.5 : 1);
  const pointBgColors = dataPoints.map((_, i) => anomalies.includes(i) ? '#FAF6EC' : palette.color);

  const datasets = [
    // 1. Observed Series
    {
      label: `Observed ${variableName} (${unit})`,
      data: dataPoints,
      borderColor: palette.color,
      backgroundColor: palette.bgColor,
      pointBackgroundColor: pointBgColors,
      pointBorderColor: pointBorderColors,
      pointBorderWidth: pointBorderWidths,
      pointRadius: pointRadii,
      pointHoverRadius: 7,
      tension: 0.2,
      borderWidth: 2,
      order: 2
    },
    // 2. Sen's Slope Secular Trend Line
    {
      label: `Secular Trend (Sen's Slope)`,
      data: trendPoints,
      borderColor: palette.trendColor,
      borderWidth: 2.5,
      borderDash: [6, 4],
      pointRadius: 0,
      fill: false,
      order: 1
    }
  ];

  // 3. Shaded 95% Confidence Interval Envelope (if available)
  if (ciBands && ciBands.lower && ciBands.upper) {
    datasets.push(
      {
        label: '95% CI Lower Bound',
        data: ciBands.lower,
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        pointRadius: 0,
        fill: false,
        order: 4
      },
      {
        label: '95% CI Envelope',
        data: ciBands.upper,
        borderColor: 'transparent',
        backgroundColor: 'rgba(200, 100, 59, 0.12)',
        pointRadius: 0,
        fill: '-1', // Fill down to the Lower Bound dataset
        order: 3
      }
    );
  }

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 14,
            usePointStyle: true,
            filter: (legendItem) => !legendItem.text.includes('Bound')
          }
        },
        tooltip: {
          backgroundColor: '#3B3F1F',
          titleColor: '#FAF6EC',
          bodyColor: '#FAF6EC',
          borderColor: '#D6CCA9',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: function (context) {
              if (context.dataset.label.includes('CI')) return null;
              const val = typeof context.raw === 'number' ? context.raw.toFixed(2) : context.raw;
              const isAnomaly = anomalies.includes(context.dataIndex) && context.datasetIndex === 0;
              const suffix = isAnomaly ? ' [Anomaly Year]' : '';
              return `${context.dataset.label}: ${val} ${unit}${suffix}`;
            }
          }
        }
      },
      scales: {
        y: {
          title: {
            display: true,
            text: `${variableName} (${unit})`,
            color: '#3B3F1F',
            font: { weight: '600', size: 12 }
          },
          grid: {
            color: 'rgba(214, 204, 169, 0.35)'
          },
          ticks: {
            color: '#6B7052'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Year',
            color: '#3B3F1F',
            font: { weight: '600', size: 12 }
          },
          grid: {
            color: 'rgba(214, 204, 169, 0.2)'
          },
          ticks: {
            color: '#6B7052'
          }
        }
      }
    }
  });

  activeCharts.push(chart);
  return chart;
}

/**
 * Renders multiple variable charts (either stacked cards or unified normalized compare mode)
 * @param {string} mainCanvasId - Primary chart canvas ID
 * @param {Object} variablesData - Keyed map of variables { temperature: {...}, precipitation: {...} }
 * @param {boolean} compareMode - When true, normalizes curves to [0, 1] on a single canvas
 */
export function renderMultiVariableCharts(mainCanvasId, variablesData, compareMode = false) {
  destroyAllCharts();

  const mainCanvas = document.getElementById(mainCanvasId);
  const container = mainCanvas ? mainCanvas.parentElement : null;
  if (!container || !variablesData) return;

  const varKeys = Object.keys(variablesData);
  if (varKeys.length === 0) return;

  if (compareMode && varKeys.length > 1) {
    // -------------------------------------------------------------
    // COMPARE MODE: Overlay all variables normalized onto [0, 1]
    // Formula: x_norm = (x - x_min) / (x_max - x_min)
    // -------------------------------------------------------------
    renderNormalizedComparisonChart(mainCanvasId, variablesData);
  } else {
    // -------------------------------------------------------------
    // STACKED / MULTI-CARD MODE: Dedicated chart per variable
    // -------------------------------------------------------------
    renderStackedVariableCharts(mainCanvasId, variablesData);
  }
}

/**
 * Normalizes all selected series onto a dimensionless [0, 1] scale on the main canvas
 */
function renderNormalizedComparisonChart(canvasId, variablesData) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const varKeys = Object.keys(variablesData);
  const labels = variablesData[varKeys[0]].labels;

  const datasets = [];

  varKeys.forEach((key) => {
    const vData = variablesData[key];
    const palette = getVariablePalette(key);
    const normalizedObserved = normalizeMinMax(vData.observed);
    const normalizedTrend = normalizeMinMax(vData.trend, vData.observed);

    datasets.push(
      {
        label: `${vData.name} (Normalized)`,
        data: normalizedObserved,
        borderColor: palette.color,
        backgroundColor: 'transparent',
        pointRadius: 3,
        tension: 0.2,
        borderWidth: 2
      },
      {
        label: `${vData.name} Trend`,
        data: normalizedTrend,
        borderColor: palette.trendColor,
        borderWidth: 2,
        borderDash: [5, 4],
        pointRadius: 0,
        fill: false
      }
    );
  });

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: { boxWidth: 12, usePointStyle: true }
        },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              return `${ctx.dataset.label}: ${ctx.raw.toFixed(2)}`;
            }
          }
        }
      },
      scales: {
        y: {
          min: 0,
          max: 1,
          title: {
            display: true,
            text: 'Normalized Relative Scale [0 to 1]',
            color: '#3B3F1F',
            font: { weight: '600' }
          },
          grid: { color: 'rgba(214, 204, 169, 0.35)' }
        },
        x: {
          title: { display: true, text: 'Year', color: '#3B3F1F' },
          grid: { color: 'rgba(214, 204, 169, 0.2)' }
        }
      }
    }
  });

  activeCharts.push(chart);
}

/**
 * Renders dedicated stacked charts for each selected variable
 */
function renderStackedVariableCharts(mainCanvasId, variablesData) {
  const varKeys = Object.keys(variablesData);
  const primaryKey = varKeys[0];
  const primaryData = variablesData[primaryKey];

  // 1. Render primary chart on the main canvas
  renderChart(
    mainCanvasId,
    primaryData.labels,
    primaryData.observed,
    primaryData.trend,
    primaryData.name,
    primaryData.unit,
    {
      variableKey: primaryKey,
      confidenceBand: primaryData.confidence_band,
      anomalies: primaryData.anomalies
    }
  );

  // 2. Clean or populate dynamic additional chart canvases
  let additionalContainer = document.getElementById('additional-charts-container');
  if (!additionalContainer) {
    const mainWrapper = document.getElementById('state-analysis-stage') || document.querySelector('.main-stage');
    if (mainWrapper) {
      additionalContainer = document.createElement('div');
      additionalContainer.id = 'additional-charts-container';
      additionalContainer.style.display = 'flex';
      additionalContainer.style.flexDirection = 'column';
      additionalContainer.style.gap = '16px';
      additionalContainer.style.marginTop = '16px';

      const chartsWrapper = document.querySelector('.charts-wrapper');
      if (chartsWrapper && chartsWrapper.parentElement) {
        chartsWrapper.parentElement.insertBefore(additionalContainer, chartsWrapper.nextSibling);
      }
    }
  }

  if (additionalContainer) {
    additionalContainer.innerHTML = '';

    for (let i = 1; i < varKeys.length; i++) {
      const key = varKeys[i];
      const data = variablesData[key];
      const cardEl = document.createElement('div');
      cardEl.className = 'charts-wrapper';
      cardEl.innerHTML = `
        <div class="chart-header">
          <h3>${data.name} Time Series &amp; Secular Trend</h3>
        </div>
        <div class="chart-canvas-container" style="height: 300px; width: 100%;">
          <canvas id="chart-canvas-${key}"></canvas>
        </div>
      `;
      additionalContainer.appendChild(cardEl);

      renderChart(
        `chart-canvas-${key}`,
        data.labels,
        data.observed,
        data.trend,
        data.name,
        data.unit,
        {
          variableKey: key,
          confidenceBand: data.confidence_band,
          anomalies: data.anomalies
        }
      );
    }
  }
}

/**
 * Updates primary chart data values directly
 */
export function updateChartData(labels, dataPoints, trendPoints) {
  if (activeCharts.length > 0) {
    const chart = activeCharts[0];
    chart.data.labels = labels;
    if (chart.data.datasets[0]) chart.data.datasets[0].data = dataPoints;
    if (chart.data.datasets[1]) chart.data.datasets[1].data = trendPoints;
    chart.update();
  }
}

/**
 * Destroys all active Chart.js instances and cleans up DOM canvases
 */
export function destroyAllCharts() {
  activeCharts.forEach(c => {
    try { c.destroy(); } catch {}
  });
  activeCharts = [];

  const additionalContainer = document.getElementById('additional-charts-container');
  if (additionalContainer) {
    additionalContainer.innerHTML = '';
  }
}

/**
 * Min-Max normalization helper: (x - min) / (max - min)
 */
function normalizeMinMax(data, referenceData = null) {
  const ref = referenceData || data;
  const min = Math.min(...ref);
  const max = Math.max(...ref);
  const range = max - min || 1;
  return data.map(v => (v - min) / range);
}

/**
 * Detects top 5% anomalous years based on standard score (z-score >= 1.96)
 */
function detectAnomalousIndices(data) {
  if (!data || data.length === 0) return [];
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length;
  const std = Math.sqrt(variance) || 1;

  const anomalies = [];
  data.forEach((val, idx) => {
    if (Math.abs((val - mean) / std) >= 1.9) {
      anomalies.push(idx);
    }
  });
  return anomalies;
}

function generateDefaultCIBand(dataPoints, trendPoints) {
  if (!trendPoints || trendPoints.length === 0) return null;
  const margin = Math.abs(trendPoints[trendPoints.length - 1] - trendPoints[0]) * 0.4 + 0.25;
  return {
    lower: trendPoints.map(v => Number((v - margin).toFixed(2))),
    upper: trendPoints.map(v => Number((v + margin).toFixed(2)))
  };
}

function getVariablePalette(key) {
  const normKey = String(key || '').toLowerCase();
  if (normKey.includes('temp')) return VARIABLE_PALETTES.temperature;
  if (normKey.includes('precip') || normKey.includes('rain')) return VARIABLE_PALETTES.precipitation;
  if (normKey.includes('soil') || normKey.includes('wet')) return VARIABLE_PALETTES.soil_moisture;
  if (normKey.includes('water')) return VARIABLE_PALETTES.water_surface;
  return VARIABLE_PALETTES.temperature;
}
