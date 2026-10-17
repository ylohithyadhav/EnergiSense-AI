export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  isDemo?: boolean;
}

export interface ColumnInfo {
  name: string;
  dtype: string;
  missing_count: number;
  missing_percentage: number;
  sample_values: (string | number)[];
}

export interface DatasetUploadResponse {
  file_id: string;
  filename: string;
  total_rows: number;
  total_columns: number;
  columns: string[];
  column_details: ColumnInfo[];
  preview_rows: Record<string, any>[];
  suggested_mapping: {
    timestamp_col: string;
    building_col: string;
    target_col: string;
    feature_cols: string[];
  };
}

export interface FeatureImportanceItem {
  feature: string;
  importance: number;
}

export interface ActualVsPredictedItem {
  index: number;
  timestamp: string;
  building_id: string;
  actual_energy: number;
  predicted_energy: number;
  residual: number;
  regime: string;
}

export interface TrainResponse {
  analysis_id: string;
  dataset_name: string;
  model_name: string;
  train_rows: number;
  val_rows: number;
  test_rows: number;
  mae: number;
  rmse: number;
  baseline_mae: number;
  baseline_rmse: number;
  feature_importances: FeatureImportanceItem[];
  actual_vs_predicted_preview: ActualVsPredictedItem[];
  regimes_detected: string[];
}

export interface MethodMetrics {
  method_name: string;
  anomalies_detected: number;
  detection_rate_pct: number;
  precision?: number | null;
  recall?: number | null;
  f1_score?: number | null;
  pr_auc?: number | null;
  roc_auc?: number | null;
  false_positives_per_1000?: number | null;
}

export interface AnomalyRecord {
  index: number;
  building_id: string;
  timestamp: string;
  actual_energy: number;
  predicted_energy: number;
  residual: number;
  regime: string;
  threshold: number;
  anomaly_score: number;
  severity: 'Normal' | 'Warning' | 'Critical';
  detected_by_global: boolean;
  detected_by_rolling: boolean;
  detected_by_iforest: boolean;
  detected_by_regime: boolean;
  is_anomaly: boolean;
  suggested_action: string;
}

export interface AnomalyDetectResponse {
  analysis_id: string;
  total_samples: number;
  ground_truth_available: boolean;
  method_comparison: MethodMetrics[];
  anomalies: AnomalyRecord[];
  regime_distribution: Record<string, number>;
  anomalies_by_building: Record<string, number>;
}

export interface SHAPContribution {
  feature: string;
  feature_value: any;
  shap_value: number;
}

export interface IndividualExplanation {
  index: number;
  building_id: string;
  timestamp: string;
  actual_energy: number;
  predicted_energy: number;
  base_value: number;
  contributions: SHAPContribution[];
  text_summary: string;
  all_contributions_sum?: number;
  additivity_residual?: number;
}

export interface SHAPExplainResponse {
  analysis_id: string;
  base_value: number;
  global_importance: FeatureImportanceItem[];
  individual_explanation: IndividualExplanation | null;
  summary_text: string;
}

export interface AnalysisHistoryItem {
  analysis_id: string;
  dataset_name: string;
  created_at: string;
  record_count: number;
  building_count: number;
  mae: number;
  rmse: number;
  anomalies_count: number;
  user_id?: string;
}
