import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAnalysis } from '../context/AnalysisContext';
import { api } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  AlertTriangle,
  Sliders,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

export const AnomalyDetection: React.FC = () => {
  const { getIdToken } = useAuth();
  const { activeTrain, activeAnomaly, setActiveAnomaly } = useAnalysis();
  const navigate = useNavigate();

  // Method hyperparameters
  const [globalSigma, setGlobalSigma] = useState(3.0);
  const [rollingWindow] = useState(24);
  const [rollingSigma, setRollingSigma] = useState(2.5);
  const [iforestContam, setIforestContam] = useState(0.03);
  const [regimeSigma, setRegimeSigma] = useState(2.5);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDetect = async () => {
    if (!activeTrain) {
      setError("Please train a model on the Energy Prediction page first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getIdToken();
      const payload = {
        analysis_id: activeTrain.analysis_id,
        global_sigma: globalSigma,
        rolling_window: rollingWindow,
        rolling_sigma: rollingSigma,
        isolation_forest_contamination: iforestContam,
        regime_sigma: regimeSigma
      };

      const result = await api.detectAnomalies(payload, token);
      setActiveAnomaly(result);
    } catch (err: any) {
      setError(err.message || "Failed to execute anomaly detection algorithms.");
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  const regimeChartData = activeAnomaly
    ? Object.entries(activeAnomaly.regime_distribution).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-navy-900">Multi-Method Anomaly Detection</h1>
          <p className="mt-1 text-sm text-slate-500">
            Compare Global, Rolling, Isolation Forest, and Proposed Regime-Aware Adaptive thresholding.
          </p>
        </div>
        {activeAnomaly && (
          <button
            onClick={() => navigate('/anomalies/details')}
            className="flex items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-navy-800 transition w-full sm:w-auto"
          >
            <span>Inspect Anomaly Details</span>
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

      {!activeTrain && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 text-center shadow-sm">
          <p className="text-sm text-slate-600 font-medium">Please train an energy prediction model first.</p>
          <button
            onClick={() => navigate('/predict')}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700 transition w-full sm:w-auto"
          >
            Go to Energy Prediction
          </button>
        </div>
      )}

      {/* Threshold Configuration Controls */}
      {activeTrain && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Sliders className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-bold text-navy-900">Algorithm Parameter Tuning</h2>
          </div>
          <p className="text-xs text-slate-500 mb-6">
            Configure threshold sensitivity factors calibrated on validation residuals (preventing test label leakage).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>Method 1: Global Threshold</span>
                <span className="text-blue-600">{globalSigma}σ</span>
              </div>
              <input
                type="range"
                min="1.5"
                max="4.5"
                step="0.1"
                value={globalSigma}
                onChange={(e) => setGlobalSigma(parseFloat(e.target.value))}
                className="mt-2 w-full accent-blue-600"
              />
              <p className="mt-1 text-[11px] text-slate-400">Fixed threshold based on overall validation residual spread.</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>Method 2: Rolling Window</span>
                <span className="text-amber-600">{rollingWindow}h / {rollingSigma}σ</span>
              </div>
              <input
                type="range"
                min="1.5"
                max="4.0"
                step="0.1"
                value={rollingSigma}
                onChange={(e) => setRollingSigma(parseFloat(e.target.value))}
                className="mt-2 w-full accent-amber-600"
              />
              <p className="mt-1 text-[11px] text-slate-400">Adapts to recent trailing residuals without future leakage.</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>Method 3: Isolation Forest</span>
                <span className="text-purple-600">{(iforestContam * 100).toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.10"
                step="0.005"
                value={iforestContam}
                onChange={(e) => setIforestContam(parseFloat(e.target.value))}
                className="mt-2 w-full accent-purple-600"
              />
              <p className="mt-1 text-[11px] text-slate-400">Unsupervised tree isolation contamination hyperparameter.</p>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
              <div className="flex justify-between text-xs font-semibold text-navy-900">
                <span>Method 4: Proposed Regime</span>
                <span className="text-blue-700 font-bold">{regimeSigma}σ</span>
              </div>
              <input
                type="range"
                min="1.5"
                max="4.0"
                step="0.1"
                value={regimeSigma}
                onChange={(e) => setRegimeSigma(parseFloat(e.target.value))}
                className="mt-2 w-full accent-blue-600"
              />
              <p className="mt-1 text-[11px] text-slate-500 font-medium">Distinct statistical threshold per operating state.</p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleDetect}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-lg bg-navy-900 px-6 py-2.5 text-xs font-semibold text-white shadow hover:bg-navy-800 transition disabled:opacity-50 w-full sm:w-auto"
            >
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span>{loading ? 'Executing Anomaly Detection...' : 'Run All 4 Detection Methods'}</span>
            </button>
          </div>
        </div>
      )}

      {loading && <LoadingSpinner message="Calculating dynamic thresholds and executing Isolation Forest..." size="lg" />}

      {/* Detection Results */}
      {activeAnomaly && !loading && (
        <div className="space-y-6">
          {/* Method Comparison Table */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm overflow-hidden min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
              <h2 className="text-base font-bold text-navy-900">Comparative Method Evaluation Benchmark</h2>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold self-start sm:self-auto ${
                activeAnomaly.ground_truth_available ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
              }`}>
                {activeAnomaly.ground_truth_available ? 'Ground Truth Labeled' : 'Unlabeled (Supervised Metrics N/A)'}
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-6">
              {activeAnomaly.ground_truth_available
                ? 'Supervised metrics computed against ground truth labels on held-out test data. Proposed regime-aware method reduces false positive alarms while maintaining sharp precision.'
                : 'Note: Dataset does not contain ground-truth anomaly labels. Anomaly detection counts and detection rates are displayed, but precision/recall cannot be evaluated without labels.'}
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Method Name</th>
                    <th className="py-3 px-4">Anomalies Detected</th>
                    <th className="py-3 px-4">Detection Rate</th>
                    <th className="py-3 px-4">Precision</th>
                    <th className="py-3 px-4">Recall</th>
                    <th className="py-3 px-4">F1-Score</th>
                    <th className="py-3 px-4">ROC-AUC</th>
                    <th className="py-3 px-4">FP / 1k Normals</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeAnomaly.method_comparison.map((m) => {
                    const isProposed = m.method_name.includes('Proposed');
                    return (
                      <tr key={m.method_name} className={isProposed ? 'bg-blue-50/40 font-semibold' : 'hover:bg-slate-50/50'}>
                        <td className="py-3 px-4 text-navy-900 flex items-center gap-2">
                          {isProposed && <span className="h-2 w-2 rounded-full bg-blue-600" />}
                          {m.method_name}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-800">{m.anomalies_detected}</td>
                        <td className="py-3 px-4 font-mono text-slate-800">{m.detection_rate_pct}%</td>
                        <td className="py-3 px-4 font-mono text-slate-800">
                          {m.precision !== null && m.precision !== undefined ? m.precision.toFixed(3) : 'N/A'}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-800">
                          {m.recall !== null && m.recall !== undefined ? m.recall.toFixed(3) : 'N/A'}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-800">
                          {m.f1_score !== null && m.f1_score !== undefined ? m.f1_score.toFixed(3) : 'N/A'}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-800">
                          {m.roc_auc !== null && m.roc_auc !== undefined ? m.roc_auc.toFixed(3) : 'N/A'}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-800">
                          {m.false_positives_per_1000 !== null && m.false_positives_per_1000 !== undefined
                            ? m.false_positives_per_1000.toFixed(2)
                            : 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Detection Count Bar Chart */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm min-w-0">
              <h2 className="text-base font-bold text-navy-900 mb-2">Anomalies Detected Across Methods</h2>
              <p className="text-xs text-slate-500 mb-6">
                Comparative count of anomalous instances flagged in the held-out test partition.
              </p>
              <div className="h-64 sm:h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activeAnomaly.method_comparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="method_name" tick={{ fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }} />
                    <Bar dataKey="anomalies_detected" name="Detected Anomalies" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Operating Regime Breakdown */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm min-w-0">
              <h2 className="text-base font-bold text-navy-900 mb-2">Operating Regime Distribution</h2>
              <p className="text-xs text-slate-500 mb-6">
                Distribution of building operation states (Occupied Peak, Off-Hours Night, Weekend, Thermal Load).
              </p>
              <div className="h-64 sm:h-72 w-full min-w-0 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={regimeChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      outerRadius={65}
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {regimeChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
