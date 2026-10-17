import os
import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import firebase_admin
from firebase_admin import firestore

from app.core.config import settings

logger = logging.getLogger("energisense.firestore")

# In-memory fallback history for demo/development when Firestore credentials are not yet linked
_LOCAL_ANALYSES_HISTORY: List[Dict[str, Any]] = []
_firestore_client = None
_firestore_attempted = False

def get_firestore_client():
    global _firestore_client, _firestore_attempted
    if _firestore_client is not None:
        return _firestore_client
    if _firestore_attempted:
        return None

    # Only attempt Firestore initialization if explicit service account credentials are provided
    has_credentials = bool(
        (settings.FIREBASE_CREDENTIALS_PATH and os.path.exists(settings.FIREBASE_CREDENTIALS_PATH)) or
        (settings.FIREBASE_CREDENTIALS_JSON and settings.FIREBASE_CREDENTIALS_JSON.strip()) or
        (os.environ.get("GOOGLE_APPLICATION_CREDENTIALS") and os.path.exists(os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")))
    )

    if not has_credentials:
        _firestore_attempted = True
        return None

    if len(firebase_admin._apps) > 0:
        try:
            _firestore_client = firestore.client()
            _firestore_attempted = True
            return _firestore_client
        except Exception as e:
            logger.warning(f"Could not initialize Firestore client: {e}. Falling back to local storage.")
            _firestore_attempted = True
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
            # 1. Save analysis doc to 'analyses' collection
            db.collection("analyses").document(analysis_id).set(record)
            
            # 2. Save model evaluations doc to 'modelEvaluations' collection
            if method_comparison:
                eval_id = str(uuid.uuid4())
                # Extract metrics for proposed regime-aware method
                regime_method = next(
                    (m for m in method_comparison if "Regime" in m.get("method_name", "")),
                    method_comparison[0] if method_comparison else {}
                )
                eval_doc = {
                    "evaluationId": eval_id,
                    "analysisId": analysis_id,
                    "userId": user_id,
                    "modelName": "LightGBM Regressor (Regime-Aware)",
                    "MAE": round(mae, 3),
                    "RMSE": round(rmse, 3),
                    "precision": regime_method.get("precision", 0.0),
                    "recall": regime_method.get("recall", 0.0),
                    "f1Score": regime_method.get("f1_score", 0.0),
                    "prAuc": regime_method.get("pr_auc", 0.0),
                    "rocAuc": regime_method.get("roc_auc", 0.0),
                    "methodComparison": method_comparison,
                    "createdAt": now_iso
                }
                db.collection("modelEvaluations").document(eval_id).set(eval_doc)
            logger.info(f"Saved analysis {analysis_id} and evaluation summary to Cloud Firestore.")
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
            # Query by userId (single-field index default in Firestore; sort in Python to avoid composite index requirement)
            docs = (
                db.collection("analyses")
                .where("userId", "==", user_id)
                .limit(50)
                .stream()
            )
            records = [doc.to_dict() for doc in docs]
            if records:
                records.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
                return records
        except Exception as e:
            logger.warning(f"Firestore fetch error: {e}. Checking local cache.")

    # Local fallback
    user_records = [r for r in _LOCAL_ANALYSES_HISTORY if r.get("userId") == user_id]
    return user_records

async def get_analysis_by_id(analysis_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    db = get_firestore_client()
    if db:
        try:
            doc = db.collection("analyses").document(analysis_id).get()
            if doc.exists:
                data = doc.to_dict()
                if data.get("userId") == user_id:
                    return data
                else:
                    logger.warning(f"Unauthorized access to analysis {analysis_id} by user {user_id}")
                    return None
        except Exception as e:
            logger.warning(f"Firestore read single error: {e}")

    for r in _LOCAL_ANALYSES_HISTORY:
        if r.get("analysisId") == analysis_id:
            if r.get("userId") == user_id:
                return r
            logger.warning(f"Unauthorized access to local analysis {analysis_id} by user {user_id}")
            return None
    return None

async def get_evaluation_by_analysis_id(analysis_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    db = get_firestore_client()
    if db:
        try:
            docs = (
                db.collection("modelEvaluations")
                .where("analysisId", "==", analysis_id)
                .limit(1)
                .stream()
            )
            for doc in docs:
                data = doc.to_dict()
                if data.get("userId") == user_id:
                    return data
        except Exception as e:
            logger.warning(f"Firestore evaluation fetch error: {e}")
    return None

async def delete_analysis_record(analysis_id: str, user_id: str) -> bool:
    """
    Deletes an analysis record and its corresponding evaluation record
    from Cloud Firestore and local history for the given user_id.
    """
    db = get_firestore_client()
    deleted = False
    if db:
        try:
            doc_ref = db.collection("analyses").document(analysis_id)
            doc = doc_ref.get()
            if doc.exists and doc.to_dict().get("userId") == user_id:
                doc_ref.delete()
                deleted = True
            eval_docs = (
                db.collection("modelEvaluations")
                .where("analysisId", "==", analysis_id)
                .stream()
            )
            for edoc in eval_docs:
                if edoc.to_dict().get("userId") == user_id:
                    edoc.reference.delete()
        except Exception as e:
            logger.warning(f"Firestore delete analysis error: {e}")

    global _LOCAL_ANALYSES_HISTORY
    _LOCAL_ANALYSES_HISTORY = [
        r for r in _LOCAL_ANALYSES_HISTORY
        if not (r.get("analysisId") == analysis_id and r.get("userId") == user_id)
    ]
    return deleted
