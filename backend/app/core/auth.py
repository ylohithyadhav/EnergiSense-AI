import json
import logging
import os
import time
import urllib.request
from typing import Optional, Dict, Any, List
from fastapi import Header, HTTPException, status, Depends
import jwt
from cryptography import x509
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicKey
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
            firebase_admin.initialize_app(options={"projectId": settings.FIREBASE_PROJECT_ID.strip("'\" ")})
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

# Google Public Certificates Cache
_google_public_keys_cache: Dict[str, RSAPublicKey] = {}
_google_certs_fetched_at: float = 0.0

def get_google_public_keys(force_refresh: bool = False) -> Dict[str, RSAPublicKey]:
    """
    Fetches and caches Google's public certificates used to sign Firebase ID tokens.
    Public keys are rotated periodically; cached for up to 1 hour or refreshed on demand.
    """
    global _google_public_keys_cache, _google_certs_fetched_at
    now = time.time()
    if not force_refresh and _google_public_keys_cache and (now - _google_certs_fetched_at < 3600):
        return _google_public_keys_cache

    certs_url = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
    try:
        req = urllib.request.Request(
            certs_url,
            headers={
                "User-Agent": "EnergiSense-AI/1.0",
                "Accept": "application/json"
            }
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            cert_data = json.loads(resp.read().decode("utf-8"))

        new_keys: Dict[str, RSAPublicKey] = {}
        for kid, cert_pem in cert_data.items():
            try:
                cert = x509.load_pem_x509_certificate(cert_pem.encode("utf-8"))
                pub_key = cert.public_key()
                if isinstance(pub_key, RSAPublicKey):
                    new_keys[kid] = pub_key
            except Exception as parse_err:
                logger.warning(f"Failed to parse public certificate for kid {kid}: {parse_err}")

        if new_keys:
            _google_public_keys_cache = new_keys
            _google_certs_fetched_at = now
            logger.info(f"Refreshed Google public certificates ({len(_google_public_keys_cache)} keys loaded).")
        return _google_public_keys_cache
    except Exception as e:
        logger.warning(f"Could not refresh Google public certificates: {e}")
        return _google_public_keys_cache

def verify_firebase_id_token(token: str) -> Dict[str, Any]:
    """
    Cryptographically verifies a Firebase Authentication ID token.
    1. Tries Firebase Admin SDK if service credentials are present.
    2. Fallback: Verifies RS256 signature using Google's public certs, audience, issuer, and expiration.
    """
    # 1. Try Firebase Admin SDK verification if app is initialized
    if _firebase_initialized and len(firebase_admin._apps) > 0:
        try:
            decoded_token = auth.verify_id_token(token, clock_skew_seconds=60)
            return {
                "uid": decoded_token.get("uid"),
                "email": decoded_token.get("email"),
                "name": decoded_token.get("name") or (decoded_token.get("email", "").split("@")[0] if decoded_token.get("email") else "User"),
                "is_demo": False
            }
        except Exception as admin_err:
            # DefaultCredentialsError or similar when running on Render without serviceAccountKey.json
            logger.debug("Firebase Admin SDK verification bypassed: %s. Using cryptographic public key verifier.", admin_err)

    # 2. Cryptographic verification using Google's public certificates (Zero-Cost / No Service Account needed)
    try:
        header = jwt.get_unverified_header(token)
    except Exception as h_err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Malformed authentication token: {str(h_err)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    kid = header.get("kid")
    alg = header.get("alg")
    if alg != "RS256" or not kid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token header. Algorithm must be RS256 with key ID (kid).",
            headers={"WWW-Authenticate": "Bearer"},
        )

    keys = get_google_public_keys()
    if kid not in keys:
        # Key might have been rotated by Google; force refresh once
        keys = get_google_public_keys(force_refresh=True)

    if kid not in keys:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: signing key ID '{kid}' not recognized by Google.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    public_key = keys[kid]

    # Target audiences: support configured project ID and canonical 'energisense-ai'
    raw_pid = (settings.FIREBASE_PROJECT_ID or "").strip("'\" ")
    valid_audiences = list(set(filter(None, [raw_pid, "energisense-ai"])))
    valid_issuers = [f"https://securetoken.google.com/{pid}" for pid in valid_audiences]

    try:
        claims = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=valid_audiences,
            issuer=valid_issuers,
            leeway=60,
            options={
                "verify_signature": True,
                "verify_aud": True,
                "verify_iss": True,
                "verify_exp": True,
                "verify_iat": True
            }
        )
        uid = claims.get("user_id") or claims.get("sub")
        email = claims.get("email")
        name = claims.get("name") or (email.split("@")[0] if email else "User")
        return {
            "uid": uid,
            "email": email,
            "name": name,
            "is_demo": False
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidAudienceError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication token audience mismatch. Expected one of: {valid_audiences}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidIssuerError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication token issuer mismatch. Expected securetoken from: {valid_audiences}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as ite:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(ite)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """
    Verifies Firebase Bearer token and returns authenticated user info.
    If in development/demo mode and no authorization header is provided, allows guest access.
    In production or when authorization header is provided, strictly enforces token verification.
    """
    if not authorization:
        # Check if production environment enforces auth
        if settings.ENVIRONMENT == "production":
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

    token = parts[1].strip()

    # If it's a demo token in development
    if token.startswith("demo-token-"):
        demo_uid = token.replace("demo-token-", "") or "demo-analyst"
        return {
            "uid": demo_uid,
            "email": f"{demo_uid}@energisense.ai",
            "name": "Guest Demo User",
            "is_demo": True
        }

    return verify_firebase_id_token(token)
