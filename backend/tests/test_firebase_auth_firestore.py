import pytest
import time
import datetime
import jwt
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization, hashes
from cryptography import x509
from cryptography.x509.oid import NameOID

from app.core import auth
from app.core.auth import get_current_user, verify_firebase_id_token
from app.services.firestore_backend import (
    save_analysis_record,
    get_user_analyses,
    get_analysis_by_id,
    get_evaluation_by_analysis_id
)

@pytest.fixture
def mock_firebase_crypto():
    """Generates an RSA keypair and self-signed X509 certificate for token testing."""
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    subject = issuer = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, 'securetoken@system.gserviceaccount.com')])
    cert = x509.CertificateBuilder().subject_name(
        subject
    ).issuer_name(
        issuer
    ).public_key(
        key.public_key()
    ).serial_number(
        1001
    ).not_valid_before(
        datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1)
    ).not_valid_after(
        datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1)
    ).sign(key, hashes.SHA256())

    kid = "test-mock-kid-01"
    pub_key = cert.public_key()
    
    # Inject into auth cache
    orig_cache = auth._google_public_keys_cache.copy()
    orig_time = auth._google_certs_fetched_at
    auth._google_public_keys_cache = {kid: pub_key}
    auth._google_certs_fetched_at = time.time()

    yield {"key": key, "kid": kid, "pub_key": pub_key}

    auth._google_public_keys_cache = orig_cache
    auth._google_certs_fetched_at = orig_time

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
async def test_firebase_token_cryptographic_verification(mock_firebase_crypto):
    now = int(time.time())
    payload = {
        "iss": "https://securetoken.google.com/energisense-ai",
        "aud": "energisense-ai",
        "sub": "firebase-test-user-789",
        "user_id": "firebase-test-user-789",
        "email": "verified.analyst@energisense.ai",
        "name": "Verified Smart Analyst",
        "iat": now,
        "exp": now + 3600
    }
    token = jwt.encode(payload, mock_firebase_crypto["key"], algorithm="RS256", headers={"kid": mock_firebase_crypto["kid"]})

    user = await get_current_user(authorization=f"Bearer {token}")
    assert user["uid"] == "firebase-test-user-789"
    assert user["email"] == "verified.analyst@energisense.ai"
    assert user["name"] == "Verified Smart Analyst"
    assert user["is_demo"] is False

@pytest.mark.anyio
async def test_firebase_token_expired_rejection(mock_firebase_crypto):
    past = int(time.time()) - 3600
    payload = {
        "iss": "https://securetoken.google.com/energisense-ai",
        "aud": "energisense-ai",
        "sub": "expired-user",
        "iat": past - 3600,
        "exp": past
    }
    token = jwt.encode(payload, mock_firebase_crypto["key"], algorithm="RS256", headers={"kid": mock_firebase_crypto["kid"]})

    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(authorization=f"Bearer {token}")
    assert exc_info.value.status_code == 401
    assert "expired" in exc_info.value.detail.lower()

@pytest.mark.anyio
async def test_firebase_token_invalid_audience_rejection(mock_firebase_crypto):
    now = int(time.time())
    payload = {
        "iss": "https://securetoken.google.com/energisense-ai",
        "aud": "wrong-project",
        "sub": "wrong-aud-user",
        "iat": now,
        "exp": now + 3600
    }
    token = jwt.encode(payload, mock_firebase_crypto["key"], algorithm="RS256", headers={"kid": mock_firebase_crypto["kid"]})

    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(authorization=f"Bearer {token}")
    assert exc_info.value.status_code == 401
    assert "audience mismatch" in exc_info.value.detail.lower()

@pytest.mark.anyio
async def test_firebase_token_invalid_issuer_rejection(mock_firebase_crypto):
    now = int(time.time())
    payload = {
        "iss": "https://securetoken.google.com/wrong-project",
        "aud": "energisense-ai",
        "sub": "wrong-iss-user",
        "iat": now,
        "exp": now + 3600
    }
    token = jwt.encode(payload, mock_firebase_crypto["key"], algorithm="RS256", headers={"kid": mock_firebase_crypto["kid"]})

    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(authorization=f"Bearer {token}")
    assert exc_info.value.status_code == 401
    assert "issuer mismatch" in exc_info.value.detail.lower()

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
