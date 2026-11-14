/**
 * TerraScope Charting Module
 * Wraps Chart.js to render observed time series, Sen's slope trend line, and uncertainty bands.
 */

let chartInstance = null;

export function renderChart(canvasId, labels, dataPoints, trendPoints, variableName, unit) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') {
    console.warn('[TerraScope] Canvas element or Chart.js not available.');
    return;
  }

  if (chartInstance) {
    chartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: `Observed ${variableName} (${unit})`,
          data: dataPoints,
          borderColor: '#2F5D3A',
          backgroundColor: 'rgba(47, 93, 58, 0.1)',
          pointBackgroundColor: '#2F5D3A',
          pointRadius: 4,
          tension: 0.2
        },
        {
          label: `Secular Trend (Sen's Slope)`,
          data: trendPoints,
          borderColor: '#C8643B',
          borderWidth: 2.5,
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        y: {
          title: { display: true, text: `${variableName} (${unit})` }
        },
        x: {
          title: { display: true, text: 'Year' }
        }
      }
    }
  });
}

export function updateChartData(labels, dataPoints, trendPoints) {
  if (chartInstance) {
    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = dataPoints;
    chartInstance.data.datasets[1].data = trendPoints;
    chartInstance.update();
  }
}
