import logging
import numpy as np
import pandas as pd
import shap
from typing import Dict, Any, List, Optional
from app.models.lgbm_pipeline import get_analysis_state

logger = logging.getLogger("energisense.shap")

def compute_shap_explanations(
    analysis_id: str,
    sample_size: int = 80,
    record_index: Optional[int] = None
) -> Dict[str, Any]:
    """
    Computes genuine SHAP values for LightGBM model using TreeExplainer.
    Provides global feature impact and optional local waterfall breakdown for a given record.
    """
    state = get_analysis_state(analysis_id)
    if not state:
        raise ValueError(f"Analysis '{analysis_id}' not found.")

    model = state.get("model")
    X_test = state.get("X_test")
    test_meta_df = state.get("test_meta_df")
    feature_names = state.get("feature_names", list(X_test.columns))

    if model is None or X_test is None or test_meta_df is None:
        raise ValueError("ML model or evaluation data missing for SHAP computation.")

    # 1. Take a representative sample for TreeExplainer computation
    sample_n = min(sample_size, len(X_test))
    X_sample = X_test.iloc[:sample_n]

    try:
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X_sample)
        
        # In LightGBM regression, shap_values is a 2D array: (samples, features)
        if isinstance(shap_values, list):
            shap_values = shap_values[0]
            
        base_value = float(explainer.expected_value) if np.isscalar(explainer.expected_value) else float(explainer.expected_value[0])
    except Exception as e:
        logger.error(f"SHAP TreeExplainer calculation error: {e}")
        raise RuntimeError(f"Failed to generate SHAP values: {str(e)}")

    # 2. Global Mean Absolute SHAP values
    mean_abs_shap = np.mean(np.abs(shap_values), axis=0)
    total_shap_mass = np.sum(mean_abs_shap) + 1e-9
    norm_shap = mean_abs_shap / total_shap_mass

    global_importance = [
        {"feature": feat, "importance": round(float(imp), 4)}
        for feat, imp in sorted(zip(feature_names, norm_shap), key=lambda x: x[1], reverse=True)
    ][:12]

    # 3. Individual explanation for selected record or highest anomaly
    individual_exp = None
    if record_index is not None and 0 <= record_index < len(X_test):
        idx = record_index
    else:
        # Default to first anomalous record or first record
        idx = 0
        if "anomaly_records" in state and len(state["anomaly_records"]) > 0:
            for rec in state["anomaly_records"]:
                if rec.get("is_anomaly"):
                    idx = rec["index"]
                    break

    try:
        # Compute exact SHAP values for this specific row
        single_row = X_test.iloc[[idx]]
        single_shap = explainer.shap_values(single_row)
        if isinstance(single_shap, list):
            single_shap = single_shap[0]
        single_shap = single_shap[0]

        meta_row = test_meta_df.iloc[idx]
        bldg = str(meta_row[state["building_col"]])
        ts = str(meta_row["parsed_timestamp"])
        act_val = float(meta_row["actual_energy"])
        pred_val = float(meta_row["predicted_energy"])

        contributions = []
        for feat, val, s_val in zip(feature_names, single_row.iloc[0].values, single_shap):
            clean_val = round(float(val), 2) if isinstance(val, (float, int, np.number)) else str(val)
            contributions.append({
                "feature": feat,
                "feature_value": clean_val,
                "shap_value": round(float(s_val), 3)
            })

        # Sort by absolute impact
        contributions.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        top_contribs = contributions[:10]

        # Natural language summary of model reasoning
        positive_push = [c for c in top_contribs if c["shap_value"] > 0]
        negative_push = [c for c in top_contribs if c["shap_value"] < 0]

        top_pos = positive_push[0]["feature"] if positive_push else "operational factors"
        top_neg = negative_push[0]["feature"] if negative_push else "baseline efficiency"

        summary = (
            f"For {bldg} at {ts}, the base expected load was {base_value:.1f} kWh. "
            f"The model predicted {pred_val:.1f} kWh (actual: {act_val:.1f} kWh). "
            f"The primary factor increasing the prediction was '{top_pos}', while '{top_neg}' exerted the largest downward adjustment."
        )

        individual_exp = {
            "index": idx,
            "building_id": bldg,
            "timestamp": ts,
            "actual_energy": act_val,
            "predicted_energy": pred_val,
            "base_value": round(base_value, 2),
            "contributions": top_contribs,
            "text_summary": summary
        }
    except Exception as e:
        logger.warning(f"Could not compute individual SHAP row explanation: {e}")

    disclaimer = (
        "Note: SHAP attributes model prediction output to input features based on cooperative game theory. "
        "It explains the LightGBM predictive logic and does not replace on-site physical diagnostic inspection."
    )

    return {
        "analysis_id": analysis_id,
        "base_value": round(base_value, 2),
        "global_importance": global_importance,
        "individual_explanation": individual_exp,
        "summary_text": disclaimer
    }
