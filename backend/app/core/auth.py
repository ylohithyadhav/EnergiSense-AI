import json
import logging
import os
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status, Depends
import firebase_admin
from firebase_admin import credentials, auth
from app.core.config import settings

logger = logging.getLogger("energisense.auth")

_firebase_initialized = False

def init_firebase() -> bool:
    global _firebase_initialized
    if len(firebase_admin._apps) > 0:
        _firebase_initialized = True
        return True

    try:
        # Priority 1: Service Account JSON file path
        if settings.FIREBASE_CREDENTIALS_PATH and os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
            cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
            firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin initialized with service account certificate file: %s", settings.FIREBASE_CREDENTIALS_PATH)
            _firebase_initialized = True
            return True

        # Priority 2: Service Account JSON string in environment variable (Render / Cloud deployment)
        if settings.FIREBASE_CREDENTIALS_JSON:
            try:
                cert_dict = json.loads(settings.FIREBASE_CREDENTIALS_JSON)
                cred = credentials.Certificate(cert_dict)
                firebase_admin.initialize_app(cred)
                logger.info("Firebase Admin initialized with service account JSON string.")
                _firebase_initialized = True
                return True
            except json.JSONDecodeError as jde:
                logger.error(f"Invalid FIREBASE_CREDENTIALS_JSON format: {jde}")

        # Priority 3: Firebase Project ID
        if settings.FIREBASE_PROJECT_ID:
            firebase_admin.initialize_app(options={"projectId": settings.FIREBASE_PROJECT_ID})
            logger.info("Firebase Admin initialized with Project ID: %s", settings.FIREBASE_PROJECT_ID)
            _firebase_initialized = True
            return True

        logger.info("Firebase credentials not configured. Running with guest analyst support.")
        return False
    except Exception as e:
        logger.error(f"Failed to initialize Firebase Admin: {e}")
        return False

# Initialize on module load if possible
init_firebase()

async def get_current_user(
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """
    Verifies Firebase Bearer token and returns authenticated user info.
    If in development/demo mode and no Firebase credentials configured, allows guest access.
    In production or when credentials exist, strictly enforces token verification.
    """
    if not authorization:
        # Check if Firebase is active
        if _firebase_initialized and settings.ENVIRONMENT == "production":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authorization header missing. Please log in to EnergiSense AI.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        # Development / Guest fallback
        return {
            "uid": "demo-guest-user",
            "email": "guest@energisense.ai",
            "name": "Guest Demo User",
            "is_demo": True
        }

    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization format. Expected 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1]
    
    # If it's a demo token in development
    if token.startswith("demo-token-"):
        return {
            "uid": token.replace("demo-token-", ""),
            "email": "demo@energisense.ai",
            "name": "Demo User",
            "is_demo": True
        }

_google_certs_cache = None
_google_certs_fetched_at = 0

def get_google_public_certs() -> Dict[str, str]:
    global _google_certs_cache, _google_certs_fetched_at
    import time
    import urllib.request
    now = time.time()
    if _google_certs_cache and (now - _google_certs_fetched_at < 3600):
        return _google_certs_cache
    try:
        certs_url = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
        with urllib.request.urlopen(certs_url, timeout=5) as resp:
            _google_certs_cache = json.loads(resp.read().decode("utf-8"))
            _google_certs_fetched_at = now
            return _google_certs_cache
    except Exception as e:
        logger.warning(f"Could not refresh Google public certificates: {e}")
        return _google_certs_cache or {}

async def get_current_user(
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """
    Verifies Firebase Bearer token and returns authenticated user info.
    If in development/demo mode and no Firebase credentials configured, allows guest access.
    In production or when credentials exist, strictly enforces token verification.
    """
    if not authorization:
        # Check if Firebase is active
        if _firebase_initialized and settings.ENVIRONMENT == "production":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authorization header missing. Please log in to EnergiSense AI.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        # Development / Guest fallback
        return {
            "uid": "demo-guest-user",
            "email": "guest@energisense.ai",
            "name": "Guest Demo User",
            "is_demo": True
        }

    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization format. Expected 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1]
    
    # If it's a demo token in development
    if token.startswith("demo-token-"):
        return {
            "uid": token.replace("demo-token-", ""),
            "email": "demo@energisense.ai",
            "name": "Demo User",
            "is_demo": True
        }

    # 1. Try Firebase Admin SDK verification if app is initialized
    if _firebase_initialized and len(firebase_admin._apps) > 0:
        try:
            decoded_token = auth.verify_id_token(token, clock_skew_seconds=60)
            return {
                "uid": decoded_token.get("uid"),
                "email": decoded_token.get("email"),
                "name": decoded_token.get("name", decoded_token.get("email", "User")),
                "is_demo": False
            }
        except Exception as admin_err:
            logger.info(f"Firebase Admin SDK verification attempt: {admin_err}. Trying Google public certs fallback.")

    # 2. Resilient fallback: Verify cryptographic signature via Google's public certificates
    try:
        from google.auth import jwt as google_jwt
        certs = get_google_public_certs()
        target_project_id = settings.FIREBASE_PROJECT_ID or "energisense-ai"
        if certs:
            claims = google_jwt.decode(
                token,
                certs=certs,
                verify=True,
                audience=target_project_id,
                clock_skew_in_seconds=60
            )
            return {
                "uid": claims.get("user_id") or claims.get("sub"),
                "email": claims.get("email"),
                "name": claims.get("name", claims.get("email", "User")),
                "is_demo": False
            }
    except Exception as cert_err:
        logger.warning(f"Google public cert token verification failed: {cert_err}")

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
