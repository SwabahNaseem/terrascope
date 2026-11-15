/**
 * TerraScope Charting Module
 * Wraps Chart.js (with native HTML5 Canvas 2D fallback) to render observed time series,
 * Sen's slope secular trend line, 95% confidence interval uncertainty bands, anomaly callouts,
 * and multi-variable normalized compare mode.
 * Styled to EarthWatch / TerraScope Dark Navy Reference Palette.
 */

// Active Chart.js instances registry
let activeCharts = [];

// Palette for multi-variable plotting matching Reference Palette
const VARIABLE_PALETTES = {
  temperature: {
    color: '#19C8F2',       // Bright Cyan (--cyan)
    bgColor: 'rgba(25, 200, 242, 0.12)',
    trendColor: '#FFAD45',  // Orange (--orange)
    label: 'Air Temperature',
    unit: '°C'
  },
  precipitation: {
    color: '#258BFF',       // Bright Blue (--blue)
    bgColor: 'rgba(37, 139, 255, 0.12)',
    trendColor: '#FF6B58',  // Coral Red (--red)
    label: 'Rainfall',
    unit: 'mm'
  },
  soil_moisture: {
    color: '#42D69B',       // Green (--green)
    bgColor: 'rgba(66, 214, 155, 0.12)',
    trendColor: '#FFAD45',  // Orange (--orange)
    label: 'Soil Wetness',
    unit: 'fraction (0–1)'
  },
  water_surface: {
    color: '#19C8F2',       // Bright Cyan (--cyan)
    bgColor: 'rgba(25, 200, 242, 0.12)',
    trendColor: '#258BFF',  // Bright Blue (--blue)
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
  if (!canvas) {
    console.warn('[TerraScope Charts] Canvas element not found:', canvasId);
    return null;
  }

  // Destroy existing chart on this canvas
  const existingIndex = activeCharts.findIndex(c => c.canvas === canvas);
  if (existingIndex !== -1) {
    try { activeCharts[existingIndex].destroy(); } catch {}
    activeCharts.splice(existingIndex, 1);
  }

  const palette = getVariablePalette(options.variableKey || variableName);
  const ciBands = options.confidenceBand || generateDefaultCIBand(dataPoints, trendPoints);
  const anomalies = options.anomalies || detectAnomalousIndices(dataPoints);

  // If Chart.js CDN is unavailable, use Canvas 2D fallback
  if (typeof Chart === 'undefined') {
    renderCanvas2DFallback(canvas, labels, dataPoints, trendPoints, ciBands, anomalies, variableName, unit, palette);
    return { isFallback: true };
  }

  const ctx = canvas.getContext('2d');

  // Point styling with anomaly highlights
  const pointRadii = dataPoints.map((_, i) => anomalies.includes(i) ? 6 : 4);
  const pointBorderColors = dataPoints.map((_, i) => anomalies.includes(i) ? '#FF6B58' : palette.color);
  const pointBorderWidths = dataPoints.map((_, i) => anomalies.includes(i) ? 2.5 : 1);
  const pointBgColors = dataPoints.map((_, i) => anomalies.includes(i) ? '#10243B' : palette.color);

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

  // 3. Shaded 95% Confidence Interval Envelope
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
        backgroundColor: 'rgba(25, 200, 242, 0.10)',
        pointRadius: 0,
        fill: '-1',
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
            color: '#EDF6FF',
            boxWidth: 14,
            usePointStyle: true,
            filter: (legendItem) => !legendItem.text.includes('Bound')
          }
        },
        tooltip: {
          backgroundColor: '#10243B',
          titleColor: '#19C8F2',
          bodyColor: '#EDF6FF',
          borderColor: '#1B3B59',
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
            color: '#EDF6FF',
            font: { weight: '600', size: 12 }
          },
          grid: {
            color: 'rgba(27, 59, 89, 0.5)'
          },
          ticks: {
            color: '#9BB0C5'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Year',
            color: '#EDF6FF',
            font: { weight: '600', size: 12 }
          },
          grid: {
            color: 'rgba(27, 59, 89, 0.3)'
          },
          ticks: {
            color: '#9BB0C5'
          }
        }
      }
    }
  });

  activeCharts.push(chart);
  return chart;
}

/**
 * Native Canvas 2D Fallback Renderer when Chart.js CDN is unavailable
 */
