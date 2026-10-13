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
