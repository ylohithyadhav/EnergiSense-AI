import pytest
import pandas as pd
from app.models.lgbm_pipeline import (
    train_lightgbm_pipeline, get_analysis_state, engineer_time_features
)

def test_engineer_time_features():
    df = pd.DataFrame({
        "timestamp": ["2024-01-01 14:00:00", "2024-01-06 02:00:00"]
    })
    df_feat = engineer_time_features(df, "timestamp")
    assert "hour" in df_feat.columns
    assert "day_of_week" in df_feat.columns
    assert "is_weekend" in df_feat.columns
    assert df_feat["hour"].iloc[0] == 14
    assert df_feat["is_weekend"].iloc[0] == 0
    assert df_feat["is_weekend"].iloc[1] == 1

from pathlib import Path

SAMPLE_DATA_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "sample_energy_data.csv"
if not SAMPLE_DATA_PATH.exists():
    SAMPLE_DATA_PATH = Path("data/sample_energy_data.csv")

def test_train_lightgbm_pipeline_on_sample_data():
    df = pd.read_csv(SAMPLE_DATA_PATH)
    result = train_lightgbm_pipeline(
        df=df,
        timestamp_col="timestamp",
        building_col="building_id",
        target_col="energy_kwh",
        feature_cols=["air_temperature", "relative_humidity", "occupancy_rate", "solar_radiation"],
        train_split=0.70,
        val_split=0.15,
        test_split=0.15,
        dataset_name="Sample Building Energy"
    )

    assert "analysis_id" in result
    assert result["mae"] > 0
    assert result["rmse"] > 0
    assert result["train_rows"] > 0
    assert result["test_rows"] > 0
    assert len(result["feature_importances"]) > 0
    assert len(result["actual_vs_predicted_preview"]) > 0

    state = get_analysis_state(result["analysis_id"])
    assert state is not None
    assert state["model"] is not None
