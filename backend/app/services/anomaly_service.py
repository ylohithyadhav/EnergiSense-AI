import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from sklearn.ensemble import IsolationForest
from sklearn.metrics import (
    precision_score, recall_score, f1_score,
    precision_recall_curve, roc_auc_score, auc
)
from app.models.lgbm_pipeline import get_analysis_state, verify_analysis_ownership

def calculate_supervised_metrics(y_true: np.ndarray, y_pred: np.ndarray, scores: np.ndarray) -> Dict[str, float]:
    """
    Computes Precision, Recall, F1, PR-AUC, ROC-AUC, and FPR per 1,000 normals.
    """
    prec = float(precision_score(y_true, y_pred, zero_division=0))
    rec = float(recall_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))

    try:
        roc = float(roc_auc_score(y_true, scores))
    except Exception:
        roc = 0.5

    try:
        precision_arr, recall_arr, _ = precision_recall_curve(y_true, scores)
        pr_auc = float(auc(recall_arr, precision_arr))
    except Exception:
        pr_auc = 0.0

    # False positives per 1,000 normal samples
    normal_mask = (y_true == 0)
    normal_count = int(np.sum(normal_mask))
    if normal_count > 0:
        fp_count = int(np.sum((y_pred == 1) & normal_mask))
        fp_per_1000 = float((fp_count / normal_count) * 1000.0)
    else:
        fp_per_1000 = 0.0

    return {
        "precision": round(prec, 3),
        "recall": round(rec, 3),
        "f1_score": round(f1, 3),
        "pr_auc": round(pr_auc, 3),
        "roc_auc": round(roc, 3),
        "false_positives_per_1000": round(fp_per_1000, 2)
    }

def generate_investigation_steps(row: pd.Series, regime: str, severity: str) -> str:
    residual = row.get("residual", 0.0)
    bldg = row.get("building_id", "Building")
    
    if "Night" in regime or "Weekend" in regime:
        if residual > 0:
            return f"Inspect off-hours baseload in {bldg}. Check BAS/BMS schedules for HVAC fans or lighting left running."
        else:
            return f"Verify meter/sensor connectivity for {bldg}. Reading dropped below expected night baseline."
    elif "HighCooling" in regime:
        return f"Thermal peak stress in {bldg}. Verify chiller COP, condenser water loop temperature, and VAV damper airflow."
    elif severity == "Critical":
        return f"Severe consumption deviation ({residual:+.1f} kWh). Immediate facility walk-through and breaker telemetry audit recommended."
    else:
        return f"Moderate deviation during {regime}. Monitor subsequent hourly intervals for persistence."

