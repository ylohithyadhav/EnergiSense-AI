import pytest
import pandas as pd
from app.models.lgbm_pipeline import train_lightgbm_pipeline
from app.services.shap_service import compute_shap_explanations

from pathlib import Path

SAMPLE_DATA_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "sample_energy_data.csv"
if not SAMPLE_DATA_PATH.exists():
    SAMPLE_DATA_PATH = Path("data/sample_energy_data.csv")

def test_shap_tree_explainer():
    df = pd.read_csv(SAMPLE_DATA_PATH)
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

def test_shap_ownership_enforcement():
    df = pd.read_csv(SAMPLE_DATA_PATH)
    owner_uid = "firebase-user-owner"
    other_uid = "firebase-user-attacker"

    train_res = train_lightgbm_pipeline(
        df=df,
        timestamp_col="timestamp",
        building_col="building_id",
        target_col="energy_kwh",
        feature_cols=["air_temperature", "relative_humidity", "occupancy_rate", "solar_radiation"],
        dataset_name="SHAP Ownership Test",
        user_id=owner_uid
    )
    analysis_id = train_res["analysis_id"]

    # 1. Owner access succeeds
    owner_shap = compute_shap_explanations(
        analysis_id=analysis_id,
        sample_size=20,
        record_index=0,
        user_id=owner_uid
    )
    assert owner_shap["analysis_id"] == analysis_id
    assert len(owner_shap["global_importance"]) > 0

    # 2. Unauthorized user access raises PermissionError
    with pytest.raises(PermissionError) as exc_info:
        compute_shap_explanations(
            analysis_id=analysis_id,
            sample_size=20,
            record_index=0,
            user_id=other_uid
        )
    assert f"Access denied to analysis '{analysis_id}'" in str(exc_info.value)

    # 3. Nonexistent analysis ID raises ValueError
    nonexistent_id = "nonexistent-analysis-00000000"
    with pytest.raises(ValueError) as exc_info:
        compute_shap_explanations(
            analysis_id=nonexistent_id,
            sample_size=20,
            record_index=0,
            user_id=owner_uid
        )
    assert f"Analysis '{nonexistent_id}' not found" in str(exc_info.value)

def test_shap_mathematical_additivity_and_alignment():
    """
    Verifies SHAP local additivity (efficiency property of Shapley values):
    base_value + sum(all SHAP values) == model.predict(x) within floating point tolerance.
    Also verifies feature alignment and metadata synchronization.
    """
    import numpy as np
    import shap
    from app.models.lgbm_pipeline import get_analysis_state

    df = pd.read_csv(SAMPLE_DATA_PATH)
    train_res = train_lightgbm_pipeline(
        df=df,
        timestamp_col="timestamp",
        building_col="building_id",
        target_col="energy_kwh",
        feature_cols=["air_temperature", "relative_humidity", "occupancy_rate", "solar_radiation"],
        dataset_name="SHAP Additivity Test"
    )
    analysis_id = train_res["analysis_id"]
    state = get_analysis_state(analysis_id)
    assert state is not None

    model = state["model"]
    X_test = state["X_test"]
    test_meta_df = state["test_meta_df"]
    feature_names = state["feature_names"]

    explainer = shap.TreeExplainer(model)
    base_value = float(explainer.expected_value) if np.isscalar(explainer.expected_value) else float(explainer.expected_value[0])

    # Test exact mathematical additivity across multiple test rows
    for test_idx in [0, 1, 5, 10]:
        single_row = X_test.iloc[[test_idx]]
        pred = float(model.predict(single_row)[0])
        s_vals = explainer.shap_values(single_row)
        if isinstance(s_vals, list):
            s_vals = s_vals[0]
        s_vals = s_vals[0]

        total_shap_sum = float(np.sum(s_vals))
        reconstructed_pred = base_value + total_shap_sum
        abs_diff = abs(reconstructed_pred - pred)

        # Tolerance: must match model prediction within floating point precision (< 1e-6)
        assert abs_diff < 1e-6, f"SHAP additivity failed for row {test_idx}: reconstructed={reconstructed_pred}, pred={pred}, diff={abs_diff}"

        # Verify via compute_shap_explanations service
        exp_res = compute_shap_explanations(analysis_id, record_index=test_idx)
        ind_exp = exp_res["individual_explanation"]
        assert ind_exp is not None
        assert ind_exp["index"] == test_idx
        assert round(ind_exp["predicted_energy"], 2) == round(pred, 2)
        assert round(ind_exp["actual_energy"], 2) == round(float(test_meta_df.iloc[test_idx]["actual_energy"]), 2)
        assert ind_exp["building_id"] == str(test_meta_df.iloc[test_idx][state["building_col"]])
        assert ind_exp["timestamp"] == str(test_meta_df.iloc[test_idx]["parsed_timestamp"])

        # Check contribution feature values match the row's actual inputs
        for contrib in ind_exp["contributions"]:
            feat_name = contrib["feature"]
            assert feat_name in feature_names
            expected_val = single_row.iloc[0][feat_name]
            clean_expected = round(float(expected_val), 2) if isinstance(expected_val, (float, int, np.number)) else str(expected_val)
            assert str(contrib["feature_value"]) == str(clean_expected)

