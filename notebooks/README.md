# TerraScope Scientific Validation Notebooks

This directory contains analytical and cross-validation workflows used to benchmark TerraScope calculations against external NASA systems and peer-reviewed climate tools.

---

## Workflows

### 1. `giovanni_validation.ipynb`
- **Objective**: Compare state aggregate time series from NASA POWER with NASA GES DISC Giovanni area-averaged monthly series.
- **Variables Evaluated**:
  - `T2M` (POWER) vs MERRA-2 Monthly Mean Temperature (`M2TMNXFLX`).
  - `PRECTOTCORR` (POWER) vs GPM IMERG Final Monthly Precipitation (`GPM_3IMERGM`).
- **Statistical Tests**: Cross-correlation, root-mean-square difference (RMSD), and difference in Sen's slope estimates.

---

## Running Notebooks
```bash
# Ensure Jupyter is installed
pip install jupyter matplotlib

# Launch JupyterLab or Notebook
jupyter notebook notebooks/
```
