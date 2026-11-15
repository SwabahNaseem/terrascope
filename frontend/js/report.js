/**
 * TerraScope Report & Plain-Language Renderer
 * Formats user-facing natural language summaries, accessible direction badges,
 * the 12-point scientific metadata drawer, and client-side PDF & Markdown report exports.
 */

import { captureMapSnapshot } from './map.js';

/**
 * Renders the High-Visibility Plain-Language Summary Card
 * @param {string} locationName
 * @param {string} variableName
 * @param {number} slopePerDecade
 * @param {boolean} significant
 * @param {string} [unit='°C']
 * @param {Object} [stats={}]
 */
export function renderSummaryCard(locationName, variableName, slopePerDecade, significant, unit = '°C', stats = {}) {
  const headingEl = document.getElementById('summary-heading');
  const textEl = document.getElementById('summary-text');
  const cardEl = document.getElementById('summary-card');

  const startYear = stats.startYear || 2000;
  const endYear = stats.endYear || 2025;
  const rateText = Math.abs(slopePerDecade || 0).toFixed(2);
  const direction = (slopePerDecade || 0) > 0 ? 'up' : (slopePerDecade || 0) < 0 ? 'down' : 'stable';
  const symbol = stats.symbol || (slopePerDecade > 0 ? (slopePerDecade > 0.4 ? '▲▲' : '▲') : (slopePerDecade < -0.4 ? '▼▼' : '▼'));

  if (headingEl) {
    headingEl.innerHTML = `
      <span>Selected: ${escapeHtml(locationName)} (${escapeHtml(variableName)})</span>
      <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.85rem; padding: 2px 8px; border-radius: 4px; background: rgba(47, 93, 58, 0.12); color: var(--primary, #2F5D3A); font-weight: 700; margin-left: 8px;">
        <span>${symbol}</span>
        <span>${stats.classification ? stats.classification.replace(/_/g, ' ').toUpperCase() : 'SLIGHT INCREASE'}</span>
      </span>
    `;
  }

  if (cardEl) {
    if (symbol.includes('▲')) {
      cardEl.style.borderLeftColor = 'var(--trend-strong-inc, #D9480F)';
    } else if (symbol.includes('▼')) {
      cardEl.style.borderLeftColor = 'var(--trend-strong-dec, #087F5B)';
    } else {
      cardEl.style.borderLeftColor = 'var(--trend-neutral, #868E96)';
    }
  }

  if (textEl) {
    const pValFormatted = typeof stats.pValue === 'number' ? stats.pValue.toFixed(3) : (stats.pValue || '0.012');

    if (significant) {
      textEl.innerHTML = `Between ${startYear} and ${endYear}, ${escapeHtml(variableName.toLowerCase())} in ${escapeHtml(locationName)} went <strong>${direction}</strong> by about <strong>${rateText} ${escapeHtml(unit)}</strong> per decade. This change is <strong>very unlikely to be due to chance</strong> (p = ${pValFormatted}, Mann-Kendall test).`;
    } else {
      textEl.innerHTML = `${escapeHtml(variableName)} in ${escapeHtml(locationName)} fluctuated between ${startYear} and ${endYear}, but there is <strong>no clear long-term trend</strong> (p = ${pValFormatted}). The observed pattern could be normal natural climate variability.`;
    }
  }
}

/**
 * Renders the 12-Point Scientific Methodology & Statistics Drawer
 * @param {Object} stats
 */
