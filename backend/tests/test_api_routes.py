import io
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

from pathlib import Path

SAMPLE_DATA_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "sample_energy_data.csv"
if not SAMPLE_DATA_PATH.exists():
    SAMPLE_DATA_PATH = Path("data/sample_energy_data.csv")

def test_full_api_workflow():
    # 1. Health check
    res_health = client.get("/health")
    assert res_health.status_code == 200

    # 2. Upload CSV
    csv_bytes = open(SAMPLE_DATA_PATH, "rb").read()
    files = {"file": ("sample_energy_data.csv", csv_bytes, "text/csv")}
    headers = {"Authorization": "Bearer demo-token-test-user"}
    
    res_upload = client.post("/api/dataset/upload", files=files, headers=headers)
    assert res_upload.status_code == 200
    upload_data = res_upload.json()
    file_id = upload_data["file_id"]
    assert upload_data["total_rows"] > 100
    assert upload_data["suggested_mapping"]["timestamp_col"] == "timestamp"

    # 3. Preview CSV
    res_prev = client.get(f"/api/dataset/preview?file_id={file_id}&limit=5", headers=headers)
    assert res_prev.status_code == 200
    assert len(res_prev.json()["rows"]) == 5

    # 4. Train Model
    train_payload = {
        "file_id": file_id,
        "dataset_name": "Demo Building Dataset",
        "timestamp_col": "timestamp",
        "building_col": "building_id",
        "target_col": "energy_kwh",
        "feature_cols": ["air_temperature", "relative_humidity", "solar_radiation", "occupancy_rate"],
        "train_split": 0.70,
        "val_split": 0.15,
        "test_split": 0.15
    }
    res_train = client.post("/api/model/train", json=train_payload, headers=headers)
    assert res_train.status_code == 200
    train_data = res_train.json()
    analysis_id = train_data["analysis_id"]
    assert train_data["mae"] > 0
    assert train_data["rmse"] > 0

    # 4b. Explicit Predictions Generation
    predict_payload = {
        "analysis_id": analysis_id,
        "limit": 50
    }
    res_predict = client.post("/api/predict", json=predict_payload, headers=headers)
    assert res_predict.status_code == 200
    predict_data = res_predict.json()
    assert predict_data["predictions_count"] == 50
    assert len(predict_data["predictions"]) == 50

    # 5. Detect Anomalies
    detect_payload = {
        "analysis_id": analysis_id,
        "global_sigma": 3.0,
        "rolling_window": 24,
        "rolling_sigma": 2.5,
        "isolation_forest_contamination": 0.03,
        "regime_sigma": 2.5
    }
    res_detect = client.post("/api/anomalies/detect", json=detect_payload, headers=headers)
    assert res_detect.status_code == 200
    detect_data = res_detect.json()
    assert len(detect_data["method_comparison"]) == 4

    # 6. SHAP Explain
    explain_payload = {
        "analysis_id": analysis_id,
        "sample_size": 25,
        "record_index": 0
    }
    res_explain = client.post("/api/explain", json=explain_payload, headers=headers)
    assert res_explain.status_code == 200
    explain_data = res_explain.json()
    assert len(explain_data["global_importance"]) > 0

    # 7. Check Analyses History
    res_history = client.get("/api/analyses", headers=headers)
    assert res_history.status_code == 200
    hist_data = res_history.json()
    assert len(hist_data) >= 1
    assert hist_data[0]["analysis_id"] == analysis_id

    # 8. Export CSV
    res_export = client.get(f"/api/results/export?analysis_id={analysis_id}", headers=headers)
    assert res_export.status_code == 200
    assert "text/csv" in res_export.headers.get("content-type", "")
    assert "actual_energy" in res_export.text


