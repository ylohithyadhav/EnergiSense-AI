import uuid
import io
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from fastapi import UploadFile, HTTPException

# In-memory storage for active uploaded datasets
# Maps file_id -> pd.DataFrame
_DATASET_STORE: Dict[str, pd.DataFrame] = {}
_DATASET_METADATA: Dict[str, Dict[str, Any]] = {}

def get_stored_dataset(file_id: str) -> Optional[pd.DataFrame]:
    return _DATASET_STORE.get(file_id)

def get_stored_dataset_metadata(file_id: str) -> Optional[Dict[str, Any]]:
    return _DATASET_METADATA.get(file_id)

def set_stored_dataset(file_id: str, df: pd.DataFrame, meta: Dict[str, Any]):
    _DATASET_STORE[file_id] = df
    _DATASET_METADATA[file_id] = meta

def verify_dataset_ownership(file_id: str, user_id: Optional[str] = None) -> Dict[str, Any]:
    meta = get_stored_dataset_metadata(file_id)
    if not meta:
        raise ValueError(f"Dataset '{file_id}' not found.")
    owner_id = meta.get("user_id")
    if owner_id != user_id:
        raise PermissionError(f"Access denied to dataset '{file_id}'.")
    return meta

def delete_stored_dataset(file_id: str, user_id: str) -> Dict[str, Any]:
    """
    Securely deletes a stored dataset and associated in-memory metadata
    after verifying that user_id strictly matches the dataset's owner_id.
    Invalidates associated analyses and cleans up any physical files.
    """
    if not user_id:
        raise PermissionError("A valid user_id is required to delete a dataset.")

    meta = verify_dataset_ownership(file_id, user_id=user_id)

    # 1. Clean up physical file if any path is recorded in metadata
    file_path = meta.get("file_path")
    if file_path and isinstance(file_path, str):
        import os
        safe_path = os.path.abspath(file_path)
        sample_path = os.path.abspath("data/sample_energy_data.csv")
        # Ensure we never delete the shared reference dataset
        if safe_path != sample_path and os.path.exists(safe_path):
            try:
                os.remove(safe_path)
            except Exception as e:
                raise RuntimeError(f"Failed to delete underlying dataset file: {str(e)}")

    # 2. Invalidate associated in-memory analyses
    from app.models.lgbm_pipeline import remove_analyses_by_file_id
    invalidated_analyses = remove_analyses_by_file_id(file_id=file_id, user_id=user_id)

    # 3. Clean up dataset and metadata stores
    _DATASET_STORE.pop(file_id, None)
    _DATASET_METADATA.pop(file_id, None)

    filename = meta.get("filename", file_id)
    return {
        "file_id": file_id,
        "deleted": True,
        "filename": filename,
        "invalidated_analyses": invalidated_analyses,
        "message": f"Dataset '{filename}' successfully deleted."
    }

async def process_and_validate_csv(file: UploadFile, max_size_mb: int = 50, user_id: Optional[str] = None) -> Dict[str, Any]:
    # 1. Validate file extension
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file extension for '{file.filename}'. Only CSV files (.csv) are supported."
        )

    # 2. Read bytes and check size
    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > max_size_mb:
        raise HTTPException(
            status_code=400,
            detail=f"File size ({size_mb:.2f} MB) exceeds maximum allowed limit of {max_size_mb} MB."
        )

    # 3. Parse CSV safely
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to parse CSV content. Error: {str(e)}"
        )

    if df.empty or len(df.columns) == 0:
        raise HTTPException(
            status_code=400,
            detail="The uploaded CSV file is empty or contains no columns."
        )

    # 4. Generate metadata & column details
    total_rows = int(len(df))
    total_cols = int(len(df.columns))
    columns = [str(c) for c in df.columns]

    column_details = []
    detected_timestamp = None
    detected_building = None
    detected_target = None
    feature_candidates = []

    for col in columns:
        col_series = df[col]
        missing_cnt = int(col_series.isnull().sum())
        missing_pct = round((missing_cnt / total_rows) * 100, 2)
        
        # Determine clean data type
        dtype_str = str(col_series.dtype)
        if np.issubdtype(col_series.dtype, np.number):
            dtype_str = "numeric"
        elif np.issubdtype(col_series.dtype, np.datetime64):
            dtype_str = "datetime"
        else:
            dtype_str = "string/categorical"

        # Check for timestamp candidate
        col_lower = col.lower()
        if not detected_timestamp and any(k in col_lower for k in ["time", "date", "timestamp", "datetime"]):
            try:
                pd.to_datetime(col_series.dropna().head(20))
                detected_timestamp = col
                dtype_str = "datetime"
            except Exception:
                pass

        # Check for building ID candidate
        if not detected_building and any(k in col_lower for k in ["building", "bldg", "facility", "site", "meter_id"]):
            detected_building = col

        # Check for energy target candidate
        if not detected_target and any(k in col_lower for k in ["energy", "kwh", "consumption", "power", "meter_reading", "load"]):
            if np.issubdtype(col_series.dtype, np.number):
                detected_target = col

        # Check feature candidates (numeric features excluding target)
        if np.issubdtype(col_series.dtype, np.number):
            if col != detected_target and "anomaly" not in col_lower:
                feature_candidates.append(col)

        sample_vals = col_series.dropna().head(3).tolist()
        sample_vals_cleaned = [
            float(v) if isinstance(v, (np.floating, float)) else
            int(v) if isinstance(v, (np.integer, int)) else str(v)
            for v in sample_vals
        ]

        column_details.append({
            "name": col,
            "dtype": dtype_str,
            "missing_count": missing_cnt,
            "missing_percentage": missing_pct,
            "sample_values": sample_vals_cleaned
        })

    # Prepare preview rows (sanitized for JSON)
    preview_df = df.head(10).replace({np.nan: None})
    preview_rows = preview_df.to_dict(orient="records")

    file_id = str(uuid.uuid4())
    set_stored_dataset(file_id, df, {
        "filename": file.filename,
        "rows": total_rows,
        "cols": total_cols,
        "user_id": user_id
    })

    return {
        "file_id": file_id,
        "filename": file.filename,
        "total_rows": total_rows,
        "total_columns": total_cols,
        "columns": columns,
        "column_details": column_details,
        "preview_rows": preview_rows,
        "suggested_mapping": {
            "timestamp_col": detected_timestamp or (columns[0] if len(columns) > 0 else ""),
            "building_col": detected_building or (columns[1] if len(columns) > 1 else ""),
            "target_col": detected_target or (columns[2] if len(columns) > 2 else ""),
            "feature_cols": feature_candidates
        }
    }
