import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAnalysis } from '../context/AnalysisContext';
import { api } from '../services/api';
import { KPICard } from '../components/KPICard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import {
  TrendingUp,
  Cpu,
  ArrowRight,
  AlertCircle,
  Sliders,
  CheckCircle2,
  BarChart2
} from 'lucide-react';

export const EnergyPrediction: React.FC = () => {
  const { getIdToken } = useAuth();
  const { activeUpload, activeTrain, setActiveTrain } = useAnalysis();
  const navigate = useNavigate();

  // Split percentages
  const [trainSplit, setTrainSplit] = useState(0.70);
  const [valSplit, setValSplit] = useState(0.15);
  const [testSplit, setTestSplit] = useState(0.15);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrain = async () => {
    if (!activeUpload) {
      setError("No active dataset. Please upload a dataset first.");
      return;
    }

    const mapping = activeUpload.suggested_mapping;
    if (!mapping.timestamp_col || !mapping.building_col || !mapping.target_col || mapping.feature_cols.length === 0) {
      setError("Please ensure timestamp, building, target, and input features are selected in the upload step.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getIdToken();
      const payload = {
        file_id: activeUpload.file_id,
        dataset_name: activeUpload.filename,
        timestamp_col: mapping.timestamp_col,
        building_col: mapping.building_col,
        target_col: mapping.target_col,
        feature_cols: mapping.feature_cols,
        train_split: trainSplit,
        val_split: valSplit,
        test_split: testSplit
      };

      const result = await api.trainModel(payload, token);
      setActiveTrain(result);
    } catch (err: any) {
      setError(err.message || "Failed to train LightGBM model. Check backend logs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">Energy Consumption Prediction</h1>
          <p className="mt-1 text-sm text-slate-500">
            Train chronologically-isolated LightGBM gradient boosted decision trees.
          </p>
        </div>
        {activeTrain && (
          <button
            onClick={() => navigate('/anomalies')}
            className="flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-navy-800 transition"
          >
            <span>Proceed to Anomaly Detection</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg bg-rose-50 p-4 text-sm text-rose-800 border border-rose-200">
          <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Dataset Check or Prompt */}
      {!activeUpload && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-600 font-medium">No active dataset selected for prediction.</p>
          <button
            onClick={() => navigate('/upload')}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700 transition"
          >
            Go to Dataset Upload
          </button>
        </div>
      )}

      {/* Training Configuration Panel */}
      {activeUpload && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-bold text-navy-900">Chronological Split Configuration</h2>
            </div>
            <span className="text-xs text-slate-500">
              Dataset: <span className="font-semibold text-navy-900">{activeUpload.filename}</span>
            </span>
          </div>

          <p className="text-xs text-slate-500 mb-6">
            Data leakage prevention: The dataset is sorted strictly by time. Training, validation, and testing periods do not overlap.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>Training Split</span>
                <span className="text-blue-600">{(trainSplit * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="0.8"
                step="0.05"
                value={trainSplit}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setTrainSplit(val);
                  setValSplit(parseFloat(((1 - val) / 2).toFixed(2)));
                  setTestSplit(parseFloat(((1 - val) / 2).toFixed(2)));
                }}
                className="mt-2 w-full accent-blue-600"
              />
              <p className="mt-1 text-[11px] text-slate-400">Fits tree parameters and categorical encodings.</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>Validation Split</span>
                <span className="text-amber-600">{(valSplit * 100).toFixed(0)}%</span>
              </div>
              <p className="mt-3 text-xs font-medium text-slate-600">{(valSplit * 100).toFixed(0)}% Chronological Window</p>
              <p className="mt-1 text-[11px] text-slate-400">Early stopping and regime threshold calibration.</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>Held-out Test Split</span>
                <span className="text-emerald-600">{(testSplit * 100).toFixed(0)}%</span>
              </div>
              <p className="mt-3 text-xs font-medium text-slate-600">{(testSplit * 100).toFixed(0)}% Chronological Window</p>
              <p className="mt-1 text-[11px] text-slate-400">Final out-of-sample anomaly benchmarking.</p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleTrain}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-xs font-semibold text-white shadow hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Cpu className="h-4 w-4" />
              <span>{loading ? 'Training LightGBM Pipeline...' : 'Train Model & Generate Predictions'}</span>
            </button>
          </div>
        </div>
      )}

      {loading && <LoadingSpinner message="Training LightGBM regressor and computing validation residuals..." size="lg" />}

      {/* Model Results */}
      {activeTrain && !loading && (
        <div className="space-y-6">
          {/* Performance KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Test MAE"
              value={`${activeTrain.mae.toFixed(2)} kWh`}
              subtitle={`vs Naive Baseline: ${activeTrain.baseline_mae.toFixed(2)} kWh`}
              icon={TrendingUp}
              variant="blue"
            />
            <KPICard
              title="Test RMSE"
              value={`${activeTrain.rmse.toFixed(2)} kWh`}
              subtitle={`vs Naive Baseline: ${activeTrain.baseline_rmse.toFixed(2)} kWh`}
              icon={TrendingUp}
              variant="blue"
            />
            <KPICard
              title="Test Observations"
              value={activeTrain.test_rows.toLocaleString()}
              subtitle={`Train: ${activeTrain.train_rows} | Val: ${activeTrain.val_rows}`}
              icon={BarChart2}
              variant="navy"
            />
            <KPICard
              title="Regimes Identified"
              value={activeTrain.regimes_detected.length}
              subtitle="Operational & Thermal profiles"
              icon={CheckCircle2}
              variant="green"
            />
          </div>

          {/* Actual vs Predicted Interactive Chart */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-navy-900 mb-2">Chronological Prediction Trace: Actual vs Predicted Load</h2>
            <p className="text-xs text-slate-500 mb-6">
              Hourly comparison across test intervals. Divergence indicates unexpected energy consumption anomalies.
            </p>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activeTrain.actual_vs_predicted_preview}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} tickFormatter={(ts) => ts.split(' ')[1] || ts} />
                  <YAxis tick={{ fontSize: 10 }} unit=" kWh" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Line
                    type="monotone"
                    dataKey="actual_energy"
                    name="Actual Energy (kWh)"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted_energy"
                    name="LightGBM Predicted (kWh)"
                    stroke="#2563eb"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Feature Importance Chart */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-navy-900 mb-2">LightGBM Model Feature Importance (Normalized Gain)</h2>
            <p className="text-xs text-slate-500 mb-6">
              Relative contribution of meteorological factors, occupancy profiles, and temporal cyclics.
            </p>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activeTrain.feature_importances} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="feature" type="category" width={140} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Bar dataKey="importance" name="Relative Gain" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Preview Table */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm overflow-hidden">
            <h2 className="text-base font-bold text-navy-900 mb-4">Sample Test Observations & Residuals Preview</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                    <th className="py-2.5 px-4 font-semibold">Building</th>
                    <th className="py-2.5 px-4 font-semibold">Actual (kWh)</th>
                    <th className="py-2.5 px-4 font-semibold">Predicted (kWh)</th>
                    <th className="py-2.5 px-4 font-semibold">Residual</th>
                    <th className="py-2.5 px-4 font-semibold">Regime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {activeTrain.actual_vs_predicted_preview.slice(0, 10).map((row) => (
                    <tr key={row.index} className="hover:bg-slate-50/50">
                      <td className="py-2 px-4 text-slate-700">{row.timestamp}</td>
                      <td className="py-2 px-4 font-sans font-semibold text-navy-900">{row.building_id}</td>
                      <td className="py-2 px-4 text-emerald-700 font-semibold">{row.actual_energy.toFixed(2)}</td>
                      <td className="py-2 px-4 text-blue-700 font-semibold">{row.predicted_energy.toFixed(2)}</td>
                      <td className={`py-2 px-4 font-semibold ${row.residual > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                        {row.residual > 0 ? `+${row.residual.toFixed(2)}` : row.residual.toFixed(2)}
                      </td>
                      <td className="py-2 px-4 text-slate-600 font-sans">{row.regime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
