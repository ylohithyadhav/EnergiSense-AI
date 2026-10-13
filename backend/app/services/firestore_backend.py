import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import firebase_admin
from firebase_admin import firestore

logger = logging.getLogger("energisense.firestore")

# In-memory fallback history for demo/development when Firestore credentials are not yet linked
_LOCAL_ANALYSES_HISTORY: List[Dict[str, Any]] = []

def get_firestore_client():
    if len(firebase_admin._apps) > 0:
        try:
            return firestore.client()
        except Exception as e:
            logger.warning(f"Could not initialize Firestore client: {e}")
            return None
    return None

async def save_analysis_record(
    user_id: str,
    analysis_id: str,
    dataset_name: str,
    building_count: int,
    record_count: int,
    mae: float,
    rmse: float,
    anomalies_count: int,
    method_comparison: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    now_iso = datetime.now(timezone.utc).isoformat()
    record = {
        "analysisId": analysis_id,
        "userId": user_id,
        "datasetName": dataset_name,
        "buildingCount": building_count,
        "recordCount": record_count,
        "analysisStatus": "completed",
        "modelName": "LightGBM Regressor (Regime-Aware)",
        "mae": round(mae, 3),
        "rmse": round(rmse, 3),
        "anomaliesCount": anomalies_count,
        "createdAt": now_iso,
        "updatedAt": now_iso
    }

    db = get_firestore_client()
    if db:
        try:
            # 1. Save analysis doc
            db.collection("analyses").document(analysis_id).set(record)
            
            # 2. Save model evaluations doc
            if method_comparison:
                eval_id = str(uuid.uuid4())
                eval_doc = {
                    "evaluationId": eval_id,
                    "analysisId": analysis_id,
                    "userId": user_id,
                    "modelName": "LightGBM Regressor",
                    "MAE": round(mae, 3),
                    "RMSE": round(rmse, 3),
                    "methodComparison": method_comparison,
                    "createdAt": now_iso
                }
                db.collection("modelEvaluations").document(eval_id).set(eval_doc)
            logger.info(f"Saved analysis {analysis_id} to Cloud Firestore.")
            return record
        except Exception as e:
            logger.error(f"Firestore save error: {e}. Falling back to local cache.")

    # Local fallback
    _LOCAL_ANALYSES_HISTORY.insert(0, record)
    return record

async def get_user_analyses(user_id: str) -> List[Dict[str, Any]]:
    db = get_firestore_client()
    if db:
        try:
            docs = (
                db.collection("analyses")
                .where("userId", "==", user_id)
                .order_by("createdAt", direction=firestore.Query.DESCENDING)
                .limit(50)
                .stream()
            )
            records = [doc.to_dict() for doc in docs]
            if records:
                return records
        except Exception as e:
            logger.warning(f"Firestore fetch error: {e}. Checking local cache.")

    # Local fallback
    user_records = [r for r in _LOCAL_ANALYSES_HISTORY if r.get("userId") == user_id or user_id == "demo-guest-user"]
    return user_records

async def get_analysis_by_id(analysis_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    db = get_firestore_client()
    if db:
        try:
            doc = db.collection("analyses").document(analysis_id).get()
            if doc.exists:
                data = doc.to_dict()
                if data.get("userId") == user_id or user_id == "demo-guest-user":
                    return data
                else:
                    logger.warning(f"Unauthorized access to analysis {analysis_id} by user {user_id}")
                    return None
        except Exception as e:
            logger.warning(f"Firestore read single error: {e}")

    for r in _LOCAL_ANALYSES_HISTORY:
        if r.get("analysisId") == analysis_id:
            return r
    return None