def run_anomaly_detection_pipeline(
    analysis_id: str,
    global_sigma: float = 3.0,
    rolling_window: int = 24,
    rolling_sigma: float = 2.5,
    isolation_forest_contamination: float = 0.03,
    regime_sigma: float = 2.5,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    state = verify_analysis_ownership(analysis_id, user_id=user_id)

    test_meta_df = state["test_meta_df"].copy()
    y_val = state["y_val"]
    y_val_pred = state["y_val_pred"]
    val_residuals = y_val - y_val_pred

    test_residuals = test_meta_df["residual"].values
    y_test = state["y_test"]
    y_test_pred = state["y_test_pred"]
    n_samples = len(test_meta_df)

    # Check if ground truth labels exist in dataset
    ground_truth_col = next((c for c in test_meta_df.columns if "anomaly" in c.lower() and c != "residual"), None)
    has_ground_truth = ground_truth_col is not None
    y_true = test_meta_df[ground_truth_col].values.astype(int) if has_ground_truth else None

    # ========================================================
    # METHOD 1: GLOBAL RESIDUAL THRESHOLD
    # Derived strictly from validation residuals (no test leakage)
    # ========================================================
    val_res_mean = float(np.mean(val_residuals))
    val_res_std = float(np.std(val_residuals)) + 1e-6
    global_thresh = val_res_mean + (global_sigma * val_res_std)
    
    # Flags if positive residual exceeds threshold (consumption runaway)
    flags_global = (test_residuals > global_thresh).astype(int)
    scores_global = np.clip((test_residuals - val_res_mean) / val_res_std, 0, 10)

    # ========================================================
    # METHOD 2: ROLLING RESIDUAL THRESHOLD
    # Rolling window over past residuals per building (strictly past observations)
    # ========================================================
    flags_rolling = np.zeros(n_samples, dtype=int)
    scores_rolling = np.zeros(n_samples, dtype=float)

    bldg_col = state["building_col"]
    for bldg, group in test_meta_df.groupby(bldg_col):
        res_series = pd.Series(group["residual"].values)
        roll_mean = res_series.rolling(window=rolling_window, min_periods=3).mean().shift(1).fillna(val_res_mean)
        roll_std = res_series.rolling(window=rolling_window, min_periods=3).std().shift(1).fillna(val_res_std)
        
        dyn_thresh = roll_mean + (rolling_sigma * (roll_std + 1e-6))
        bldg_flags = (res_series > dyn_thresh).astype(int).values
        bldg_scores = np.clip((res_series - roll_mean) / (roll_std + 1e-6), 0, 10).values
        
        flags_rolling[group.index] = bldg_flags
        scores_rolling[group.index] = bldg_scores

    # ========================================================
    # METHOD 3: ISOLATION FOREST
    # Unsupervised multivariate tree partitioning
    # ========================================================
    iforest_features = ["actual_energy", "predicted_energy", "residual", "hour", "is_weekend"]
    if "air_temperature" in test_meta_df.columns:
        iforest_features.append("air_temperature")
        
    X_iforest = test_meta_df[iforest_features].fillna(0)
    
    iso_model = IsolationForest(
        n_estimators=100,
        contamination=float(isolation_forest_contamination),
        random_state=42
    )
    iso_model.fit(X_iforest)
    iso_raw = iso_model.decision_function(X_iforest)
    # Convert decision function to anomaly score (higher = more anomalous)
    scores_iforest = np.clip(-iso_raw * 5.0 + 0.5, 0, 10)
    flags_iforest = (iso_model.predict(X_iforest) == -1).astype(int)

    # ========================================================
    # METHOD 4: PROPOSED REGIME-AWARE ADAPTIVE METHOD
    # Regime-specific residual thresholds fitted on validation data
    # ========================================================
    # Compute regime threshold lookup table from validation data
    val_regimes = state["X_val"]["regime"] if "regime" in state["X_val"] else test_meta_df["regime"]
    
    regime_stats = {}
    for r in test_meta_df["regime"].unique():
        # Find matching validation residuals
        matching_mask = (val_regimes == r).values if len(val_regimes) == len(val_residuals) else np.ones(len(val_residuals), dtype=bool)
        if np.sum(matching_mask) >= 5:
            r_mean = float(np.mean(val_residuals[matching_mask]))
            r_std = float(np.std(val_residuals[matching_mask])) + 1e-6
        else:
            r_mean = val_res_mean
            r_std = val_res_std
            
        regime_stats[r] = {
            "mean": r_mean,
            "std": r_std,
            "thresh": r_mean + (regime_sigma * r_std)
        }

    flags_regime = np.zeros(n_samples, dtype=int)
    scores_regime = np.zeros(n_samples, dtype=float)
    thresholds_applied = np.zeros(n_samples, dtype=float)

    for i, (_, row) in enumerate(test_meta_df.iterrows()):
        r = row["regime"]
        stats = regime_stats.get(r, {"mean": val_res_mean, "std": val_res_std, "thresh": global_thresh})
        thresh = stats["thresh"]
        res = row["residual"]
        thresholds_applied[i] = thresh
        
        if res > thresh:
            flags_regime[i] = 1
        scores_regime[i] = np.clip((res - stats["mean"]) / stats["std"], 0, 10)

    # Compile Method Comparisons
    methods = [
        ("Global Residual Threshold", flags_global, scores_global),
        ("Rolling Residual Threshold", flags_rolling, scores_rolling),
        ("Isolation Forest", flags_iforest, scores_iforest),
        ("Proposed Regime-Aware Adaptive", flags_regime, scores_regime),
    ]

    method_comparison_list = []
    for name, flags, scores in methods:
        detected_count = int(np.sum(flags))
        det_rate = round(float(detected_count / n_samples) * 100, 2)
        
        item = {
            "method_name": name,
            "anomalies_detected": detected_count,
            "detection_rate_pct": det_rate,
            "precision": None,
            "recall": None,
            "f1_score": None,
            "pr_auc": None,
            "roc_auc": None,
            "false_positives_per_1000": None
        }
        
        if has_ground_truth:
            metrics = calculate_supervised_metrics(y_true, flags, scores)
            item.update(metrics)
            
        method_comparison_list.append(item)

    # Anomaly records construction
    anomaly_records = []
    regime_distribution = {}
    anomalies_by_building = {}

    for i in range(n_samples):
        row = test_meta_df.iloc[i]
        is_glob = bool(flags_global[i])
        is_roll = bool(flags_rolling[i])
        is_ifo = bool(flags_iforest[i])
        is_reg = bool(flags_regime[i])
        
        is_any_anomaly = (is_reg or is_ifo or is_roll or is_glob)
        agreement_count = sum([is_glob, is_roll, is_ifo, is_reg])
        
        # Severity
        if agreement_count >= 3 or (is_reg and scores_regime[i] > 3.8):
            severity = "Critical"
        elif is_any_anomaly:
            severity = "Warning"
        else:
            severity = "Normal"

        r = str(row["regime"])
        regime_distribution[r] = regime_distribution.get(r, 0) + 1

        bldg = str(row[state["building_col"]])
        if is_any_anomaly:
            anomalies_by_building[bldg] = anomalies_by_building.get(bldg, 0) + 1

        investigation = generate_investigation_steps(row, r, severity)

        anomaly_records.append({
            "index": i,
            "building_id": bldg,
            "timestamp": str(row["parsed_timestamp"]),
            "actual_energy": round(float(row["actual_energy"]), 2),
            "predicted_energy": round(float(row["predicted_energy"]), 2),
            "residual": round(float(row["residual"]), 2),
            "regime": r,
            "threshold": round(float(thresholds_applied[i]), 2),
            "anomaly_score": round(float(scores_regime[i]), 2),
            "severity": severity,
            "detected_by_global": is_glob,
            "detected_by_rolling": is_roll,
            "detected_by_iforest": is_ifo,
            "detected_by_regime": is_reg,
            "is_anomaly": is_any_anomaly,
            "suggested_action": investigation
        })

    # Cache anomaly results inside state
    state["anomaly_records"] = anomaly_records
    state["method_comparison"] = method_comparison_list

    return {
        "analysis_id": analysis_id,
        "total_samples": n_samples,
        "ground_truth_available": has_ground_truth,
        "method_comparison": method_comparison_list,
        "anomalies": anomaly_records,
        "regime_distribution": regime_distribution,
        "anomalies_by_building": anomalies_by_building
    }
