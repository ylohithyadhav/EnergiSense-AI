import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAnalysis } from '../context/AnalysisContext';
import { api } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
  UploadCloud,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Info,
  Database,
  Trash2,
  AlertTriangle
} from 'lucide-react';

export const DatasetUpload: React.FC = () => {
  const { getIdToken } = useAuth();
  const { activeUpload, setActiveUpload, resetAnalysis } = useAnalysis();
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Column mapping state
  const [timestampCol, setTimestampCol] = useState('');
  const [buildingCol, setBuildingCol] = useState('');
  const [targetCol, setTargetCol] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  const handleDeleteDataset = async () => {
    if (!activeUpload) return;
    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const token = await getIdToken();
      const res = await api.deleteDataset(activeUpload.file_id, token);
      const deletedName = activeUpload.filename || "Dataset";

      // Purge local context and reset form inputs
      resetAnalysis();
      setFile(null);
      setTimestampCol('');
      setBuildingCol('');
      setTargetCol('');
      setSelectedFeatures([]);
      setShowDeleteModal(false);

      setSuccess(res.message || `Dataset "${deletedName}" was successfully deleted from the server.`);
    } catch (err: any) {
      setError(err.message || "Failed to delete dataset. Please verify network connection or permissions.");
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setSuccess(null);
    }
  };

  const handleUpload = async (uploadFile?: File) => {
    const targetFile = uploadFile || file;
    if (!targetFile) {
      setError("Please select a valid CSV file first.");
      return;
    }

    setLoading(true);
    setError(null);
    resetAnalysis();

    try {
      const token = await getIdToken();
      const response = await api.uploadDataset(targetFile, token);
      setActiveUpload(response);
      setSuccess(`Dataset successfully uploaded and validated: ${response.total_rows} rows, ${response.total_columns} columns.`);

      // Initialize mapping from suggested mapping
      setTimestampCol(response.suggested_mapping.timestamp_col || response.columns[0] || '');
      setBuildingCol(response.suggested_mapping.building_col || response.columns[1] || '');
      setTargetCol(response.suggested_mapping.target_col || response.columns[2] || '');
      setSelectedFeatures(response.suggested_mapping.feature_cols || []);
    } catch (err: any) {
      setError(err.message || "Failed to process dataset. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDemoDataset = async () => {
    setLoading(true);
    setError(null);
    try {
      const sampleCsv = await fetch('/data/sample_energy_data.csv').then(res => {
        if (!res.ok) throw new Error("Sample file not directly found in public directory.");
        return res.blob();
      });

      const demoFile = new File([sampleCsv], "sample_energy_data.csv", { type: "text/csv" });
      setFile(demoFile);
      await handleUpload(demoFile);
    } catch (e: any) {
      // Inline demo data fallback
      const sampleData = 
`timestamp,building_id,energy_kwh,air_temperature,relative_humidity,solar_radiation,occupancy_rate,is_weekend,ground_truth_anomaly
2024-01-01 00:00:00,Building_Admin_101,50.47,13.75,74.98,0.0,0.034,0,0
2024-01-01 01:00:00,Building_Admin_101,55.74,12.08,81.33,0.0,0.049,0,0
2024-01-01 02:00:00,Building_Admin_101,50.42,11.39,75.42,0.0,0.022,0,0
2024-01-01 03:00:00,Building_Admin_101,51.23,13.50,73.55,0.0,0.025,0,0
2024-01-01 04:00:00,Building_Admin_101,53.37,12.40,77.19,0.0,0.034,0,0
2024-01-01 05:00:00,Building_Admin_101,52.33,13.81,71.68,0.0,0.037,0,0
2024-01-01 06:00:00,Building_Admin_101,53.58,14.86,70.51,32.9,0.147,0,0
2024-01-01 07:00:00,Building_Admin_101,53.85,21.35,71.69,236.59,0.113,0,0
2024-01-01 08:00:00,Building_Admin_101,68.74,18.88,60.25,381.57,0.353,0,0
2024-01-01 09:00:00,Building_Admin_101,80.98,20.04,62.87,550.28,0.530,0,0
2024-01-01 10:00:00,Building_Admin_101,95.70,25.16,61.26,659.25,0.667,0,0
2024-01-01 11:00:00,Building_Admin_101,110.78,26.91,55.08,765.31,0.885,0,0
2024-01-01 12:00:00,Building_Admin_101,115.65,28.02,55.50,814.47,0.886,0,0
2024-01-01 13:00:00,Building_Admin_101,121.25,29.66,63.53,735.93,0.954,0,0
2024-01-01 14:00:00,Building_Admin_101,118.42,28.74,60.12,680.12,0.840,0,0
2024-01-01 15:00:00,Building_Admin_101,114.10,27.15,62.40,540.00,0.780,0,0
2024-01-01 16:00:00,Building_Admin_101,105.30,24.80,66.10,320.50,0.650,0,0
2024-01-01 17:00:00,Building_Admin_101,92.50,22.10,69.50,110.20,0.420,0,0
2024-01-01 18:00:00,Building_Admin_101,78.20,20.30,72.40,10.00,0.210,0,0
2024-01-01 19:00:00,Building_Admin_101,65.40,19.20,74.80,0.0,0.110,0,0
2024-01-01 20:00:00,Building_Admin_101,58.30,18.10,75.90,0.0,0.060,0,0
2024-01-02 01:00:00,Building_Admin_101,88.40,14.60,80.50,0.0,0.020,0,1`;
      const blob = new Blob([sampleData], { type: 'text/csv' });
      const fallbackFile = new File([blob], 'sample_energy_data.csv', { type: 'text/csv' });
      setFile(fallbackFile);
      await handleUpload(fallbackFile);
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = (col: string) => {
    if (selectedFeatures.includes(col)) {
      setSelectedFeatures(selectedFeatures.filter(f => f !== col));
    } else {
      setSelectedFeatures([...selectedFeatures, col]);
    }
  };

  const handleProceed = () => {
    if (!activeUpload) return;
    if (!timestampCol || !buildingCol || !targetCol) {
      setError("Please designate Timestamp, Building ID, and Target Energy columns.");
      return;
    }
    if (selectedFeatures.length === 0) {
      setError("Please select at least one input feature for the ML model.");
      return;
    }

    activeUpload.suggested_mapping = {
      timestamp_col: timestampCol,
      building_col: buildingCol,
      target_col: targetCol,
      feature_cols: selectedFeatures
    };

    navigate('/predict');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-navy-900 dark:text-white">Dataset Ingestion & Validation</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Upload commercial or institutional smart building hourly CSV energy telemetry.
          </p>
        </div>
        <button
          onClick={handleLoadDemoDataset}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 px-4 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition shadow-sm w-full sm:w-auto"
        >
          <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span>Load Synthetic Demo Dataset</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 p-4 text-sm text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-900/50">
          <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-4 text-sm text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-900/50">
          <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Upload Box */}
      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 sm:p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
          <UploadCloud className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-navy-900 dark:text-white">Choose CSV Dataset</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Accepted format: .csv (Max size: 50 MB). Observations should be chronologically ordered.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <label className="cursor-pointer rounded-lg bg-navy-900 dark:bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow hover:bg-navy-800 dark:hover:bg-blue-700 transition w-full sm:w-auto text-center">
            Browse File
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          {file && (
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 max-w-full truncate">
              {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </span>
          )}
          {file && !loading && (
            <button
              onClick={() => handleUpload()}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow hover:bg-blue-700 transition w-full sm:w-auto"
            >
              Validate & Inspect
            </button>
          )}
        </div>
      </div>

      {loading && <LoadingSpinner message="Validating CSV structure and computing data statistics..." size="md" />}

      {/* Dataset Statistics & Column Mapping */}
      {activeUpload && !loading && (
        <div className="space-y-6">
          {/* Active Dataset Banner with Metadata & Secure Deletion Action */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-950/30 p-4 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                <Database className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                    Active Dataset
                  </span>
                  <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                    Validated
                  </span>
                </div>
                <p className="font-semibold text-sm text-navy-900 dark:text-white truncate">
                  {activeUpload.filename}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                  ID: {activeUpload.file_id}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:self-center">
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                disabled={deleting}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-rose-300 dark:border-rose-900/60 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-400 dark:hover:border-rose-800 transition shadow-sm w-full sm:w-auto"
                title="Delete this uploaded dataset from the server"
              >
                <Trash2 className="h-4 w-4 flex-shrink-0" />
                <span>Delete Dataset</span>
              </button>
            </div>
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm min-w-0">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Total Records</p>
              <p className="mt-1 text-2xl font-bold text-navy-900 dark:text-white">{activeUpload.total_rows.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm min-w-0">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Total Columns</p>
              <p className="mt-1 text-2xl font-bold text-navy-900 dark:text-white">{activeUpload.total_columns}</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm min-w-0">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Identified Target</p>
              <p className="mt-1 text-lg font-bold text-blue-600 dark:text-blue-400 truncate">{targetCol || 'Unassigned'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm min-w-0">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Input Features</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{selectedFeatures.length}</p>
            </div>
          </div>

          {/* Column Mapping Section */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-bold text-navy-900 dark:text-white">Flexible Column Mapping Interface</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              EnergiSense AI does not assume hardcoded column names. Designate your dataset's columns below:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Timestamp Column *</label>
                <select
                  value={timestampCol}
                  onChange={(e) => setTimestampCol(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 dark:border-slate-700 p-2 text-xs focus:border-blue-600 focus:outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                >
                  <option value="">-- Select Timestamp --</option>
                  {activeUpload.columns.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Used for chronological sorting and time features.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Building ID Column *</label>
                <select
                  value={buildingCol}
                  onChange={(e) => setBuildingCol(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 dark:border-slate-700 p-2 text-xs focus:border-blue-600 focus:outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                >
                  <option value="">-- Select Building ID --</option>
                  {activeUpload.columns.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Identifies separate physical facility meters.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Target Energy Column *</label>
                <select
                  value={targetCol}
                  onChange={(e) => setTargetCol(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 dark:border-slate-700 p-2 text-xs focus:border-blue-600 focus:outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                >
                  <option value="">-- Select Energy (kWh / Load) --</option>
                  {activeUpload.columns.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">The continuous numerical target to predict.</p>
              </div>
            </div>

            {/* Feature Selection Checkboxes */}
            <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Predictive Input Features (Weather, Occupancy, Schedules):
              </label>
              <div className="flex flex-wrap gap-2">
                {activeUpload.columns
                  .filter((c) => c !== timestampCol && c !== buildingCol && c !== targetCol)
                  .map((col) => {
                    const isSelected = selectedFeatures.includes(col);
                    return (
                      <button
                        key={col}
                        type="button"
                        onClick={() => toggleFeature(col)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition border ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '} {col}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Proceed Action */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleProceed}
                className="flex items-center justify-center gap-2 rounded-lg bg-navy-900 dark:bg-blue-600 hover:bg-navy-800 dark:hover:bg-blue-700 px-6 py-2.5 text-xs font-semibold text-white shadow transition w-full sm:w-auto"
              >
                <span>Proceed to Energy Prediction Pipeline</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Dataset Inspection Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm overflow-hidden min-w-0">
            <h2 className="text-base font-bold text-navy-900 dark:text-white mb-4">Dataset Columns Inspection & Missing Value Audit</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 uppercase border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Column</th>
                    <th className="py-2.5 px-4 font-semibold">Detected Type</th>
                    <th className="py-2.5 px-4 font-semibold">Missing Count</th>
                    <th className="py-2.5 px-4 font-semibold">Missing %</th>
                    <th className="py-2.5 px-4 font-semibold">Sample Values</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {activeUpload.column_details.map((col) => (
                    <tr key={col.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 font-semibold text-navy-900 dark:text-white font-sans">{col.name}</td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">{col.dtype}</td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">{col.missing_count}</td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          col.missing_percentage === 0 ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                        }`}>
                          {col.missing_percentage}%
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 truncate max-w-xs">
                        {col.sample_values.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && activeUpload && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-navy-900 dark:text-white">Confirm Dataset Deletion</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete <strong className="font-semibold text-navy-900 dark:text-white">{activeUpload.filename}</strong>?
              This will securely purge the uploaded data from the server and invalidate any active model predictions or SHAP explanations derived from this dataset.
            </p>

            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 text-[11px] font-mono text-slate-600 dark:text-slate-400 break-all border border-slate-200 dark:border-slate-700/60">
              File ID: {activeUpload.file_id}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="w-full sm:w-auto rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteDataset}
                disabled={deleting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-semibold text-white shadow transition disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