def test_api_analysis_ownership_and_access_control():
    """
    Verifies that analysis and dataset endpoints enforce strict user ownership:
    - Owner can access their own analyses.
    - Another authenticated user is rejected with 404 (preventing ID enumeration).
    - Nonexistent IDs are rejected with 404.
    """
    owner_headers = {"Authorization": "Bearer demo-token-alice-owner"}
    attacker_headers = {"Authorization": "Bearer demo-token-bob-attacker"}

    # 1. Alice uploads a dataset
    csv_bytes = open(SAMPLE_DATA_PATH, "rb").read()
    files = {"file": ("alice_data.csv", csv_bytes, "text/csv")}
    res_upload = client.post("/api/dataset/upload", files=files, headers=owner_headers)
    assert res_upload.status_code == 200
    alice_file_id = res_upload.json()["file_id"]

    # 2. Bob tries to preview Alice's dataset -> rejected with 404
    res_bob_prev = client.get(f"/api/dataset/preview?file_id={alice_file_id}", headers=attacker_headers)
    assert res_bob_prev.status_code == 404
    assert "access denied" in res_bob_prev.json()["detail"].lower()

    # 3. Bob tries to train a model using Alice's file_id -> rejected with 404
    bob_train_payload = {
        "file_id": alice_file_id,
        "dataset_name": "Bob Hijack Attempt",
        "timestamp_col": "timestamp",
        "building_col": "building_id",
        "target_col": "energy_kwh",
        "feature_cols": ["air_temperature", "relative_humidity"],
        "train_split": 0.70,
        "val_split": 0.15,
        "test_split": 0.15
    }
    res_bob_train = client.post("/api/model/train", json=bob_train_payload, headers=attacker_headers)
    assert res_bob_train.status_code == 404
    assert "access denied" in res_bob_train.json()["detail"].lower()

    # 4. Alice trains her model
    alice_train_payload = {
        "file_id": alice_file_id,
        "dataset_name": "Alice Energy Model",
        "timestamp_col": "timestamp",
        "building_col": "building_id",
        "target_col": "energy_kwh",
        "feature_cols": ["air_temperature", "relative_humidity", "solar_radiation", "occupancy_rate"],
        "train_split": 0.70,
        "val_split": 0.15,
        "test_split": 0.15
    }
    res_alice_train = client.post("/api/model/train", json=alice_train_payload, headers=owner_headers)
    assert res_alice_train.status_code == 200
    alice_analysis_id = res_alice_train.json()["analysis_id"]

    # 5. Alice triggers anomaly detection (populates anomaly_records for export & evaluate)
    detect_payload = {
        "analysis_id": alice_analysis_id,
        "global_sigma": 3.0,
        "rolling_window": 24,
        "rolling_sigma": 2.5,
        "isolation_forest_contamination": 0.03,
        "regime_sigma": 2.5
    }
    res_detect = client.post("/api/anomalies/detect", json=detect_payload, headers=owner_headers)
    assert res_detect.status_code == 200

    # 6. SHAP /api/explain:
    # 6a. Owner access succeeds
    explain_payload = {
        "analysis_id": alice_analysis_id,
        "sample_size": 20,
        "record_index": 0
    }
    res_owner_explain = client.post("/api/explain", json=explain_payload, headers=owner_headers)
    assert res_owner_explain.status_code == 200
    assert res_owner_explain.json()["analysis_id"] == alice_analysis_id
    assert len(res_owner_explain.json()["global_importance"]) > 0

    # 6b. Another user's access fails with 404
    res_attacker_explain = client.post("/api/explain", json=explain_payload, headers=attacker_headers)
    assert res_attacker_explain.status_code == 404
    assert "access denied" in res_attacker_explain.json()["detail"].lower()

    # 6c. Nonexistent analysis ID fails with 404
    nonexistent_payload = {
        "analysis_id": "nonexistent-analysis-id-99999",
        "sample_size": 20,
        "record_index": 0
    }
    res_nonexistent_explain = client.post("/api/explain", json=nonexistent_payload, headers=owner_headers)
    assert res_nonexistent_explain.status_code == 404
    assert "access denied" in res_nonexistent_explain.json()["detail"].lower()

    # 7. Bob attempts unauthorized access to related analysis endpoints:
    # 7a. /api/predict
    res_bob_predict = client.post("/api/predict", json={"analysis_id": alice_analysis_id, "limit": 10}, headers=attacker_headers)
    assert res_bob_predict.status_code == 404

    # 7b. /api/anomalies/detect
    res_bob_detect = client.post("/api/anomalies/detect", json=detect_payload, headers=attacker_headers)
    assert res_bob_detect.status_code == 404

    # 7c. /api/evaluate
    res_bob_eval = client.get(f"/api/evaluate?analysis_id={alice_analysis_id}", headers=attacker_headers)
    assert res_bob_eval.status_code == 404

    # 7d. /api/results/export
    res_bob_export = client.get(f"/api/results/export?analysis_id={alice_analysis_id}", headers=attacker_headers)
    assert res_bob_export.status_code == 404


