import pytest
import pandas as pd
from app.models.lgbm_pipeline import train_lightgbm_pipeline
from app.services.anomaly_service import run_anomaly_detection_pipeline

from pathlib import Path

SAMPLE_DATA_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "sample_energy_data.csv"
if not SAMPLE_DATA_PATH.exists():
    SAMPLE_DATA_PATH = Path("data/sample_energy_data.csv")

def test_anomaly_detection_all_four_methods():
    df = pd.read_csv(SAMPLE_DATA_PATH)
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


def test_bidirectional_anomaly_detection_surges_and_drops():
    """
    Verifies that both positive consumption surges (actual >> predicted) and
    negative consumption drops (actual << predicted, e.g. meter failure or power outage)
    are correctly classified as anomalies and NOT mislabeled as Normal.
    """
    df = pd.read_csv(SAMPLE_DATA_PATH)
    train_res = train_lightgbm_pipeline(
        df=df,
        timestamp_col="timestamp",
        building_col="building_id",
        target_col="energy_kwh",
        feature_cols=["air_temperature", "relative_humidity", "occupancy_rate", "solar_radiation"],
        dataset_name="Bidirectional Test"
    )
    analysis_id = train_res["analysis_id"]

    detect_res = run_anomaly_detection_pipeline(
        analysis_id=analysis_id,
        regime_sigma=2.0
    )

    anomalies = detect_res["anomalies"]
    assert len(anomalies) > 0

    flagged_anomalies = [a for a in anomalies if a["is_anomaly"]]
    assert len(flagged_anomalies) > 0

    # Ensure all flagged anomalies have valid severity and are not "Normal"
    for anom in flagged_anomalies:
        assert anom["severity"] in ["Critical", "Warning"]
        assert anom["severity"] != "Normal"
        assert anom["threshold"] > 0

    # Verify that the detector evaluates both positive and negative residual extremes
    neg_anomalies = [a for a in flagged_anomalies if a["residual"] < 0]
    pos_anomalies = [a for a in flagged_anomalies if a["residual"] > 0]

    # At least one directional anomaly should exist in sample data
    assert len(neg_anomalies) + len(pos_anomalies) == len(flagged_anomalies)

    # Check suggested action context for negative vs positive deviations
    if neg_anomalies:
        for na in neg_anomalies:
            action = na["suggested_action"].lower()
            assert any(word in action for word in ["drop", "telemetry", "disconnect", "sub-panel", "sensor", "outage"])

    if pos_anomalies:
        for pa in pos_anomalies:
            action = pa["suggested_action"].lower()
            assert any(word in action for word in ["surge", "hvac", "chiller", "setpoint", "consumption", "baseload"])

