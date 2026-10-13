import uuid
import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.metrics import mean_absolute_error, mean_squared_error
from typing import Dict, Any, Tuple, List, Optional

# Active in-memory analyses storage
# Maps analysis_id -> analysis state dict
_ANALYSES_STORE: Dict[str, Dict[str, Any]] = {}

def get_analysis_state(analysis_id: str) -> Optional[Dict[str, Any]]:
    return _ANALYSES_STORE.get(analysis_id)

def set_analysis_state(analysis_id: str, state: Dict[str, Any]):
    _ANALYSES_STORE[analysis_id] = state

def engineer_time_features(df: pd.DataFrame, timestamp_col: str) -> pd.DataFrame:
    """
    Extracts chronological and cyclical time features from timestamp.
    """
    df = df.copy()
    ts = pd.to_datetime(df[timestamp_col])
    
    df["hour"] = ts.dt.hour
    df["day_of_week"] = ts.dt.dayofweek
    df["is_weekend"] = (ts.dt.dayofweek >= 5).astype(int)
    df["month"] = ts.dt.month
    
    # Cyclical hour encoding (smooth continuous cycle for ML)
    df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24.0)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24.0)
    
    return df

def identify_regimes(df: pd.DataFrame, temp_col: Optional[str] = None) -> pd.Series:
    """
    Determines operational regime for each observation:
    - Business Hours vs Non-Business Hours
    - Weekday vs Weekend
    - Cooling Load (High Temp) vs Heating/Normal Load
    """
    hour = df["hour"] if "hour" in df.columns else 12
    is_weekend = df["is_weekend"] if "is_weekend" in df.columns else 0
    
    regimes = []
    for idx, row in df.iterrows():
        h = row.get("hour", 12)
        wk = row.get("is_weekend", 0)
        temp = row.get(temp_col, 20.0) if temp_col and temp_col in row else 20.0
        
        if wk == 1:
            base = "Weekend"
        elif 8 <= h <= 18:
            base = "Occupied_Peak"
        else:
            base = "Unoccupied_Night"
            
        if temp >= 24.0:
            thermal = "HighCooling"
        elif temp <= 16.0:
            thermal = "Heating"
        else:
            thermal = "Moderate"
            
        regimes.append(f"{base}_{thermal}")
        
    return pd.Series(regimes, index=df.index)

