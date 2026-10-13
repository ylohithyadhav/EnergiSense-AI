import pytest
import pandas as pd
from app.models.lgbm_pipeline import train_lightgbm_pipeline
from app.services.anomaly_service import run_anomaly_detection_pipeline

def test_anomaly_detection_all_four_methods():
    df = pd.read_csv("data/sample_energy_data.csv")
    train_res = train_lightgbm_pipeline(
        df=df,
        timestamp_col="timestamp",
        building_col="building_id",
        target_col="energy_kwh",
        feature_cols=["air_temperature", "relative_humidity", "occupancy_rate", "solar_radiation"],
        dataset_name="Test Energy Data"
    )

    analysis_id = train_res["analysis_id"]

    detect_res = run_anomaly_detection_pipeline(
        analysis_id=analysis_id,
        global_sigma=3.0,
        rolling_window=24,
        rolling_sigma=2.5,
        isolation_forest_contamination=0.03,
        regime_sigma=2.5
    )

    assert detect_res["analysis_id"] == analysis_id
    assert detect_res["total_samples"] > 0
    assert len(detect_res["method_comparison"]) == 4

    method_names = [m["method_name"] for m in detect_res["method_comparison"]]
    assert "Global Residual Threshold" in method_names
    assert "Rolling Residual Threshold" in method_names
    assert "Isolation Forest" in method_names
    assert "Proposed Regime-Aware Adaptive" in method_names

    # Check that anomalies have all required attributes
    assert len(detect_res["anomalies"]) > 0
    first_anomaly = detect_res["anomalies"][0]
    assert "residual" in first_anomaly
    assert "regime" in first_anomaly
    assert "severity" in first_anomaly
    assert "suggested_action" in first_anomaly
    assert "anomaly_score" in first_anomaly
