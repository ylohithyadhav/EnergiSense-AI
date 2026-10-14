import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  Cell
} from 'recharts';
import {
  AlertCircle,
  Sparkles,
  Info
} from 'lucide-react';

export const ExplainableAI: React.FC = () => {
  const [searchParams] = useSearchParams();
  const recordParam = searchParams.get('record');
  const initialIndex = recordParam ? parseInt(recordParam, 10) : 0;

  const { getIdToken } = useAuth();
  const { activeTrain, activeSHAP, setActiveSHAP } = useAnalysis();
  const navigate = useNavigate();

  const [recordIndex, setRecordIndex] = useState(initialIndex);
  const sampleSize = 80;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSHAP = async (targetIndex = recordIndex) => {
    if (!activeTrain) return;

    setLoading(true);
    setError(null);

    try {
      const token = await getIdToken();
      const payload = {
        analysis_id: activeTrain.analysis_id,
        sample_size: sampleSize,
        record_index: targetIndex
      };

      const result = await api.explainPredictions(payload, token);
      setActiveSHAP(result);
    } catch (err: any) {
      setError(err.message || 'Failed to compute SHAP explanations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTrain && !activeSHAP) {
      fetchSHAP(recordIndex);
    }
  }, [activeTrain]);

  // Handle URL param changes
  useEffect(() => {
    if (recordParam) {
      const idx = parseInt(recordParam, 10);
      setRecordIndex(idx);
      if (activeTrain) {
        fetchSHAP(idx);
      }
    }
  }, [recordParam]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">Explainable AI (SHAP TreeExplainer)</h1>
          <p className="mt-1 text-sm text-slate-500">
            Shapley Additive Explanations attributing LightGBM predictions to physical & meteorological drivers.
          </p>
        </div>
        {activeTrain && (
          <button
            onClick={() => fetchSHAP(recordIndex)}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-navy-800 transition disabled:opacity-50 w-full sm:w-auto"
          >
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span>Recalculate SHAP Explanations</span>
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg bg-rose-50 p-4 text-sm text-rose-800 border border-rose-200">
          <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Scientific Disclaimer Alert */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 shadow-sm flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <span className="font-bold">Interpretability Boundary Notice:</span> SHAP mathematically quantifies the exact contribution of each feature to the LightGBM predictive model's output via cooperative game theory. It explains the model's computational reasoning and does not independently establish the physical on-site mechanical cause of an anomaly without technician inspection.
        </div>
      </div>

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

      {loading && <LoadingSpinner message="Evaluating Shapley values with TreeExplainer..." size="lg" />}

      {activeSHAP && !loading && (
        <div className="space-y-6">
          {/* Individual Instance Explanation Box */}
          {activeSHAP.individual_explanation && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                <div>
                  <h2 className="text-base font-bold text-navy-900">
                    Local Instance Explanation: {activeSHAP.individual_explanation.building_id}
                  </h2>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Timestamp: {activeSHAP.individual_explanation.timestamp} (Sample Index: {activeSHAP.individual_explanation.index})
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600">Sample Row Index:</label>
                  <input
                    type="number"
                    min="0"
                    max={activeTrain ? activeTrain.test_rows - 1 : 100}
                    value={recordIndex}
                    onChange={(e) => setRecordIndex(parseInt(e.target.value) || 0)}
                    className="w-20 rounded border border-slate-300 p-1 text-xs font-mono text-center focus:border-blue-600 focus:outline-none"
                  />
                  <button
                    onClick={() => fetchSHAP(recordIndex)}
                    className="rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    Load
                  </button>
                </div>
              </div>

              {/* Natural Language Interpretation Banner */}
              <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-200 text-xs text-slate-700 mb-6 font-sans leading-relaxed">
                <span className="font-bold text-navy-900">Model Narrative: </span>
                {activeSHAP.individual_explanation.text_summary}
              </div>

              {/* Local Waterfall / Bar Chart */}
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Feature Contribution Push (Δ kWh relative to Base Expected Value {activeSHAP.base_value} kWh)
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activeSHAP.individual_explanation.contributions} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 10 }} unit=" kWh" />
                    <YAxis dataKey="feature" type="category" width={110} tick={{ fontSize: 9 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }}
                      formatter={(val: any) => [`${val > 0 ? '+' : ''}${val} kWh`, 'SHAP Impact']}
                    />
                    <Bar dataKey="shap_value" radius={[2, 2, 2, 2]}>
                      {activeSHAP.individual_explanation.contributions.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.shap_value >= 0 ? '#ef4444' : '#10b981'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-slate-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-rose-500" />
                  <span>Positive Push (Increases Energy Prediction)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-emerald-500" />
                  <span>Negative Push (Decreases Energy Prediction)</span>
                </div>
              </div>
            </div>
          )}

          {/* Global SHAP Feature Importance */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
            <h2 className="text-base font-bold text-navy-900 mb-2">Global Feature Importance (Mean |SHAP Value|)</h2>
            <p className="text-xs text-slate-500 mb-6">
              Average magnitude of impact across evaluation dataset. Demonstrates which external drivers most significantly steer predictions.
            </p>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activeSHAP.global_importance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="feature" type="category" width={110} tick={{ fontSize: 9 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Bar dataKey="importance" name="Mean |SHAP|" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
