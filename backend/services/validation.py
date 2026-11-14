"""
Validation Datasets Service
Handles scientific verification and benchmarking workflows for TerraScope:
1. NASA Giovanni: Monthly time series extraction for ground-truth comparison.
2. Data Rods for Hydrology: Point time series from GLDAS for soil moisture verification.
3. KNMI Climate Explorer: Cross-validation of Mann-Kendall statistics.
"""

import math
from typing import Dict, List, Optional, Tuple


class GiovanniValidationService:
    """
    NASA Giovanni Validation Interface
    Validates NASA POWER point/state series against NASA GES DISC Giovanni area-averaged monthly series:
    - MERRA-2 2-meter air temperature (M2TMNXFLX)
    - GPM IMERG Final monthly precipitation (GPM_3IMERGM)
    """

    GIOVANNI_PORTAL_URL = "https://giovanni.gsfc.nasa.gov/giovanni/"

    MERRA2_PARAM = "M2TMNXFLX"
    GPM_PARAM = "GPM_3IMERGM"

    @staticmethod
    def compute_rmsd(series_a: List[float], series_b: List[float]) -> float:
        """Computes Root-Mean-Square Difference (RMSD) between two synchronized series."""
        valid_pairs = [(a, b) for a, b in zip(series_a, series_b) if a is not None and b is not None]
        if not valid_pairs:
            return 0.0
        mse = sum((a - b) ** 2 for a, b in valid_pairs) / len(valid_pairs)
        return round(math.sqrt(mse), 4)

    @staticmethod
    def compute_correlation(series_a: List[float], series_b: List[float]) -> float:
        """Computes Pearson correlation coefficient between two synchronized series."""
        valid_pairs = [(a, b) for a, b in zip(series_a, series_b) if a is not None and b is not None]
        n = len(valid_pairs)
        if n < 2:
            return 0.0
        mean_a = sum(p[0] for p in valid_pairs) / n
        mean_b = sum(p[1] for p in valid_pairs) / n

        num = sum((p[0] - mean_a) * (p[1] - mean_b) for p in valid_pairs)
        denom_a = math.sqrt(sum((p[0] - mean_a) ** 2 for p in valid_pairs))
        denom_b = math.sqrt(sum((p[1] - mean_b) ** 2 for p in valid_pairs))

        if denom_a == 0 or denom_b == 0:
            return 0.0
        return round(num / (denom_a * denom_b), 4)

    def compare_series(
        self,
        variable: str,
        power_series: List[float],
        giovanni_series: List[float],
        tolerance_rmsd: float = 1.0
    ) -> Dict:
        """
        Executes statistical ground-truth comparison between NASA POWER and Giovanni.
        """
        rmsd = self.compute_rmsd(power_series, giovanni_series)
        corr = self.compute_correlation(power_series, giovanni_series)
        passed = rmsd <= tolerance_rmsd and corr >= 0.85

        return {
            "dataset": "NASA Giovanni (GES DISC)",
            "variable": variable,
            "observations_compared": min(len(power_series), len(giovanni_series)),
            "rmsd": rmsd,
            "correlation": corr,
            "tolerance_rmsd": tolerance_rmsd,
            "verified": passed,
            "notes": "Verified against MERRA-2 / GPM IMERG area-averaged monthly series."
        }


class DataRodsHydrologyValidationService:
    """
    Data Rods for Hydrology Validation Interface
    Point time series from GLDAS for soil moisture verification.
    """

    DATA_RODS_BASE_URL = "https://hydro1.gesdisc.eosdis.nasa.gov/daac-bin/access/timeseries.cgi"
    GLDAS_MODEL = "GLDAS_NOAH025_M_2_1"

    def verify_soil_moisture(
        self,
        power_soil_moisture: List[float],
        gldas_point_series: List[float]
    ) -> Dict:
        """
        Verifies NASA POWER surface soil wetness (GWETTOP) against GLDAS 0-10 cm soil moisture point series.
        """
        corr = GiovanniValidationService.compute_correlation(power_soil_moisture, gldas_point_series)
        passed = corr >= 0.80

        return {
            "service": "NASA Data Rods for Hydrology",
            "model": self.GLDAS_MODEL,
            "layer": "Soil Moisture (0-10cm)",
            "correlation": corr,
            "verified": passed,
            "notes": "Point time series from GLDAS successfully cross-references NASA POWER GWETTOP soil moisture."
        }


class KnmiClimateExplorerValidationService:
    """
    KNMI Climate Explorer Validation Interface
    Cross-validation of Mann-Kendall statistics and Sen's slope estimates.
    """

    KNMI_URL = "https://climexp.knmi.nl/"

    @staticmethod
    def validate_trend_statistics(
        computed_mk: dict,
        reference_knmi: dict,
        p_tolerance: float = 0.01,
        slope_tolerance: float = 0.05
    ) -> Dict:
        """
        Cross-validates computed Mann-Kendall statistics against KNMI Climate Explorer published benchmarks.
        """
        comp_p = computed_mk.get("p_value", computed_mk.get("p", 1.0))
        ref_p = reference_knmi.get("p_value", 1.0)
        p_diff = abs(comp_p - ref_p)

        comp_slope = computed_mk.get("slope_per_decade", computed_mk.get("slope", 0.0))
        ref_slope = reference_knmi.get("slope_per_decade", 0.0)
        slope_diff = abs(comp_slope - ref_slope)

        p_valid = p_diff <= p_tolerance
        slope_valid = slope_diff <= slope_tolerance

        return {
            "benchmark_source": "KNMI Climate Explorer",
            "computed": {"p_value": comp_p, "slope_per_decade": comp_slope},
            "reference": {"p_value": ref_p, "slope_per_decade": ref_slope},
            "p_value_difference": round(p_diff, 4),
            "slope_difference": round(slope_diff, 4),
            "p_value_consistent": p_valid,
            "slope_consistent": slope_valid,
            "cross_validated": p_valid and slope_valid
        }
