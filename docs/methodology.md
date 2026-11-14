# Scientific Methodology & Statistical Framework

## 1. Overview
TerraScope employs non-parametric statistical methods to detect secular trends in environmental time series. Because Earth system measurements frequently exhibit skewness, non-normal error distributions, seasonal cycles, and sensor gaps, parametric regression (ordinary least squares) is generally inappropriate without strict transformations.

## 2. Statistical Pipeline

### 2.1 Mann-Kendall Trend Test
The Mann-Kendall (MK) test evaluates whether a monotonic upward or downward trend exists in a time series:
- Null Hypothesis ($H_0$): The data points are independent and identically distributed (no monotonic trend).
- Alternative Hypothesis ($H_1$): A monotonic upward or downward trend is present.
- Significance Level: Default $\alpha = 0.05$. Trends with $p < 0.05$ are classified as statistically significant.

### 2.2 Sen's Slope Estimator
The rate of change is computed using Sen's non-parametric slope estimator:
$$\beta = \text{median}\left(\frac{x_j - x_k}{j - k}\right) \quad \forall j > k$$
Sen's slope is robust to outliers and extreme anomalous weather events (e.g. cloudbursts or heatwaves).

### 2.3 Confidence Intervals
A 95% two-sided non-parametric confidence interval is computed around the Sen's slope estimate, providing an explicit uncertainty envelope.

### 2.4 Seasonal Adjustment & Autocorrelation
- Monthly series are aggregated to annual or seasonal aggregates (Monsoon: Jun-Sep; Post-Monsoon: Oct-Dec; Winter: Jan-Feb; Pre-Monsoon: Mar-May).
- When serial autocorrelation is detected, pre-whitening or the Modified Mann-Kendall test (Yue & Wang approach) is applied to mitigate false-positive trend inflation.

## 3. Direction and Strength Classification

Trends are categorized into five distinct classes based on statistical significance and magnitude thresholds:

| Class Key | Display Name | Mathematical Criteria | Visual Symbol | Suggested Color |
|---|---|---|---|---|
| `strong_increase` | Strong Increase | $p < 0.05$ and $|\text{rate}| \ge \theta_{\text{strong}}$ (positive) | ▲▲ | Deep Terracotta (`#A8461F`) |
| `slight_increase` | Slight Increase | $p < 0.05$ and $0 < |\text{rate}| < \theta_{\text{strong}}$ (positive) | ▲ | Light Terracotta (`#E3A27F`) |
| `no_clear_change` | No Clear Change | $p \ge 0.05$ (insignificant trend) | = | Neutral Beige (`#D9D2BF`) |
| `slight_decrease` | Slight Decrease | $p < 0.05$ and $0 < |\text{rate}| < \theta_{\text{strong}}$ (negative) | ▼ | Light Sage (`#B7C7A3`) |
| `strong_decrease` | Strong Decrease | $p < 0.05$ and $|\text{rate}| \ge \theta_{\text{strong}}$ (negative) | ▼▼ | Forest Green (`#2F5D3A`) |
| `no_data` | Insufficient Data | $N < N_{\text{min}}$ or missing observations | n/a | Hatched Ivory |

### Variable-Specific Thresholds ($\theta_{\text{strong}}$)
- **Air Temperature (`T2M`)**: $\theta_{\text{strong}} = 0.25^\circ\text{C}$ per decade.
- **Precipitation (`PRECTOTCORR`)**: $\theta_{\text{strong}} = 5\%$ per decade relative to baseline mean.
- **Soil Wetness (`GWETTOP`)**: $\theta_{\text{strong}} = 0.05$ change in fraction per decade.

## 4. Scientific Integrity & Limitations
- **Resolution Limit**: NASA POWER native resolution is approximately $0.5^\circ \times 0.5^\circ$ (~50 km). Micro-climatic valley variations are smoothed.
- **Model Assimilation vs Ground Truth**: POWER blends satellite observations with GEOS-FP numerical assimilation; values represent gridded estimates rather than local in-situ rain gauges.
- **Causality Disclaimer**: Detected trends indicate statistical association, not attribution to specific localized human or climatic causes.