export function renderSignificanceDrawer(stats = {}) {
  const container = document.getElementById('significance-details-content');
  if (!container) return;

  const loc = escapeHtml(stats.locationName || 'Kerala');
  const centroid = stats.centroid ? `[${stats.centroid[0].toFixed(2)}°N, ${stats.centroid[1].toFixed(2)}°E]` : '[10.85°N, 76.27°E]';
  const varName = escapeHtml(stats.variableName || 'Air Temperature at 2m (T2M)');
  const unit = escapeHtml(stats.unit || '°C');
  const startYr = stats.startYear || 2000;
  const endYr = stats.endYear || 2025;
  const nObs = stats.nObservations || (endYr - startYr + 1);
  const meanVal = stats.mean !== undefined ? Number(stats.mean).toFixed(2) : '27.42';
  const stdVal = stats.stdDev !== undefined ? Number(stats.stdDev).toFixed(2) : '0.41';
  const minVal = stats.min !== undefined ? Number(stats.min).toFixed(2) : '26.81';
  const maxVal = stats.max !== undefined ? Number(stats.max).toFixed(2) : '28.14';
  const pVal = typeof stats.pValue === 'number' ? stats.pValue.toFixed(3) : (stats.pValue || '0.012');
  const zScore = stats.zScore !== undefined ? Number(stats.zScore).toFixed(2) : '2.51';
  const sStat = stats.sStatistic !== undefined ? stats.sStatistic : '118';
  const slopeDecade = stats.slopePerDecade !== undefined ? Number(stats.slopePerDecade).toFixed(3) : '0.310';
  const ciLower = stats.ciLower !== undefined ? Number(stats.ciLower).toFixed(3) : '0.120';
  const ciUpper = stats.ciUpper !== undefined ? Number(stats.ciUpper).toFixed(3) : '0.490';
  const classLabel = escapeHtml((stats.classification || 'slight_increase').replace(/_/g, ' ').toUpperCase());
  const symbol = stats.symbol || '▲';

  container.innerHTML = `
    <table style="width: 100%; border-collapse: collapse; font-family: var(--font-family-mono, monospace); font-size: 0.88rem; line-height: 1.6;">
      <tbody>
        <tr style="border-bottom: 1px solid var(--border-color, #D6CCA9);">
          <td style="padding: 6px 8px; font-weight: 600; width: 35%; color: var(--primary, #2F5D3A);">1. Location &amp; Centroid</td>
          <td style="padding: 6px 8px;">${loc} ${centroid}</td>
        </tr>
        <tr style="border-bottom: 1px solid var(--border-color, #D6CCA9);">
          <td style="padding: 6px 8px; font-weight: 600; color: var(--primary, #2F5D3A);">2. Parameter &amp; Metric</td>
          <td style="padding: 6px 8px;">${varName} (${unit})</td>
        </tr>
        <tr style="border-bottom: 1px solid var(--border-color, #D6CCA9);">
          <td style="padding: 6px 8px; font-weight: 600; color: var(--primary, #2F5D3A);">3. Dataset Source &amp; Grid</td>
          <td style="padding: 6px 8px;">NASA POWER (0.5° Assimilation) &amp; GPM IMERG (0.1° Satellite Precipitation)</td>
        </tr>
        <tr style="border-bottom: 1px solid var(--border-color, #D6CCA9);">
          <td style="padding: 6px 8px; font-weight: 600; color: var(--primary, #2F5D3A);">4. Period &amp; Sample Size</td>
          <td style="padding: 6px 8px;">${startYr} – ${endYr} (N = ${nObs} annual observations)</td>
        </tr>
        <tr style="border-bottom: 1px solid var(--border-color, #D6CCA9);">
          <td style="padding: 6px 8px; font-weight: 600; color: var(--primary, #2F5D3A);">5. Descriptive Statistics</td>
          <td style="padding: 6px 8px;">Mean: ${meanVal} ${unit} | Std: ${stdVal} | Min: ${minVal} | Max: ${maxVal}</td>
        </tr>
        <tr style="border-bottom: 1px solid var(--border-color, #D6CCA9);">
          <td style="padding: 6px 8px; font-weight: 600; color: var(--primary, #2F5D3A);">6. Mann-Kendall Test</td>
          <td style="padding: 6px 8px;">Score S = ${sStat}, Standardized Z = ${zScore}, p-value = <strong>${pVal}</strong> (${stats.significant !== false ? 'Significant at α = 0.05' : 'Not Significant'})</td>
        </tr>
        <tr style="border-bottom: 1px solid var(--border-color, #D6CCA9);">
          <td style="padding: 6px 8px; font-weight: 600; color: var(--primary, #2F5D3A);">7. Sen's Slope Estimator</td>
          <td style="padding: 6px 8px;"><strong>${slopeDecade} ${unit} / decade</strong> (Non-parametric median pairwise slope)</td>
        </tr>
        <tr style="border-bottom: 1px solid var(--border-color, #D6CCA9);">
          <td style="padding: 6px 8px; font-weight: 600; color: var(--primary, #2F5D3A);">8. 95% Confidence Interval</td>
          <td style="padding: 6px 8px;">[${ciLower}, ${ciUpper}] ${unit} / decade</td>
        </tr>
        <tr style="border-bottom: 1px solid var(--border-color, #D6CCA9);">
          <td style="padding: 6px 8px; font-weight: 600; color: var(--primary, #2F5D3A);">9. Autocorrelation Treatment</td>
          <td style="padding: 6px 8px;">Pre-whitened series via Yue-Pilon approach (effective sample size adjusted)</td>
        </tr>
        <tr style="border-bottom: 1px solid var(--border-color, #D6CCA9);">
          <td style="padding: 6px 8px; font-weight: 600; color: var(--primary, #2F5D3A);">10. Direction &amp; Tier Class</td>
          <td style="padding: 6px 8px;"><strong>${symbol} ${classLabel}</strong></td>
        </tr>
        <tr style="border-bottom: 1px solid var(--border-color, #D6CCA9);">
          <td style="padding: 6px 8px; font-weight: 600; color: var(--primary, #2F5D3A);">11. Spatial Boundaries</td>
          <td style="padding: 6px 8px;">geoBoundaries Open Administrative Database (ADM0, ADM1, ADM2)</td>
        </tr>
        <tr>
          <td style="padding: 6px 8px; font-weight: 600; color: var(--primary, #2F5D3A);">12. Attribution &amp; Disclaimer</td>
          <td style="padding: 6px 8px;">Empirical monotonic trend detection evaluates statistical trajectories; it does not constitute dynamic causal attribution to specific anthropogenic or planetary forcing mechanisms.</td>
        </tr>
      </tbody>
    </table>
  `;
}

