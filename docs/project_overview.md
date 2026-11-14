# TerraScope: Project Overview & Scientific Mission

## 1. Executive Summary
TerraScope: Earth System Trend Detective (India Edition) is a web-based climate and environmental diagnostics platform developed for the NASA Space Apps / Global Challenge. The application addresses the gap between complex satellite earth observation datasets and the general public, decision-makers, and researchers by synthesizing historical records into interpretable, statistically sound trends.

## 2. Problem Statement
Earth observation satellites and assimilation models produce petabytes of climate data, yet:
1. **Accessibility Barrier**: Data is distributed across disparate specialized archives (NASA POWER, GES DISC, Giovanni, Earthdata).
2. **Interpretability Deficit**: Ordinary citizens, regional planners, and journalists cannot readily distinguish stochastic year-to-year variation from long-term secular trends.
3. **Misrepresentation of Uncertainty**: Without formal statistical testing (e.g. p-values and slope confidence intervals), small noise signals are frequently misinterpreted as catastrophic climate shifts or vice versa.

## 3. Mission Objectives
- **Centralize Multi-Variable Trends**: Provide unified access to air temperature, precipitation, soil wetness, and surface water proxies across Indian states.
- **Enforce Statistical Rigour**: Evaluate all series using non-parametric statistical methods (Mann-Kendall test, Sen's slope estimator) resilient to missing data and non-normal distributions.
- **Deliver Plain-Language Communication**: Translate statistical findings into everyday explanations paired with clear uncertainty statements and hypotheses.
- **Ensure Accessibility**: Provide dual visual encoding (symbols + distinct color palette) ensuring legibility for color-blind individuals.

## 4. Scope and Phasing
- **Current Phase**:
  - Geography: India national view with individual state/union territory breakdown.
  - Spatial resolution: State-level aggregated series via spatial sampling grid and single-coordinate queries.
  - Temporal range: 1981 / 2000 to latest available NASA POWER data.
  - Core variables: Air temperature (2m), total precipitation, and soil moisture index.
- **Future Expansions**:
  - District-level polygon boundaries and localized micro-climate tracking.
  - Integration of high-resolution SAR water extent (SWOT, Sentinel-1).
  - Validated predictive forecasting with uncertainty bounds.
