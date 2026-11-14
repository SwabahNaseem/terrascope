# NASA Space Apps / Global Challenge Submission Notes

## 1. Project Title
**TerraScope: Earth System Trend Detective (India Edition)**

## 2. One-Line Description
An interactive Earth system diagnostics platform that translates complex satellite climate observations across India into plain-language, statistically verified historical trends.

## 3. Challenge Theme & Track
- **Challenge Track**: Earth Observation Data Democratization / Climate Indicators
- **Target Geography**: India (National Overview & State-Wise Drill-Down)

## 4. NASA Earth Science Data Utilized
1. **NASA POWER (Prediction Of Worldwide Energy Resources)**:
   - Near-surface air temperature at 2 meters (`T2M`)
   - Precipitation corrected (`PRECTOTCORR`)
   - Surface soil wetness (`GWETTOP`) and root zone soil wetness (`GWETROOT`)
2. **NASA Giovanni**:
   - MERRA-2 monthly air temperature and GPM IMERG monthly precipitation used for ground-truth validation.
3. **NASA Data Rods for Hydrology (GLDAS)**:
   - Hydrological soil moisture cross-verification.

## 5. Statistical Rigour & Innovations
- Replaces naive ordinary least squares with **Mann-Kendall monotonic trend testing** and **Sen's robust slope estimator**, mitigating false positives caused by extreme weather anomalies.
- Reports **95% confidence intervals** alongside trend rates.
- Dual visual encoding (colors + text symbols `▲▲`, `▲`, `=`, `▼`, `▼▼`) ensuring accessibility for color-blind users.
- Automated translation of statistical outputs into everyday plain-language narrative sentences.

## 6. Open Decisions & Roadmap
- Surface water evaluation: Currently represented via soil wetness proxy; SWOT high-resolution lake extent integration planned for Phase 6.
- District-level expansion: Planned following validation of national state-level sampling grid.