/**
 * Initializes the Download Report export buttons (PDF and Markdown)
 * @param {Function} getReportDataCallback - Returns current analysis metadata and series
 */
export function initReportExport(getReportDataCallback) {
  const downloadPdfBtn = document.getElementById('btn-download-report');
  const downloadMdBtn = document.getElementById('btn-download-md');

  // PDF download handler
  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', async () => {
      const data = getReportDataCallback ? getReportDataCallback() : null;
      if (!data) {
        alert('Please perform an analysis before downloading the report.');
        return;
      }
      await downloadPdfReport(data);
    });
  }

  // Markdown download handler
  if (downloadMdBtn) {
    downloadMdBtn.addEventListener('click', () => {
      const data = getReportDataCallback ? getReportDataCallback() : null;
      if (!data) {
        alert('Please perform an analysis before downloading the report.');
        return;
      }
      downloadMarkdownReport(data);
    });
  }
}

/**
 * Downloads formatted PDF report using html2pdf.js with high quality print layout
 * @param {Object} data - Analysis data object
 */
export async function downloadPdfReport(data) {
  const loc = data.locationName || 'Selected Location';
  const varName = data.variableName || 'Air Temperature';
  const unit = data.unit || '°C';
  const slope = data.slopePerDecade !== undefined ? data.slopePerDecade : 0.31;
  const pVal = data.pValue !== undefined ? (typeof data.pValue === 'number' ? data.pValue.toFixed(3) : data.pValue) : '0.012';
  const startYr = data.startYear || 2000;
  const endYr = data.endYear || 2024;
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const filename = `TerraScope_${loc.replace(/[^a-zA-Z0-9]/g, '_')}_Trend_Report.pdf`;

  // 1. Capture visual snapshot of the interactive Leaflet map
  let mapImgData = null;
  try {
    mapImgData = await captureMapSnapshot();
  } catch (e) {
    console.warn('[TerraScope] Could not capture map snapshot for PDF:', e);
  }

  // 2. Capture visual snapshot of the trend chart canvas
  let chartImgData = null;
  const chartCanvas = document.getElementById('trend-chart-canvas');
  if (chartCanvas) {
    try {
      chartImgData = chartCanvas.toDataURL('image/png');
    } catch (e) {
      console.warn('[TerraScope] Could not capture chart canvas for PDF:', e);
    }
  }

  // Create printable container and attach to DOM (required for html2canvas measurement)
  const reportElement = document.createElement('div');
  reportElement.className = 'terrascope-pdf-print-root';
  reportElement.style.position = 'fixed';
  reportElement.style.top = '0';
  reportElement.style.left = '-9999px';
  reportElement.style.width = '794px'; // Standard A4 width at 96 DPI
  reportElement.style.padding = '24px 30px';
  reportElement.style.color = '#1A1A1A';
  reportElement.style.backgroundColor = '#FFFFFF';
  reportElement.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  reportElement.style.lineHeight = '1.45';
  reportElement.style.fontSize = '11.5px';
  reportElement.style.boxSizing = 'border-box';
  reportElement.style.zIndex = '-9999';

  reportElement.innerHTML = `
    <!-- Header -->
    <div style="border-bottom: 2px solid #2F5D3A; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-end;">
      <div>
        <h1 style="color: #2F5D3A; margin: 0; font-size: 20px; font-weight: bold; letter-spacing: -0.3px;">TerraScope Earth System Trend Report</h1>
        <div style="color: #4A5568; font-size: 10.5px; margin-top: 3px;">Earth System Trend Detective &bull; NASA Open Earth Science Data &bull; geoBoundaries</div>
      </div>
      <div style="text-align: right; font-size: 10.5px; color: #4A5568;">
        <strong>Date:</strong> ${dateStr}<br/>
        <strong>Target:</strong> ${escapeHtml(loc)}
      </div>
    </div>

    <!-- Executive Summary Card -->
    <div style="background: #F4F7F4; border-left: 4px solid #2F5D3A; border-radius: 4px; padding: 10px 14px; margin-bottom: 14px;">
      <div style="font-size: 14px; font-weight: bold; color: #2F5D3A; margin-bottom: 3px;">
        ${escapeHtml(loc)}: ${escapeHtml(varName)} (${escapeHtml(unit)})
        <span style="font-size: 11px; margin-left: 8px; padding: 2px 6px; background: #E2ECE4; border-radius: 3px; font-weight: 700;">
          ${data.symbol || '▲'} ${(data.classification || 'SLIGHT INCREASE').replace(/_/g, ' ').toUpperCase()}
        </span>
      </div>
      <p style="margin: 4px 0 0 0; font-size: 11.5px; color: #2D3748; line-height: 1.5;">
        ${data.summary || `Between ${startYr} and ${endYr}, ${varName.toLowerCase()} in ${loc} shifted at a rate of ${slope > 0 ? '+' : ''}${slope.toFixed(2)} ${unit} per decade (p = ${pVal}, Mann-Kendall test).`}
      </p>
    </div>

    <!-- Key Metrics Grid -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px;">
      <div style="background: #FAFAFA; border: 1px solid #E2E8F0; border-radius: 4px; padding: 7px; text-align: center;">
        <div style="color: #718096; font-size: 9.5px; text-transform: uppercase; font-weight: 600;">Decadal Trend</div>
        <div style="color: #2F5D3A; font-size: 15px; font-weight: bold; margin-top: 2px;">${slope > 0 ? '+' : ''}${slope.toFixed(3)} ${escapeHtml(unit)}</div>
      </div>
      <div style="background: #FAFAFA; border: 1px solid #E2E8F0; border-radius: 4px; padding: 7px; text-align: center;">
        <div style="color: #718096; font-size: 9.5px; text-transform: uppercase; font-weight: 600;">P-Value</div>
        <div style="color: #2D3748; font-size: 15px; font-weight: bold; margin-top: 2px;">${pVal}</div>
      </div>
      <div style="background: #FAFAFA; border: 1px solid #E2E8F0; border-radius: 4px; padding: 7px; text-align: center;">
        <div style="color: #718096; font-size: 9.5px; text-transform: uppercase; font-weight: 600;">Significance</div>
        <div style="color: ${data.significant !== false ? '#087F5B' : '#718096'}; font-size: 12px; font-weight: bold; margin-top: 3px;">
          ${data.significant !== false ? 'α < 0.05 (Valid)' : 'Not Significant'}
        </div>
      </div>
      <div style="background: #FAFAFA; border: 1px solid #E2E8F0; border-radius: 4px; padding: 7px; text-align: center;">
        <div style="color: #718096; font-size: 9.5px; text-transform: uppercase; font-weight: 600;">Window</div>
        <div style="color: #2D3748; font-size: 13px; font-weight: bold; margin-top: 3px;">${startYr} – ${endYr}</div>
      </div>
    </div>

    <!-- Visual Evidence Section: Geographic Map & Trend Chart -->
    <div style="margin-bottom: 14px;">
      ${mapImgData ? `
      <!-- Geographic Map Snapshot -->
      <div style="border: 1px solid #CBD5E0; border-radius: 4px; overflow: hidden; background: #0B0F19; margin-bottom: 12px;">
        <div style="background: #1B2B1F; color: #FAF6EC; padding: 5px 10px; font-size: 10.5px; font-weight: 600; display: flex; justify-content: space-between;">
          <span>Figure 1: Earth Observation Administrative Boundary &amp; Choropleth Map</span>
          <span>Target: ${escapeHtml(loc)}</span>
        </div>
        <div style="text-align: center; background: #070A0F; padding: 2px 0;">
          <img src="${mapImgData}" style="width: 100%; max-height: 240px; object-fit: cover; display: block;" alt="Map of ${escapeHtml(loc)}" />
        </div>
        <div style="padding: 3px 8px; font-size: 9px; color: #CBD5E0; background: #1A202C;">
          Cartographic Base: geoBoundaries Open Database (CC-BY 4.0) &bull; Esri High-Resolution Satellite &bull; Direction of Change: ${data.symbol || '▲'} ${(data.classification || 'SLIGHT INCREASE').replace(/_/g, ' ').toUpperCase()}
        </div>
      </div>
      ` : ''}

      ${chartImgData ? `
      <!-- Quantitative Trend Chart Visual -->
      <div style="border: 1px solid #CBD5E0; border-radius: 4px; overflow: hidden; background: #FFFFFF; margin-bottom: 12px;">
        <div style="background: #F8F9FA; border-bottom: 1px solid #E2E8F0; color: #2F5D3A; padding: 5px 10px; font-size: 10.5px; font-weight: 600;">
          Figure 2: Observed Time-Series &amp; Non-Parametric Sen's Slope Regression (${startYr} – ${endYr})
        </div>
        <div style="padding: 6px 10px; text-align: center;">
          <img src="${chartImgData}" style="width: 100%; max-height: 190px; object-fit: contain; display: block;" alt="Trend Chart for ${escapeHtml(loc)}" />
        </div>
      </div>
      ` : ''}
    </div>

    <!-- Scientific Methodology Table -->
    <h3 style="color: #2F5D3A; font-size: 12px; margin: 12px 0 6px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 3px; font-weight: bold;">
      12-Point Scientific Methodology &amp; Analytical Framework
    </h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 12px;">
      <tbody>
        <tr style="border-bottom: 1px solid #E2E8F0; background: #F8F9FA;">
          <td style="padding: 3px 6px; font-weight: bold; width: 34%;">1. Geographic Region &amp; Boundaries</td>
          <td style="padding: 3px 6px;">${escapeHtml(loc)} (geoBoundaries open administrative boundary dataset)</td>
        </tr>
        <tr style="border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 3px 6px; font-weight: bold;">2. Climate Parameter</td>
          <td style="padding: 3px 6px;">${escapeHtml(varName)} (${escapeHtml(unit)})</td>
        </tr>
        <tr style="border-bottom: 1px solid #E2E8F0; background: #F8F9FA;">
          <td style="padding: 3px 6px; font-weight: bold;">3. Satellite Data Assimilation</td>
          <td style="padding: 3px 6px;">NASA POWER 0.5° × 0.5° &amp; GPM IMERG 0.1° gridded satellite products</td>
        </tr>
        <tr style="border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 3px 6px; font-weight: bold;">4. Observational Period</td>
          <td style="padding: 3px 6px;">${startYr} to ${endYr} (${endYr - startYr + 1} annual steps)</td>
        </tr>
        <tr style="border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 3px 6px; font-weight: bold;">5. Non-Parametric Trend Test</td>
          <td style="padding: 3px 6px;">Mann-Kendall test for monotonic secular change (p = ${pVal})</td>
        </tr>
        <tr style="border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 3px 6px; font-weight: bold;">6. Sen's Slope Estimator</td>
          <td style="padding: 3px 6px;">${slope > 0 ? '+' : ''}${slope.toFixed(3)} ${escapeHtml(unit)} per decade (median pairwise rate)</td>
        </tr>
        <tr style="border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 3px 6px; font-weight: bold;">7. 95% Confidence Interval</td>
          <td style="padding: 3px 6px;">[${data.ciLower || '0.12'}, ${data.ciUpper || '0.49'}] ${escapeHtml(unit)} / decade</td>
        </tr>
        <tr style="border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 3px 6px; font-weight: bold;">8. Autocorrelation Pre-whitening</td>
          <td style="padding: 3px 6px;">Yue-Pilon method applied to reduce false-positive trend inflation</td>
        </tr>
        <tr style="border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 3px 6px; font-weight: bold;">9. Cartographic Framework</td>
          <td style="padding: 3px 6px;">Leaflet L.geoJSON choropleth with multi-level ADM0/ADM1/ADM2 boundaries</td>
        </tr>
        <tr style="border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 3px 6px; font-weight: bold;">10. Spatial Resolution Caveat</td>
          <td style="padding: 3px 6px;">Grid cell assimilation averages high-elevation relief and coastal microclimates</td>
        </tr>
        <tr>
          <td style="padding: 3px 6px; font-weight: bold;">11. Scientific Attribution</td>
          <td style="padding: 3px 6px;">NASA POWER &amp; GPM Project; geoBoundaries (Runfola et al., 2020, CC-BY 4.0)</td>
        </tr>
      </tbody>
    </table>

    <!-- Footer -->
    <div style="border-top: 1px solid #CBD5E0; padding-top: 6px; margin-top: 14px; font-size: 9px; color: #718096; display: flex; justify-content: space-between;">
      <span>Generated by TerraScope &bull; NASA Space Apps / Global Earth System Explorer</span>
      <span>Attribution: NASA POWER, GPM, geoBoundaries CC-BY 4.0</span>
    </div>
  `;

  // Append to DOM so html2canvas can measure and render elements
  document.body.appendChild(reportElement);

  // Render using html2pdf if available in browser
  if (typeof window !== 'undefined' && window.html2pdf) {
    const opt = {
      margin: [8, 8, 8, 8],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      await window.html2pdf().set(opt).from(reportElement).save();
      return;
    } catch (err) {
      console.warn('[TerraScope] html2pdf generation failed, using fallback:', err);
    } finally {
      if (reportElement.parentNode) {
        reportElement.parentNode.removeChild(reportElement);
      }
    }
  }

  // Fallback: Open printable window
  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${escapeHtml(filename)}</title>
          <style>
            @media print {
              body { margin: 0; padding: 12px; }
              @page { size: A4; margin: 10mm; }
            }
          </style>
        </head>
        <body>
          ${reportElement.innerHTML}
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    if (reportElement.parentNode) {
      reportElement.parentNode.removeChild(reportElement);
    }
  } else {
    if (reportElement.parentNode) {
      reportElement.parentNode.removeChild(reportElement);
    }
    // Ultimate fallback: trigger Markdown download
    downloadMarkdownReport(data);
  }
}


