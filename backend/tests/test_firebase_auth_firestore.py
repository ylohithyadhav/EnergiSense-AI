import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
from app.core.auth import get_current_user
from app.services.firestore_backend import (
    save_analysis_record,
    get_user_analyses,
    get_analysis_by_id,
    get_evaluation_by_analysis_id
)

@pytest.mark.anyio
async def test_auth_missing_header_fallback():
    # In development mode, missing header falls back to demo guest user
    user = await get_current_user(authorization=None)
    assert user["uid"] == "demo-guest-user"
    assert user["is_demo"] is True

@pytest.mark.anyio
async def test_auth_invalid_header_format():
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(authorization="Basic dXNlcjpwYXNz")
    assert exc_info.value.status_code == 401
    assert "Invalid authorization format" in exc_info.value.detail

@pytest.mark.anyio
async def test_auth_demo_token():
    user = await get_current_user(authorization="Bearer demo-token-analyst-123")
    assert user["uid"] == "analyst-123"
    assert user["is_demo"] is True

@pytest.mark.anyio
async def test_firestore_save_and_retrieve_local_fallback():
    # Test saving an analysis record with model evaluation metrics
    user_id = "test-researcher-01"
    analysis_id = "test-analysis-abc"
    method_comp = [
        {
            "method_name": "Proposed Regime-Aware Adaptive",
            "precision": 0.92,
            "recall": 0.88,
            "f1_score": 0.90,
            "pr_auc": 0.91,
            "roc_auc": 0.94
        }
    ]

    record = await save_analysis_record(
        user_id=user_id,
        analysis_id=analysis_id,
        dataset_name="Building 101 Sensor Log",
        building_count=3,
        record_count=1500,
        mae=12.45,
        rmse=16.80,
        anomalies_count=24,
        method_comparison=method_comp
    )

    assert record["analysisId"] == analysis_id
    assert record["userId"] == user_id
    assert record["mae"] == 12.45
    assert record["analysisStatus"] == "completed"

    # User isolation: test that user retrieves their own records
    analyses = await get_user_analyses(user_id)
    assert len(analyses) >= 1
    found = any(a["analysisId"] == analysis_id for a in analyses)
    assert found is True

    # User isolation: another user should not see this record
    other_user_analyses = await get_user_analyses("different-unauthorized-user")
    assert not any(a["analysisId"] == analysis_id for a in other_user_analyses)

    # Single analysis retrieval with ownership check
    doc = await get_analysis_by_id(analysis_id, user_id)
    assert doc is not None
    assert doc["analysisId"] == analysis_id

    unauth_doc = await get_analysis_by_id(analysis_id, "unauthorized-user")
    assert unauth_doc is None