function renderCanvas2DFallback(canvas, labels, data, trend, ciBands, anomalies, varName, unit, palette) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || 700;
  const height = rect.height || 340;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  ctx.fillStyle = '#0C1D31';
  ctx.fillRect(0, 0, width, height);

  const padding = { top: 40, right: 30, bottom: 50, left: 60 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const allVals = [...data, ...trend, ...(ciBands?.lower || []), ...(ciBands?.upper || [])];
  const minVal = Math.min(...allVals);
  const maxVal = Math.max(...allVals);
  const range = (maxVal - minVal) || 1;

  const getX = (i) => padding.left + (i / (data.length - 1)) * plotW;
  const getY = (v) => padding.top + plotH - ((v - minVal) / range) * plotH;

  // Grid & Y-Ticks
  ctx.strokeStyle = 'rgba(27, 59, 89, 0.6)';
  ctx.fillStyle = '#9BB0C5';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'right';

  for (let s = 0; s <= 5; s++) {
    const val = minVal + (s / 5) * range;
    const y = getY(val);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillText(val.toFixed(1), padding.left - 8, y + 4);
  }

  // X-Ticks
  ctx.textAlign = 'center';
  const step = Math.max(1, Math.floor(labels.length / 8));
  for (let i = 0; i < labels.length; i += step) {
    const x = getX(i);
    ctx.fillText(labels[i], x, height - padding.bottom + 20);
  }

  // CI Band Fill
  if (ciBands && ciBands.lower && ciBands.upper) {
    ctx.fillStyle = 'rgba(25, 200, 242, 0.10)';
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(ciBands.upper[0]));
    for (let i = 1; i < data.length; i++) ctx.lineTo(getX(i), getY(ciBands.upper[i]));
    for (let i = data.length - 1; i >= 0; i--) ctx.lineTo(getX(i), getY(ciBands.lower[i]));
    ctx.closePath();
    ctx.fill();
  }

  // Sen's Trend Line (Dashed)
  ctx.strokeStyle = palette.trendColor;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(getX(0), getY(trend[0]));
  for (let i = 1; i < trend.length; i++) ctx.lineTo(getX(i), getY(trend[i]));
  ctx.stroke();
  ctx.setLineDash([]);

  // Observed Line
  ctx.strokeStyle = palette.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(getX(0), getY(data[0]));
  for (let i = 1; i < data.length; i++) ctx.lineTo(getX(i), getY(data[i]));
  ctx.stroke();

  // Observed Points
  for (let i = 0; i < data.length; i++) {
    const isAnomaly = anomalies.includes(i);
    ctx.fillStyle = isAnomaly ? '#10243B' : palette.color;
    ctx.strokeStyle = isAnomaly ? '#FF6B58' : palette.color;
    ctx.lineWidth = isAnomaly ? 2.5 : 1;
    ctx.beginPath();
    ctx.arc(getX(i), getY(data[i]), isAnomaly ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Legend
  ctx.fillStyle = palette.color;
  ctx.fillRect(padding.left, 14, 12, 12);
  ctx.fillStyle = '#EDF6FF';
  ctx.textAlign = 'left';
  ctx.fillText(`Observed ${varName} (${unit})`, padding.left + 18, 24);

  ctx.fillStyle = palette.trendColor;
  ctx.fillRect(padding.left + 220, 14, 12, 12);
  ctx.fillStyle = '#EDF6FF';
  ctx.fillText(`Secular Trend`, padding.left + 238, 24);
}

/**
 * Renders multiple variable charts (either stacked cards or unified normalized compare mode)
 * @param {string} mainCanvasId - Primary chart canvas ID
 * @param {Object} variablesData - Keyed map of variables
 * @param {boolean} compareMode - When true, normalizes curves to [0, 1] on a single canvas
 */
export function renderMultiVariableCharts(mainCanvasId, variablesData, compareMode = false) {
  destroyAllCharts();

  const mainCanvas = document.getElementById(mainCanvasId);
  if (!mainCanvas || !variablesData) return;

  const varKeys = Object.keys(variablesData);
  if (varKeys.length === 0) return;

  if (compareMode && varKeys.length > 1) {
    renderNormalizedComparisonChart(mainCanvasId, variablesData);
  } else {
    renderStackedVariableCharts(mainCanvasId, variablesData);
  }
}

/**
 * Normalizes all selected series onto a dimensionless [0, 1] scale on the main canvas
 */
function renderNormalizedComparisonChart(canvasId, variablesData) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const varKeys = Object.keys(variablesData);
  const labels = variablesData[varKeys[0]].labels;

  if (typeof Chart === 'undefined') {
    // Canvas 2D fallback for compare mode
    const normDataMap = {};
    varKeys.forEach(k => {
      normDataMap[k] = {
        name: variablesData[k].name,
        observed: normalizeMinMax(variablesData[k].observed),
        trend: normalizeMinMax(variablesData[k].trend, variablesData[k].observed)
      };
    });
    renderCanvas2DFallback(
      canvas, labels, normDataMap[varKeys[0]].observed, normDataMap[varKeys[0]].trend,
      null, [], 'Normalized Comparison', '0-1 scale', getVariablePalette(varKeys[0])
    );
    return;
  }

  const ctx = canvas.getContext('2d');
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
          labels: { color: '#EDF6FF', boxWidth: 12, usePointStyle: true }
        },
        tooltip: {
          backgroundColor: '#10243B',
          titleColor: '#19C8F2',
          bodyColor: '#EDF6FF',
          borderColor: '#1B3B59',
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
            color: '#EDF6FF',
            font: { weight: '600' }
          },
          grid: { color: 'rgba(27, 59, 89, 0.5)' },
          ticks: { color: '#9BB0C5' }
        },
        x: {
          title: { display: true, text: 'Year', color: '#EDF6FF' },
          grid: { color: 'rgba(27, 59, 89, 0.3)' },
          ticks: { color: '#9BB0C5' }
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
