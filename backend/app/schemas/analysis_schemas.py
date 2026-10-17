from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, ConfigDict

class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "EnergiSense AI API"
    version: str = "1.0.0"
    timestamp: str

class StatusResponse(BaseModel):
    status: str
    environment: str
    firebase_auth_enabled: bool
    firestore_enabled: bool
    max_upload_size_mb: int

class ColumnInfo(BaseModel):
    name: str
    dtype: str
    missing_count: int
    missing_percentage: float
    sample_values: List[Any]

class DatasetUploadResponse(BaseModel):
    file_id: str
    filename: str
    total_rows: int
    total_columns: int
    columns: List[str]
    column_details: List[ColumnInfo]
    preview_rows: List[Dict[str, Any]]
    suggested_mapping: Dict[str, Any]

class DatasetDeleteResponse(BaseModel):
    file_id: str
    deleted: bool
    filename: Optional[str] = None
    invalidated_analyses: List[str] = Field(default_factory=list)
    message: str

class TrainRequest(BaseModel):
    file_id: str
    dataset_name: Optional[str] = "Uploaded Dataset"
    timestamp_col: str
    building_col: str
    target_col: str
    feature_cols: List[str]
    train_split: float = Field(default=0.70, ge=0.5, le=0.9)
    val_split: float = Field(default=0.15, ge=0.05, le=0.3)
    test_split: float = Field(default=0.15, ge=0.05, le=0.3)
    regime_feature_cols: Optional[List[str]] = None

class FeatureImportanceItem(BaseModel):
    feature: str
    importance: float

class TrainResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    analysis_id: str
    user_id: Optional[str] = None
    dataset_name: str
    model_name: str = "LightGBM Regressor"
    train_rows: int
    val_rows: int
    test_rows: int
    mae: float
    rmse: float
    baseline_mae: float
    baseline_rmse: float
    feature_importances: List[FeatureImportanceItem]
    actual_vs_predicted_preview: List[Dict[str, Any]]
    regimes_detected: List[str]

class PredictRequest(BaseModel):
    analysis_id: str
    limit: Optional[int] = Field(default=100, ge=1, le=1000)

class PredictItem(BaseModel):
    index: int
    timestamp: str
    building_id: str
    actual_energy: Optional[float] = None
    predicted_energy: float
    residual: Optional[float] = None
    regime: Optional[str] = None

class PredictResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    analysis_id: str
    model_name: str = "LightGBM Regressor"
    predictions_count: int
    predictions: List[PredictItem]

class AnomalyDetectRequest(BaseModel):
    analysis_id: str
    global_sigma: float = Field(default=3.0, ge=1.0, le=5.0)
    rolling_window: int = Field(default=24, ge=4, le=168)
    rolling_sigma: float = Field(default=2.5, ge=1.0, le=5.0)
    isolation_forest_contamination: float = Field(default=0.03, ge=0.005, le=0.2)
    regime_sigma: float = Field(default=2.5, ge=1.0, le=5.0)

class AnomalyRecord(BaseModel):
    index: int
    building_id: str
    timestamp: str
    actual_energy: float
    predicted_energy: float
    residual: float
    regime: str
    threshold: float
    anomaly_score: float
    severity: str # "Normal", "Warning", "Critical"
    detected_by_global: bool
    detected_by_rolling: bool
    detected_by_iforest: bool
    detected_by_regime: bool
    is_anomaly: bool
    suggested_action: str

class MethodMetrics(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    method_name: str
    anomalies_detected: int
    detection_rate_pct: float
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1_score: Optional[float] = None
    pr_auc: Optional[float] = None
    roc_auc: Optional[float] = None
    false_positives_per_1000: Optional[float] = None

class AnomalyDetectResponse(BaseModel):
    analysis_id: str
    total_samples: int
    ground_truth_available: bool
    method_comparison: List[MethodMetrics]
    anomalies: List[AnomalyRecord]
    regime_distribution: Dict[str, int]
    anomalies_by_building: Dict[str, int]

class SHAPExplainRequest(BaseModel):
    analysis_id: str
    sample_size: int = Field(default=80, ge=10, le=500)
    record_index: Optional[int] = None

class SHAPContribution(BaseModel):
    feature: str
    feature_value: Any
    shap_value: float

class IndividualExplanation(BaseModel):
    index: int
    building_id: str
    timestamp: str
    actual_energy: float
    predicted_energy: float
    base_value: float
    contributions: List[SHAPContribution]
    text_summary: str

class SHAPExplainResponse(BaseModel):
    analysis_id: str
    base_value: float
    global_importance: List[FeatureImportanceItem]
    individual_explanation: Optional[IndividualExplanation] = None
    summary_text: str

class AnalysisHistoryItem(BaseModel):
    analysis_id: str
    dataset_name: str
    created_at: str
    record_count: int
    building_count: int
    mae: float
    rmse: float
    anomalies_count: int
    user_id: Optional[str] = None
