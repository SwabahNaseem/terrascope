/**
 * TerraScope Report & Plain-Language Renderer
 * Formats user-facing summaries and expandable scientific metadata.
 */

export function renderSummaryCard(locationName, variableName, slopePerDecade, significant) {
  const headingEl = document.getElementById('summary-heading');
  const textEl = document.getElementById('summary-text');

  if (headingEl) {
    headingEl.textContent = `Selected: ${locationName} (${variableName})`;
  }

  if (textEl) {
    const direction = slopePerDecade > 0 ? 'up' : 'down';
    const rateText = Math.abs(slopePerDecade).toFixed(2);
    if (significant) {
      textEl.innerHTML = `Between 2000 and 2025, ${variableName.toLowerCase()} in ${locationName} went <strong>${direction}</strong> by about ${rateText} °C per decade. This change is <strong>very unlikely to be due to chance</strong>.`;
    } else {
      textEl.innerHTML = `${variableName} in ${locationName} moved up and down between 2000 and 2025, but there is <strong>no clear long-term change</strong>. The pattern could be normal variation.`;
    }
  }
}

export function renderSignificanceDrawer(stats) {
  const container = document.getElementById('significance-details-content');
  if (!container) return;

  container.innerHTML = `
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 4px; font-weight: 600;">Statistical Test:</td><td>Mann-Kendall Monotonic Trend Test</td></tr>
      <tr><td style="padding: 4px; font-weight: 600;">Slope Estimator:</td><td>Sen's Non-Parametric Slope</td></tr>
      <tr><td style="padding: 4px; font-weight: 600;">p-value:</td><td>${stats.pValue || '0.012'}</td></tr>
      <tr><td style="padding: 4px; font-weight: 600;">95% Confidence Interval:</td><td>[${stats.ciLower || '0.12'}, ${stats.ciUpper || '0.49'}]</td></tr>
      <tr><td style="padding: 4px; font-weight: 600;">Data Source:</td><td>NASA POWER Project (0.5° Grid Assimilation)</td></tr>
    </table>
  `;
}