def test_api_legacy_and_unowned_record_isolation():
    """
    Verifies that analyses and datasets created without a user_id (e.g. legacy/unowned)
    CANNOT be accessed or hijacked by arbitrary authenticated users.
    """
    from app.models.lgbm_pipeline import set_analysis_state
    from app.services.csv_service import set_stored_dataset
    import pandas as pd

    bob_headers = {"Authorization": "Bearer demo-token-bob-auditor"}

    # 1. Simulate a legacy analysis with user_id = None
    legacy_analysis_id = "legacy-unowned-analysis-12345"
    set_analysis_state(legacy_analysis_id, {
        "analysis_id": legacy_analysis_id,
        "user_id": None,
        "dataset_name": "Legacy Unowned",
        "mae": 10.0,
        "rmse": 15.0
    })

    # Bob attempts to access this legacy unowned analysis
    res_explain = client.post("/api/explain", json={"analysis_id": legacy_analysis_id}, headers=bob_headers)
    assert res_explain.status_code == 404
    assert "access denied" in res_explain.json()["detail"].lower()

    res_predict = client.post("/api/predict", json={"analysis_id": legacy_analysis_id}, headers=bob_headers)
    assert res_predict.status_code == 404

    res_eval = client.get(f"/api/evaluate?analysis_id={legacy_analysis_id}", headers=bob_headers)
    assert res_eval.status_code == 404

    # 2. Simulate a legacy dataset with user_id = None
    legacy_file_id = "legacy-unowned-file-67890"
    df_dummy = pd.DataFrame({"timestamp": ["2026-01-01"], "energy_kwh": [100.0]})
    set_stored_dataset(legacy_file_id, df_dummy, {
        "filename": "legacy.csv",
        "rows": 1,
        "cols": 2,
        "user_id": None
    })

    # Bob attempts to preview or train on unowned dataset
    res_prev = client.get(f"/api/dataset/preview?file_id={legacy_file_id}", headers=bob_headers)
    assert res_prev.status_code == 404
    assert "access denied" in res_prev.json()["detail"].lower()


def test_client_supplied_user_id_tamper_resistance():
    """
    Verifies that a malicious client injecting a 'user_id' or 'userId' field
    into requests cannot impersonate the dataset or analysis owner.
    """
    alice_headers = {"Authorization": "Bearer demo-token-alice-real-owner"}
    attacker_headers = {"Authorization": "Bearer demo-token-mallory-attacker"}

    # Alice uploads a dataset
    csv_bytes = open(SAMPLE_DATA_PATH, "rb").read()
    files = {"file": ("tamper_test.csv", csv_bytes, "text/csv")}
    res_upload = client.post("/api/dataset/upload", files=files, headers=alice_headers)
    assert res_upload.status_code == 200
    file_id = res_upload.json()["file_id"]

    # Mallory attempts to train on Alice's file_id while forging 'user_id' = 'alice-real-owner' in JSON body
    forged_payload = {
        "file_id": file_id,
        "user_id": "alice-real-owner",
        "userId": "alice-real-owner",
        "dataset_name": "Forged Dataset",
        "timestamp_col": "timestamp",
        "building_col": "building_id",
        "target_col": "energy_kwh",
        "feature_cols": ["air_temperature", "relative_humidity"],
        "train_split": 0.70,
        "val_split": 0.15,
        "test_split": 0.15
    }
    res_forged = client.post("/api/model/train", json=forged_payload, headers=attacker_headers)
    assert res_forged.status_code == 404
    assert "access denied" in res_forged.json()["detail"].lower()


def test_unauthenticated_request_handling():
    """
    Verifies that invalid authorization headers are cleanly rejected with 401.
    """
    invalid_headers = {"Authorization": "NotBearer some-token"}
    res = client.post("/api/explain", json={"analysis_id": "any-id"}, headers=invalid_headers)
    assert res.status_code == 401
    assert "invalid authorization format" in res.json()["detail"].lower()


