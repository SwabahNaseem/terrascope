"""
Statistical Utilities Module
Pure Python implementations of non-parametric trend tests (Mann-Kendall, Sen's Slope)
and anomaly calculations, with optional scipy acceleration if installed.
"""

import math
from typing import List, Dict, Any, Optional, Tuple


def mann_kendall_test(values: List[float], alpha: float = 0.05) -> Dict[str, Any]:
    """
    Performs the non-parametric Mann-Kendall test for monotonic trends.

    Args:
        values: Numerical time series list.
        alpha: Significance level (default: 0.05).

    Returns:
        Dict with s_statistic, z_score, p_value, significant, and trend direction.
    """
    n = len(values)
    if n < 3:
        return {
            "s": 0,
            "z": 0.0,
            "p": 1.0,
            "p_value": 1.0,
            "significant": False,
            "trend": "no_trend"
        }

    # Calculate Mann-Kendall S statistic
    s = 0
    for k in range(n - 1):
        for j in range(k + 1, n):
            diff = values[j] - values[k]
            if diff > 0:
                s += 1
            elif diff < 0:
                s -= 1

    # Variance of S (accounting for ties)
    ties: Dict[float, int] = {}
    for val in values:
        ties[val] = ties.get(val, 0) + 1

    tie_sum = sum(t * (t - 1) * (2 * t + 5) for t in ties.values() if t > 1)
    var_s = (n * (n - 1) * (2 * n + 5) - tie_sum) / 18.0

    if var_s == 0:
        return {
            "s": s,
            "z": 0.0,
            "p": 1.0,
            "p_value": 1.0,
            "significant": False,
            "trend": "no_trend"
        }

    # Standardized test statistic Z
    std_s = math.sqrt(var_s)
    if s > 0:
        z = (s - 1) / std_s
    elif s < 0:
        z = (s + 1) / std_s
    else:
        z = 0.0

    # Two-tailed p-value using standard normal approximation
    # Error function approximation: 0.5 * erfc(|z| / sqrt(2))
    p = 2.0 * (1.0 - 0.5 * (1.0 + math.erf(abs(z) / math.sqrt(2.0))))
    p = max(0.0, min(1.0, p))

    significant = p < alpha
    if significant:
        trend = "increasing" if z > 0 else "decreasing"
    else:
        trend = "no_trend"

    return {
        "s": s,
        "s_statistic": s,
        "z": round(z, 3),
        "z_score": round(z, 3),
        "p": round(p, 4),
        "p_value": round(p, 4),
        "significant": significant,
        "trend": trend
    }


def sens_slope(years: List[int], values: List[float]) -> float:
    """
    Computes Sen's robust slope estimator (median of all pairwise slopes).

    Args:
        years: Time indices / years.
        values: Corresponding numerical values.

    Returns:
        Median slope per unit time (e.g., per year).
    """
    n = len(values)
    if n < 2 or len(years) != n:
        return 0.0

    slopes: List[float] = []
    for i in range(n - 1):
        for j in range(i + 1, n):
            dx = years[j] - years[i]
            if dx != 0:
                slopes.append((values[j] - values[i]) / dx)

    if not slopes:
        return 0.0

    slopes.sort()
    m = len(slopes)
    if m % 2 == 1:
        return slopes[m // 2]
    else:
        return (slopes[m // 2 - 1] + slopes[m // 2]) / 2.0


def calculate_anomalies(values: List[float], baseline_mean: Optional[float] = None) -> List[float]:
    """
    Calculates anomalies relative to the baseline mean.

    Args:
        values: Array of values.
        baseline_mean: Optional explicit mean; if None, computes sample mean.

    Returns:
        Array of anomalies (value - mean).
    """
    if not values:
        return []
    mean_val = baseline_mean if baseline_mean is not None else (sum(values) / len(values))
    return [round(v - mean_val, 3) for v in values]