def train_lightgbm_pipeline(
    df: pd.DataFrame,
    timestamp_col: str,
    building_col: str,
    target_col: str,
    feature_cols: List[str],
    train_split: float = 0.70,
    val_split: float = 0.15,
    test_split: float = 0.15,
    dataset_name: str = "Energy Dataset"
) -> Dict[str, Any]:
    """
    Executes chronological validation and training pipeline with LightGBM.
    Strictly avoids data leakage: sorts chronologically, fits model on train,
    validates on val, evaluates on test.
    """
    # 1. Parse and sort chronologically
    df_clean = df.copy()
    df_clean["parsed_timestamp"] = pd.to_datetime(df_clean[timestamp_col])
    df_clean = df_clean.sort_values(by="parsed_timestamp").reset_index(drop=True)

    # 2. Engineer temporal features
    df_features = engineer_time_features(df_clean, "parsed_timestamp")
    
    # 3. Handle building category
    df_features[building_col] = df_features[building_col].astype(str)
    
    # Find temperature column for regime if present
    temp_col = next((c for c in feature_cols if "temp" in c.lower()), None)
    df_features["regime"] = identify_regimes(df_features, temp_col)
    
    # Selected feature space
    time_features = ["hour", "day_of_week", "is_weekend", "hour_sin", "hour_cos"]
    ml_features = list(feature_cols) + time_features
    
    # Add building categorical if not numeric
    building_dummies = pd.get_dummies(df_features[building_col], prefix="bldg", drop_first=True)
    X_full = pd.concat([df_features[ml_features], building_dummies], axis=1)
    
    # Impute missing values with training median only (prevent leakage)
    total_len = len(df_features)
    train_end = int(total_len * train_split)
    val_end = int(total_len * (train_split + val_split))
    
    train_medians = X_full.iloc[:train_end].median()
    X_full = X_full.fillna(train_medians)
    
    y_full = df_features[target_col].values

    # 4. Chronological splits
    X_train = X_full.iloc[:train_end]
    y_train = y_full[:train_end]
    
    X_val = X_full.iloc[train_end:val_end]
    y_val = y_full[train_end:val_end]
    
    X_test = X_full.iloc[val_end:]
    y_test = y_full[val_end:]
    
    test_meta_df = df_features.iloc[val_end:].copy().reset_index(drop=True)

    # 5. Train LightGBM model
    model = lgb.LGBMRegressor(
        n_estimators=180,
        learning_rate=0.04,
        max_depth=6,
        num_leaves=31,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=42,
        importance_type='gain'
    )
    
    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        callbacks=[lgb.early_stopping(stopping_rounds=20, verbose=False)]
    )

    # 6. Evaluate predictions
    y_train_pred = model.predict(X_train)
    y_val_pred = model.predict(X_val)
    y_test_pred = model.predict(X_test)

    mae = float(mean_absolute_error(y_test, y_test_pred))
    rmse = float(np.sqrt(mean_squared_error(y_test, y_test_pred)))

    # Baseline persistence model (predict previous observation or train mean)
    # Naive persistence baseline: previous step prediction
    y_test_persist = np.roll(y_test, 1)
    y_test_persist[0] = y_train[-1]
    baseline_mae = float(mean_absolute_error(y_test, y_test_persist))
    baseline_rmse = float(np.sqrt(mean_squared_error(y_test, y_test_persist)))

    # Feature importances
    feature_names = list(X_full.columns)
    importances = model.feature_importances_
    norm_importances = importances / (importances.sum() + 1e-9)
    
    feat_imp_list = [
        {"feature": name, "importance": round(float(imp), 4)}
        for name, imp in sorted(zip(feature_names, norm_importances), key=lambda x: x[1], reverse=True)
    ][:12] # Top 12 features

    # Actual vs predicted preview for chart / table
    preview_records = []
    test_meta_df["predicted_energy"] = y_test_pred
    test_meta_df["actual_energy"] = y_test
    test_meta_df["residual"] = y_test - y_test_pred

    for i in range(min(120, len(test_meta_df))):
        row = test_meta_df.iloc[i]
        preview_records.append({
            "index": i,
            "timestamp": str(row["parsed_timestamp"]),
            "building_id": str(row[building_col]),
            "actual_energy": round(float(row["actual_energy"]), 2),
            "predicted_energy": round(float(row["predicted_energy"]), 2),
            "residual": round(float(row["residual"]), 2),
            "regime": str(row["regime"])
        })

    analysis_id = str(uuid.uuid4())
    state = {
        "analysis_id": analysis_id,
        "dataset_name": dataset_name,
        "model": model,
        "feature_names": feature_names,
        "building_col": building_col,
        "timestamp_col": timestamp_col,
        "target_col": target_col,
        "X_train": X_train,
        "y_train": y_train,
        "y_train_pred": y_train_pred,
        "X_val": X_val,
        "y_val": y_val,
        "y_val_pred": y_val_pred,
        "X_test": X_test,
        "y_test": y_test,
        "y_test_pred": y_test_pred,
        "test_meta_df": test_meta_df,
        "train_rows": len(X_train),
        "val_rows": len(X_val),
        "test_rows": len(X_test),
        "mae": round(mae, 3),
        "rmse": round(rmse, 3),
        "baseline_mae": round(baseline_mae, 3),
        "baseline_rmse": round(baseline_rmse, 3),
        "feature_importances": feat_imp_list,
        "regimes_detected": list(test_meta_df["regime"].unique())
    }
    
    set_analysis_state(analysis_id, state)

    return {
        "analysis_id": analysis_id,
        "dataset_name": dataset_name,
        "model_name": "LightGBM Regressor (Regime-Aware)",
        "train_rows": len(X_train),
        "val_rows": len(X_val),
        "test_rows": len(X_test),
        "mae": round(mae, 3),
        "rmse": round(rmse, 3),
        "baseline_mae": round(baseline_mae, 3),
        "baseline_rmse": round(baseline_rmse, 3),
        "feature_importances": feat_imp_list,
        "actual_vs_predicted_preview": preview_records,
        "regimes_detected": list(test_meta_df["regime"].unique())
    }
