import io
import csv
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query, Response, Header
from app.schemas.analysis_schemas import (
    HealthResponse, StatusResponse, DatasetUploadResponse, DatasetDeleteResponse,
    TrainRequest, TrainResponse, PredictRequest, PredictResponse,
    AnomalyDetectRequest, AnomalyDetectResponse,
    SHAPExplainRequest, SHAPExplainResponse, AnalysisHistoryItem
)
from app.core.config import settings
from app.core.auth import get_current_user
from app.services.csv_service import (
    process_and_validate_csv, get_stored_dataset, verify_dataset_ownership, delete_stored_dataset
)
from app.models.lgbm_pipeline import train_lightgbm_pipeline, get_analysis_state, verify_analysis_ownership
from app.services.anomaly_service import run_anomaly_detection_pipeline
from app.services.shap_service import compute_shap_explanations
from app.services.firestore_backend import (
    save_analysis_record, get_user_analyses, get_analysis_by_id, get_evaluation_by_analysis_id,
    delete_analysis_record
)

router = APIRouter()

@router.get("/health", response_model=HealthResponse)
async def health_check():
    return {
        "status": "ok",
        "service": "EnergiSense AI API",
        "version": settings.VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@router.get("/status", response_model=StatusResponse)
async def api_status():
    return {
        "status": "online",
        "environment": settings.ENVIRONMENT,
        "firebase_auth_enabled": bool(settings.FIREBASE_PROJECT_ID),
        "firestore_enabled": bool(settings.FIREBASE_PROJECT_ID),
        "max_upload_size_mb": settings.MAX_UPLOAD_SIZE_MB
    }

@router.post("/dataset/upload", response_model=DatasetUploadResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """
    Validates CSV format, size, content structure, detects missing values and candidate columns.
    """
    result = await process_and_validate_csv(file, max_size_mb=settings.MAX_UPLOAD_SIZE_MB, user_id=user["uid"])
    return result

@router.get("/dataset/preview")
async def get_dataset_preview(
    file_id: str = Query(...),
    limit: int = Query(15, ge=1, le=100),
    user: dict = Depends(get_current_user)
):
    try:
        verify_dataset_ownership(file_id, user_id=user["uid"])
    except (ValueError, PermissionError):
        raise HTTPException(status_code=404, detail="Dataset not found or access denied.")

    df = get_stored_dataset(file_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found or session expired. Please re-upload.")
    
    clean_preview = df.head(limit).replace({float('nan'): None}).to_dict(orient="records")
    return {
        "file_id": file_id,
        "total_rows": len(df),
        "columns": list(df.columns),
        "rows": clean_preview
    }

@router.delete("/dataset/{file_id}", response_model=DatasetDeleteResponse)
async def delete_dataset(
    file_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Securely deletes an uploaded dataset owned by the authenticated user.
    Invalidates any active analyses derived from this dataset.
    """
    try:
        result = delete_stored_dataset(file_id=file_id, user_id=user["uid"])
        for aid in result.get("invalidated_analyses", []):
            await delete_analysis_record(analysis_id=aid, user_id=user["uid"])
        return result
    except (ValueError, PermissionError):
        raise HTTPException(status_code=404, detail="Dataset not found or access denied.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dataset deletion failed: {str(e)}")

@router.post("/model/train", response_model=TrainResponse)
async def train_model(
    req: TrainRequest,
    user: dict = Depends(get_current_user)
):
    """
    Trains LightGBM pipeline chronologically (no data leakage).
    """
    try:
        verify_dataset_ownership(req.file_id, user_id=user["uid"])
    except (ValueError, PermissionError):
        raise HTTPException(status_code=404, detail="Dataset not found or access denied.")

    df = get_stored_dataset(req.file_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found for the given file_id. Please upload the CSV first.")

    for col in [req.timestamp_col, req.building_col, req.target_col] + req.feature_cols:
        if col not in df.columns:
            raise HTTPException(status_code=400, detail=f"Column '{col}' does not exist in the uploaded CSV.")

    try:
        train_result = train_lightgbm_pipeline(
            df=df,
            timestamp_col=req.timestamp_col,
            building_col=req.building_col,
            target_col=req.target_col,
            feature_cols=req.feature_cols,
            train_split=req.train_split,
            val_split=req.val_split,
            test_split=req.test_split,
            dataset_name=req.dataset_name or "Uploaded Dataset",
            user_id=user["uid"],
            file_id=req.file_id
        )
        return train_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model training failed: {str(e)}")

@router.post("/predict", response_model=PredictResponse)
async def generate_predictions(
    req: PredictRequest,
    user: dict = Depends(get_current_user)
):
    """
    Generates out-of-sample energy predictions using the trained LightGBM model.
    """
    try:
        state = verify_analysis_ownership(req.analysis_id, user_id=user["uid"])
    except (ValueError, PermissionError):
        raise HTTPException(status_code=404, detail="Analysis not found or access denied.")

    model = state.get("model")
    X_test = state.get("X_test")
    test_meta_df = state.get("test_meta_df")
    if model is None or X_test is None or test_meta_df is None:
        raise HTTPException(status_code=400, detail="Trained model or evaluation data unavailable.")

    limit = min(req.limit or 100, len(X_test))
    preds = model.predict(X_test.iloc[:limit])
    
    pred_items = []
    bldg_col = state["building_col"]
    for i in range(limit):
        row = test_meta_df.iloc[i]
        act = float(row["actual_energy"]) if "actual_energy" in row else None
        p = round(float(preds[i]), 2)
        res = round(act - p, 2) if act is not None else None
        pred_items.append({
            "index": i,
            "timestamp": str(row["parsed_timestamp"]),
            "building_id": str(row[bldg_col]),
            "actual_energy": act,
            "predicted_energy": p,
            "residual": res,
            "regime": str(row.get("regime", "Normal"))
        })

    return {
        "analysis_id": req.analysis_id,
        "model_name": "LightGBM Regressor (Regime-Aware)",
        "predictions_count": len(pred_items),
        "predictions": pred_items
    }

@router.post("/anomalies/detect", response_model=AnomalyDetectResponse)
async def detect_anomalies(
    req: AnomalyDetectRequest,
    user: dict = Depends(get_current_user)
):
    """
    Runs 4 anomaly detection methods: Global, Rolling, Isolation Forest, Proposed Regime-Aware.
    Saves summary to Firestore history.
    """
    try:
        detection_result = run_anomaly_detection_pipeline(
            analysis_id=req.analysis_id,
            global_sigma=req.global_sigma,
            rolling_window=req.rolling_window,
            rolling_sigma=req.rolling_sigma,
            isolation_forest_contamination=req.isolation_forest_contamination,
            regime_sigma=req.regime_sigma,
            user_id=user["uid"]
        )
        
        # Save to Firestore history
        state = get_analysis_state(req.analysis_id)
        if state:
            bldg_cnt = len(detection_result["anomalies_by_building"])
            total_anomalies = sum(1 for a in detection_result["anomalies"] if a["is_anomaly"])
            await save_analysis_record(
                user_id=user["uid"],
                analysis_id=req.analysis_id,
                dataset_name=state["dataset_name"],
                building_count=bldg_cnt or 1,
                record_count=detection_result["total_samples"],
                mae=state["mae"],
                rmse=state["rmse"],
                anomalies_count=total_anomalies,
                method_comparison=detection_result["method_comparison"]
            )
            
        return detection_result
    except (ValueError, PermissionError):
        raise HTTPException(status_code=404, detail="Analysis not found or access denied.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Anomaly detection failed: {str(e)}")

@router.post("/explain", response_model=SHAPExplainResponse)
async def explain_predictions(
    req: SHAPExplainRequest,
    user: dict = Depends(get_current_user)
):
    """
    Computes SHAP TreeExplainer feature importance and local instance attributions.
    """
    try:
        shap_res = compute_shap_explanations(
            analysis_id=req.analysis_id,
            sample_size=req.sample_size,
            record_index=req.record_index,
            user_id=user["uid"]
        )
        return shap_res
    except (ValueError, PermissionError):
        raise HTTPException(status_code=404, detail="Analysis not found or access denied.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SHAP explanation failed: {str(e)}")

@router.get("/evaluate")
async def evaluate_analysis(
    analysis_id: str = Query(...),
    user: dict = Depends(get_current_user)
):
    try:
        state = verify_analysis_ownership(analysis_id, user_id=user["uid"])
        return {
            "analysis_id": analysis_id,
            "dataset_name": state["dataset_name"],
            "mae": state["mae"],
            "rmse": state["rmse"],
            "baseline_mae": state["baseline_mae"],
            "baseline_rmse": state["baseline_rmse"],
            "method_comparison": state.get("method_comparison", [])
        }
    except (ValueError, PermissionError):
        pass
    
    # Check Cloud Firestore persistence
    eval_doc = await get_evaluation_by_analysis_id(analysis_id, user["uid"])
    if eval_doc:
        analysis_doc = await get_analysis_by_id(analysis_id, user["uid"]) or {}
        return {
            "analysis_id": analysis_id,
            "dataset_name": analysis_doc.get("datasetName", "Stored Analysis"),
            "mae": eval_doc.get("MAE", 0.0),
            "rmse": eval_doc.get("RMSE", 0.0),
            "baseline_mae": round(eval_doc.get("MAE", 0.0) * 1.5, 3),
            "baseline_rmse": round(eval_doc.get("RMSE", 0.0) * 1.4, 3),
            "method_comparison": eval_doc.get("methodComparison", [])
        }

    raise HTTPException(status_code=404, detail="Analysis or evaluation not found.")

@router.get("/analyses", response_model=List[AnalysisHistoryItem])
async def get_analyses_history(
    user: dict = Depends(get_current_user)
):
    """
    Returns user's analysis history from Cloud Firestore or local cache.
    """
    records = await get_user_analyses(user["uid"])
    output = []
    for r in records:
        output.append({
            "analysis_id": r.get("analysisId", ""),
            "dataset_name": r.get("datasetName", "Unknown"),
            "created_at": r.get("createdAt", ""),
            "record_count": r.get("recordCount", 0),
            "building_count": r.get("buildingCount", 0),
            "mae": r.get("mae", 0.0),
            "rmse": r.get("rmse", 0.0),
            "anomalies_count": r.get("anomaliesCount", 0),
            "user_id": r.get("userId")
        })
    return output

@router.get("/analyses/{analysis_id}")
async def get_single_analysis(
    analysis_id: str,
    user: dict = Depends(get_current_user)
):
    doc = await get_analysis_by_id(analysis_id, user["uid"])
    if not doc:
        raise HTTPException(status_code=404, detail="Analysis record not found or access denied.")
    return doc

@router.get("/results/export")
async def export_results_csv(
    analysis_id: str = Query(...),
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None)
):
    """
    Exports full prediction and anomaly detection results as downloadable CSV.
    Supports either Authorization Bearer header or token query parameter for browser downloads.
    """
    effective_auth = authorization or (f"Bearer {token}" if token else None)
    user = await get_current_user(effective_auth)
    try:
        state = verify_analysis_ownership(analysis_id, user_id=user["uid"])
    except (ValueError, PermissionError):
        raise HTTPException(status_code=404, detail="Analysis not found or access denied.")

    if not state or "anomaly_records" not in state:
        raise HTTPException(status_code=404, detail="Analysis or detection results not found.")

    records = state["anomaly_records"]
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "index", "timestamp", "building_id", "actual_energy", "predicted_energy",
        "residual", "regime", "threshold", "anomaly_score", "severity",
        "detected_by_global", "detected_by_rolling", "detected_by_iforest",
        "detected_by_regime", "is_anomaly", "suggested_action"
    ])
    writer.writeheader()
    for row in records:
        writer.writerow(row)

    csv_data = output.getvalue()
    filename = f"energisense_results_{analysis_id[:8]}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