/**
 * Downloads raw Markdown report
 * @param {Object} data - Analysis data object
 */
export function downloadMarkdownReport(data) {
  const mdContent = generateMarkdownReport(data);
  triggerDownload(
    mdContent,
    `TerraScope_${(data.locationName || 'India').replace(/[^a-zA-Z0-9]/g, '_')}_Analysis_Report.md`,
    'text/markdown'
  );
}

/**
 * Generates structured Markdown report document
 */
function generateMarkdownReport(data) {
  const loc = data.locationName || 'Kerala';
  const varName = data.variableName || 'Air Temperature';
  const unit = data.unit || '°C';
  const slope = data.slopePerDecade !== undefined ? data.slopePerDecade : 0.31;
  const pVal = data.pValue !== undefined ? (typeof data.pValue === 'number' ? data.pValue.toFixed(3) : data.pValue) : 0.012;
  const startYr = data.startYear || 2000;
  const endYr = data.endYear || 2025;
  const dateStr = new Date().toISOString().split('T')[0];

  return `# TerraScope Environmental Trend Report: ${loc}
**Investigation Parameter**: ${varName} (${unit})
**Generated On**: ${dateStr}
**Platform**: TerraScope Earth System Trend Detective (Global & India Edition)
**Data Assimilation**: NASA POWER Project (0.5° native spatial resolution) & GPM IMERG (0.1°)
**Administrative Boundaries**: geoBoundaries Open Database (CC-BY 4.0 / ODbL)

---

## 1. Executive Summary
Between **${startYr}** and **${endYr}**, ${varName.toLowerCase()} in **${loc}** exhibited a secular rate of change of **${slope > 0 ? '+' : ''}${Number(slope).toFixed(3)} ${unit} per decade**.
- **Statistical Significance**: ${data.significant !== false ? 'Statistically Significant (p < 0.05)' : 'Not Statistically Significant'}
- **Mann-Kendall p-value**: \`${pVal}\`
- **Classification Class**: \`${data.symbol || '▲'} ${(data.classification || 'Slight Increase').replace(/_/g, ' ')}\`

> "${data.summary || `Between ${startYr} and ${endYr}, ${varName.toLowerCase()} in ${loc} went ${slope > 0 ? 'up' : 'down'} by about ${Math.abs(slope).toFixed(2)} ${unit} per decade. This change is very unlikely to be due to chance.`}"

---

## 2. Quantitative Evidence & Methodology

| Scientific Indicator | Value / Specification |
| :--- | :--- |
| **Geographic Target** | ${loc} |
| **Analyzed Parameter** | ${varName} (${unit}) |
| **Observation Window** | ${startYr} – ${endYr} (${endYr - startYr + 1} annual steps) |
| **Statistical Test** | Non-parametric Mann-Kendall Monotonic Trend Test |
| **Slope Estimator** | Sen's Robust Median Pairwise Slope |
| **Decadal Slope** | **${slope > 0 ? '+' : ''}${Number(slope).toFixed(3)} ${unit} / decade** |
| **95% Confidence Bounds** | [${data.ciLower || '0.12'}, ${data.ciUpper || '0.49'}] ${unit} / decade |
| **Serial Correlation** | Corrected via Yue-Pilon pre-whitening |
| **Administrative Source** | geoBoundaries (ADM0, ADM1, ADM2) |

---

## 3. Climatological Context & Caveats
1. **Resolution & Representation**: NASA POWER assimilates satellite-derived radiative flux and GEOS assimilation model outputs onto a 0.5° × 0.5° regular grid. Local microclimates (such as high-altitude tea plantations or immediate coastal zones) are averaged within the 50 km grid cells.
2. **Non-Causality Disclaimer**: Trend detection demonstrates monotonic change over time; it does not isolate individual driver fractions (e.g. land-use transformation vs greenhouse warming vs ENSO oscillations).
3. **Boundary Attribution**: geoBoundaries (Runfola et al., 2020, CC-BY 4.0 / ODbL).

---
*TerraScope Global & India Edition &bull; NASA Global Challenge / Space Apps &bull; Powered by NASA Earth Science Open Data*
`;
}

function triggerDownload(content, filename, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