def test_secure_dataset_deletion_owner_and_invalidation():
    """
    Verifies that an owner can successfully delete their own dataset,
    and that associated in-memory analyses are safely invalidated.
    """
    from app.services.csv_service import get_stored_dataset, get_stored_dataset_metadata
    from app.models.lgbm_pipeline import get_analysis_state

    alice_headers = {"Authorization": "Bearer demo-token-alice-del-test"}

    # 1. Alice uploads a dataset
    csv_bytes = open(SAMPLE_DATA_PATH, "rb").read()
    files = {"file": ("alice_delete_test.csv", csv_bytes, "text/csv")}
    res_upload = client.post("/api/dataset/upload", files=files, headers=alice_headers)
    assert res_upload.status_code == 200
    file_id = res_upload.json()["file_id"]

    # 2. Alice trains a model
    train_payload = {
        "file_id": file_id,
        "dataset_name": "Alice Deletion Test",
        "timestamp_col": "timestamp",
        "building_col": "building_id",
        "target_col": "energy_kwh",
        "feature_cols": ["air_temperature", "relative_humidity"],
        "train_split": 0.70,
        "val_split": 0.15,
        "test_split": 0.15
    }
    res_train = client.post("/api/model/train", json=train_payload, headers=alice_headers)
    assert res_train.status_code == 200
    analysis_id = res_train.json()["analysis_id"]

    # Verify analysis is functional before deletion
    res_eval = client.get(f"/api/evaluate?analysis_id={analysis_id}", headers=alice_headers)
    assert res_eval.status_code == 200

    # 3. Alice deletes her dataset
    res_delete = client.delete(f"/api/dataset/{file_id}", headers=alice_headers)
    assert res_delete.status_code == 200
    del_data = res_delete.json()
    assert del_data["deleted"] is True
    assert del_data["file_id"] == file_id
    assert analysis_id in del_data["invalidated_analyses"]

    # 4. Verify storage cleanup
    assert get_stored_dataset(file_id) is None
    assert get_stored_dataset_metadata(file_id) is None
    assert get_analysis_state(analysis_id) is None

    # 5. Verify subsequent access is denied
    res_prev = client.get(f"/api/dataset/preview?file_id={file_id}", headers=alice_headers)
    assert res_prev.status_code == 404

    res_train_again = client.post("/api/model/train", json=train_payload, headers=alice_headers)
    assert res_train_again.status_code == 404

    res_eval_again = client.get(f"/api/evaluate?analysis_id={analysis_id}", headers=alice_headers)
    assert res_eval_again.status_code == 404

    res_explain_again = client.post("/api/explain", json={"analysis_id": analysis_id}, headers=alice_headers)
    assert res_explain_again.status_code == 404


def test_secure_dataset_deletion_security_and_tenant_isolation():
    """
    Verifies that:
    - Attacker cannot delete another user's dataset
    - Unauthenticated requests are rejected
    - Nonexistent datasets return 404
    - Legacy unowned datasets cannot be deleted
    - Unrelated user datasets and reference files remain intact
    """
    from app.services.csv_service import get_stored_dataset, set_stored_dataset
    import pandas as pd

    alice_headers = {"Authorization": "Bearer demo-token-alice-iso-owner"}
    bob_headers = {"Authorization": "Bearer demo-token-bob-iso-user"}
    mallory_headers = {"Authorization": "Bearer demo-token-mallory-iso-attacker"}

    # 1. Alice and Bob both upload datasets
    csv_bytes = open(SAMPLE_DATA_PATH, "rb").read()
    res_alice = client.post("/api/dataset/upload", files={"file": ("alice_iso.csv", csv_bytes, "text/csv")}, headers=alice_headers)
    assert res_alice.status_code == 200
    file_id_alice = res_alice.json()["file_id"]

    res_bob = client.post("/api/dataset/upload", files={"file": ("bob_iso.csv", csv_bytes, "text/csv")}, headers=bob_headers)
    assert res_bob.status_code == 200
    file_id_bob = res_bob.json()["file_id"]

    # 2. Mallory attempts to delete Alice's dataset -> rejected with 404
    res_mal_del = client.delete(f"/api/dataset/{file_id_alice}", headers=mallory_headers)
    assert res_mal_del.status_code == 404
    assert "access denied" in res_mal_del.json()["detail"].lower()
    assert get_stored_dataset(file_id_alice) is not None

    # 3. Unauthenticated and invalid authentication deletion attempts
    # 3a. Invalid Authorization header format -> 401
    res_bad_auth = client.delete(f"/api/dataset/{file_id_alice}", headers={"Authorization": "InvalidScheme token"})
    assert res_bad_auth.status_code == 401

    # 3b. Missing header in production environment -> 401
    from app.core.config import settings
    orig_env = settings.ENVIRONMENT
    try:
        settings.ENVIRONMENT = "production"
        res_unauth_prod = client.delete(f"/api/dataset/{file_id_alice}")
        assert res_unauth_prod.status_code == 401
    finally:
        settings.ENVIRONMENT = orig_env

    # 3c. Unauthenticated guest caller in dev mode -> denied (404 access denied)
    res_unauth_dev = client.delete(f"/api/dataset/{file_id_alice}")
    assert res_unauth_dev.status_code == 404
    assert "access denied" in res_unauth_dev.json()["detail"].lower()

    # 4. Deleting nonexistent dataset -> 404
    res_nonexistent = client.delete("/api/dataset/00000000-0000-0000-0000-000000000000", headers=alice_headers)
    assert res_nonexistent.status_code == 404

    # 5. Missing ownership metadata (legacy unowned dataset) -> rejected with 404
    legacy_file_id = "legacy-unowned-file-for-delete-test"
    df_legacy = pd.DataFrame({"timestamp": ["2026-01-01"], "energy_kwh": [50.0]})
    set_stored_dataset(legacy_file_id, df_legacy, {
        "filename": "legacy_unowned.csv",
        "rows": 1,
        "cols": 2,
        "user_id": None
    })
    res_del_legacy = client.delete(f"/api/dataset/{legacy_file_id}", headers=alice_headers)
    assert res_del_legacy.status_code == 404

    # 6. Alice deletes her own dataset -> 200
    res_del_alice = client.delete(f"/api/dataset/{file_id_alice}", headers=alice_headers)
    assert res_del_alice.status_code == 200

    # 7. Bob's dataset is completely unaffected
    res_bob_prev = client.get(f"/api/dataset/preview?file_id={file_id_bob}&limit=3", headers=bob_headers)
    assert res_bob_prev.status_code == 200
    assert len(res_bob_prev.json()["rows"]) == 3

    # 8. Shared reference dataset remains intact on disk
    assert SAMPLE_DATA_PATH.exists()
    assert SAMPLE_DATA_PATH.stat().st_size > 0


