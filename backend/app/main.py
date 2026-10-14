from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
import logging

from app.core.config import settings
from app.api.routes import router as api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("energisense.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("EnergiSense AI Backend successfully started.")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Max Upload Limit: {settings.MAX_UPLOAD_SIZE_MB} MB")
    yield
    logger.info("EnergiSense AI Backend shutting down.")

app = FastAPI(
    title="EnergiSense AI Backend API",
    description="A Regime-Aware Explainable Machine Learning Framework for Energy Prediction and Anomaly Detection in Smart Buildings",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"^https:\/\/.*\.web\.app$|^https:\/\/.*\.firebaseapp\.com$|^http:\/\/localhost(:\d+)?$|^http:\/\/127\.0\.0\.1(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Direct root health endpoint
@app.get("/health", tags=["Health"])
async def root_health():
    return {
        "status": "ok",
        "service": "EnergiSense AI",
        "version": settings.VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# Include all /api routes
app.include_router(api_router, prefix=settings.API_PREFIX)
