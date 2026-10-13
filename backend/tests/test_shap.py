import pytest
import pandas as pd
from app.models.lgbm_pipeline import train_lightgbm_pipeline
from app.services.shap_service import compute_shap_explanations

def test_shap_tree_explainer():
    df = pd.read_csv("data/sample_energy_data.csv")
    train_res = train_lightgbm_pipeline(
        df=df,
        timestamp_col="timestamp",
        building_col="building_id",
        target_col="energy_kwh",
        feature_cols=["air_temperature", "relative_humidity", "occupancy_rate", "solar_radiation"],
        dataset_name="SHAP Test"
    )

    analysis_id = train_res["analysis_id"]

    shap_res = compute_shap_explanations(
        analysis_id=analysis_id,
        sample_size=30,
        record_index=0
    )

    assert shap_res["analysis_id"] == analysis_id
    assert "base_value" in shap_res
    assert len(shap_res["global_importance"]) > 0
    assert shap_res["individual_explanation"] is not None
    assert len(shap_res["individual_explanation"]["contributions"]) > 0
    assert "text_summary" in shap_res["individual_explanation"]
    assert "TreeExplainer" not in shap_res["summary_text"] or "SHAP" in shap_res["summary_text"]
