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

def set_stored_dataset(file_id: str, df: pd.DataFrame, meta: Dict[str, Any]):
    _DATASET_STORE[file_id] = df
    _DATASET_METADATA[file_id] = meta

async def process_and_validate_csv(file: UploadFile, max_size_mb: int = 50) -> Dict[str, Any]:
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
        "cols": total_cols
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