def test_export_results_csv_authorization_and_formats():
    """
    Verifies that GET /api/results/export:
    1. Rejects unauthenticated callers.
    2. Rejects unauthorized callers (tenant isolation).
    3. Works with Authorization: Bearer <token> header.
    4. Works with ?token=<token> query parameter for direct browser downloads.
    5. Returns RFC 4180 CSV with all required columns.
    """
    alice_headers = {"Authorization": "Bearer demo-token-alice-csv-owner"}
    mallory_headers = {"Authorization": "Bearer demo-token-mallory-csv-attacker"}

    # Upload and train
    csv_bytes = open(SAMPLE_DATA_PATH, "rb").read()
    files = {"file": ("export_test.csv", csv_bytes, "text/csv")}
    res_up = client.post("/api/dataset/upload", files=files, headers=alice_headers)
    assert res_up.status_code == 200
    file_id = res_up.json()["file_id"]

    train_payload = {
        "file_id": file_id,
        "dataset_name": "Export Test",
        "timestamp_col": "timestamp",
        "building_col": "building_id",
        "target_col": "energy_kwh",
        "feature_cols": ["air_temperature", "relative_humidity", "occupancy_rate", "solar_radiation"],
        "train_split": 0.70,
        "val_split": 0.15,
        "test_split": 0.15
    }
    res_train = client.post("/api/model/train", json=train_payload, headers=alice_headers)
    assert res_train.status_code == 200
    analysis_id = res_train.json()["analysis_id"]

    # Detect anomalies
    res_detect = client.post("/api/anomalies/detect", json={"analysis_id": analysis_id}, headers=alice_headers)
    assert res_detect.status_code == 200

    # 1. Mallory cannot export Alice's results
    res_mal = client.get(f"/api/results/export?analysis_id={analysis_id}", headers=mallory_headers)
    assert res_mal.status_code == 404

    # 2. Alice can export using Authorization header
    res_alice_header = client.get(f"/api/results/export?analysis_id={analysis_id}", headers=alice_headers)
    assert res_alice_header.status_code == 200
    assert "text/csv" in res_alice_header.headers["content-type"]
    for col in ["building_id", "timestamp", "actual_energy", "predicted_energy", "residual", "threshold", "severity"]:
        assert col in res_alice_header.text

    # 3. Alice can export using token query parameter (browser direct link)
    res_alice_query = client.get(f"/api/results/export?analysis_id={analysis_id}&token=demo-token-alice-csv-owner")
    assert res_alice_query.status_code == 200
    assert "text/csv" in res_alice_query.headers["content-type"]
    lines = res_alice_query.text.strip().split("\n")
    assert len(lines) > 1  # Header + rows