def test_shap_global_importance_properties():
    """
    Verifies that global SHAP feature importances:
    1. Are finite, non-negative numbers.
    2. Are sorted in descending order of impact.
    3. Sum to approximately 1.0 (since they represent normalized proportions).
    """
    import numpy as np

    df = pd.read_csv(SAMPLE_DATA_PATH)
    train_res = train_lightgbm_pipeline(
        df=df,
        timestamp_col="timestamp",
        building_col="building_id",
        target_col="energy_kwh",
        feature_cols=["air_temperature", "relative_humidity", "occupancy_rate", "solar_radiation"],
        dataset_name="SHAP Global Importance Test"
    )
    analysis_id = train_res["analysis_id"]
    exp_res = compute_shap_explanations(analysis_id, sample_size=50)

    global_imp = exp_res["global_importance"]
    assert len(global_imp) > 0

    values = [item["importance"] for item in global_imp]
    assert all(np.isfinite(v) and v >= 0 for v in values)

    # Must be sorted descending
    for i in range(len(values) - 1):
        assert values[i] >= values[i + 1], f"Global importance not sorted: {values[i]} < {values[i+1]}"

    # The top 12 proportions must sum to <= 1.0 and > 0.5
    total_top = sum(values)
    assert 0.5 <= total_top <= 1.0001, f"Unexpected global importance sum: {total_top}"

def test_shap_input_validation():
    """
    Verifies that compute_shap_explanations:
    - Rejects negative record indexes.
    - Rejects out-of-range record indexes.
    - Rejects invalid non-integer indexes.
    - Rejects empty test datasets.
    """
    from app.models.lgbm_pipeline import get_analysis_state

    df = pd.read_csv(SAMPLE_DATA_PATH)
    train_res = train_lightgbm_pipeline(
        df=df,
        timestamp_col="timestamp",
        building_col="building_id",
        target_col="energy_kwh",
        feature_cols=["air_temperature", "relative_humidity", "occupancy_rate", "solar_radiation"],
        dataset_name="SHAP Validation Test"
    )
    analysis_id = train_res["analysis_id"]
    state = get_analysis_state(analysis_id)
    n_test = len(state["X_test"])

    # 1. Negative index
    with pytest.raises(ValueError) as exc_info:
        compute_shap_explanations(analysis_id, record_index=-1)
    assert "Invalid record_index -1" in str(exc_info.value)

    # 2. Out-of-range index
    with pytest.raises(ValueError) as exc_info:
        compute_shap_explanations(analysis_id, record_index=n_test + 100)
    assert f"Invalid record_index {n_test + 100}" in str(exc_info.value)

    # 3. Non-integer index
    with pytest.raises(ValueError) as exc_info:
        compute_shap_explanations(analysis_id, record_index="invalid")
    assert "Invalid record_index" in str(exc_info.value)

    # 4. Empty test dataset
    state_copy = state.copy()
    state_copy["X_test"] = state["X_test"].iloc[0:0]
    from app.models.lgbm_pipeline import set_analysis_state
    empty_id = "empty-test-analysis-id"
    state_copy["analysis_id"] = empty_id
    set_analysis_state(empty_id, state_copy)

    with pytest.raises(ValueError) as exc_info:
        compute_shap_explanations(empty_id, record_index=0)
    assert "Evaluation test dataset is empty" in str(exc_info.value)
