import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAnalysis } from '../context/AnalysisContext';
import { useTheme } from '../context/ThemeContext';
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
  Cell,
  ReferenceLine
} from 'recharts';
import {
  AlertCircle,
  Sparkles,
  Info
} from 'lucide-react';
import { SHAPContribution } from '../types';

export const formatFeatureLabel = (name: string): string => {
  if (!name) return '';
  if (name.startsWith('bldg_Building_')) {
    return name.replace('bldg_Building_', '').replace(/_/g, ' ');
  }
  if (name.startsWith('bldg_')) {
    return name.replace('bldg_', '').replace(/_/g, ' ');
  }
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

interface TooltipPayloadItem {
  payload: SHAPContribution;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

const CustomIndividualTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isPos = data.shap_value >= 0;
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/95 p-3 text-xs text-white shadow-xl backdrop-blur-sm max-w-xs">
        <p className="font-semibold text-slate-200">{formatFeatureLabel(data.feature)}</p>
        <p className="font-mono text-[10px] text-slate-400 mb-2">key: {data.feature}</p>
        <div className="space-y-1.5">
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Observed Value:</span>
            <span className="font-mono font-medium text-slate-200">
              {String(data.feature_value)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">SHAP Impact (Δ):</span>
            <span className={`font-mono font-bold ${isPos ? 'text-rose-400' : 'text-emerald-400'}`}>
              {isPos ? '+' : ''}{data.shap_value} kWh
            </span>
          </div>
          <p className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-300 leading-normal">
            {isPos
              ? `Increases prediction by ${Math.abs(data.shap_value)} kWh above base load.`
              : `Decreases prediction by ${Math.abs(data.shap_value)} kWh below base load.`}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

interface GlobalPayloadItem {
  payload: {
    feature: string;
    importance: number;
    percentage: number;
    formattedFeature: string;
  };
}

const CustomGlobalTooltip: React.FC<{ active?: boolean; payload?: GlobalPayloadItem[] }> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/95 p-3 text-xs text-white shadow-xl backdrop-blur-sm max-w-xs">
        <p className="font-semibold text-slate-200">{data.formattedFeature}</p>
        <p className="font-mono text-[10px] text-slate-400 mb-2">key: {data.feature}</p>
        <div className="space-y-1.5">
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Relative SHAP Impact:</span>
            <span className="font-mono font-bold text-cyan-400">
              {data.percentage}%
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Normalized Proportion:</span>
            <span className="font-mono text-slate-300">
              {data.importance}
            </span>
          </div>
          <p className="pt-1 border-t border-slate-800 text-[10px] text-slate-400">
            Share of overall mean absolute SHAP impact across the evaluation set.
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export const ExplainableAI: React.FC = () => {
  const [searchParams] = useSearchParams();
  const recordParam = searchParams.get('record');
  const initialIndex = recordParam ? parseInt(recordParam, 10) : 0;

  const { getIdToken } = useAuth();
  const { activeTrain, activeSHAP, setActiveSHAP } = useAnalysis();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  // Theme-aware Recharts styling tokens
  const gridStroke = isDark ? '#334155' : '#f1f5f9';
  const axisTickColor = isDark ? '#94a3b8' : '#64748b';
  const referenceLineColor = isDark ? '#64748b' : '#94a3b8';

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

  // Individual explanation domain & data
  const individualContribs = activeSHAP?.individual_explanation?.contributions || [];
  const shapVals = individualContribs.map(c => Number(c.shap_value) || 0);
  const minShap = shapVals.length > 0 ? Math.min(...shapVals, 0) : -5;
  const maxShap = shapVals.length > 0 ? Math.max(...shapVals, 0) : 5;
  const padNeg = Math.min(minShap * 1.15, -1);
  const padPos = Math.max(maxShap * 1.15, 1);
  const individualXDomain: [number, number] = [
    Math.floor(padNeg),
    Math.ceil(padPos)
  ];

  // Global importance percentage data sorted descending
  const globalData = (activeSHAP?.global_importance || [])
    .map(item => ({
      ...item,
      percentage: Number(((Number(item.importance) || 0) * 100).toFixed(1)),
      formattedFeature: formatFeatureLabel(item.feature)
    }))
    .sort((a, b) => b.percentage - a.percentage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-navy-900 dark:text-white">Explainable AI (SHAP TreeExplainer)</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Shapley Additive Explanations attributing LightGBM predictions to physical & meteorological drivers.
          </p>
        </div>
        {activeTrain && (
          <button
            onClick={() => fetchSHAP(recordIndex)}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg bg-navy-900 dark:bg-blue-600 hover:bg-navy-800 dark:hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow transition disabled:opacity-50 w-full sm:w-auto"
          >
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span>Recalculate SHAP Explanations</span>
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 p-4 text-sm text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-900/50">
          <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Scientific Disclaimer Alert */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/40 p-4 shadow-sm flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
          <span className="font-bold">Interpretability Boundary Notice:</span> SHAP mathematically quantifies the exact contribution of each feature to the LightGBM predictive model's output via cooperative game theory. It explains the model's computational reasoning and does not independently establish the physical on-site mechanical cause of an anomaly without technician inspection.
        </div>
      </div>

      {!activeTrain && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 text-center shadow-sm">
          <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">Please train an energy prediction model first.</p>
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
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                <div>
                  <h2 className="text-base font-bold text-navy-900 dark:text-white">
                    Local Instance Explanation: {activeSHAP.individual_explanation.building_id}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    Timestamp: {activeSHAP.individual_explanation.timestamp} (Sample Index: {activeSHAP.individual_explanation.index})
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Sample Row Index:</label>
                  <input
                    type="number"
                    min="0"
                    max={activeTrain ? activeTrain.test_rows - 1 : 100}
                    value={recordIndex}
                    onChange={(e) => setRecordIndex(parseInt(e.target.value) || 0)}
                    className="w-20 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 text-xs font-mono text-center text-slate-800 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
                  />
                  <button
                    onClick={() => fetchSHAP(recordIndex)}
                    className="rounded bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Load
                  </button>
                </div>
              </div>

              {/* Natural Language Interpretation Banner */}
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3.5 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 mb-6 font-sans leading-relaxed">
                <span className="font-bold text-navy-900 dark:text-white">Model Narrative: </span>
                {activeSHAP.individual_explanation.text_summary}
              </div>

              {/* Local Waterfall / Bar Chart */}
              <div className="mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Individual Feature Contribution Push (Top 10 Factors by Absolute Impact)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Diverging SHAP breakdown (Δ kWh relative to Base Expected Value: <span className="font-semibold text-slate-700 dark:text-slate-200">{activeSHAP.base_value} kWh</span>). Model prediction: <span className="font-semibold text-slate-700 dark:text-slate-200">{activeSHAP.individual_explanation.predicted_energy} kWh</span> (Actual: {activeSHAP.individual_explanation.actual_energy} kWh).
                </p>
              </div>

              <div className="h-80 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={individualContribs}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                    <XAxis
                      type="number"
                      domain={individualXDomain}
                      tick={{ fontSize: 10, fill: axisTickColor }}
                      unit=" kWh"
                    />
                    <YAxis
                      dataKey="feature"
                      type="category"
                      width={140}
                      tick={{ fontSize: 10, fill: axisTickColor }}
                      tickFormatter={formatFeatureLabel}
                    />
                    <ReferenceLine
                      x={0}
                      stroke={referenceLineColor}
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                    />
                    <Tooltip content={<CustomIndividualTooltip />} />
                    <Bar dataKey="shap_value" barSize={16} minPointSize={3}>
                      {individualContribs.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.shap_value >= 0 ? '#ef4444' : '#10b981'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-rose-500" />
                  <span>Positive Push (+ kWh increases model prediction above base)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-emerald-500" />
                  <span>Negative Push (- kWh decreases model prediction below base)</span>
                </div>
              </div>
              <p className="mt-2 text-center text-[10px] text-slate-400 dark:text-slate-500">
                Note: Displays top 10 dominant factors by absolute magnitude. Zero reference line denotes base expected energy.
              </p>
            </div>
          )}

          {/* Global SHAP Feature Importance */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm min-w-0">
            <h2 className="text-base font-bold text-navy-900 dark:text-white mb-1">
              Global Feature Importance (Relative SHAP Impact %)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Relative proportion of total mean absolute SHAP impact across the evaluation dataset. Quantifies which external drivers most significantly steer predictions.
            </p>

            <div className="h-80 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={globalData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis
                    type="number"
                    unit="%"
                    tick={{ fontSize: 10, fill: axisTickColor }}
                    domain={[0, 'dataMax + 5']}
                  />
                  <YAxis
                    dataKey="feature"
                    type="category"
                    width={140}
                    tick={{ fontSize: 10, fill: axisTickColor }}
                    tickFormatter={formatFeatureLabel}
                  />
                  <Tooltip content={<CustomGlobalTooltip />} />
                  <Bar
                    dataKey="percentage"
                    name="Relative Impact"
                    fill="#06b6d4"
                    radius={[0, 4, 4, 0]}
                    barSize={16}
                    minPointSize={3}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-center text-[10px] text-slate-400 dark:text-slate-500">
              Bars denote relative contribution share (% of total Mean |SHAP| impact). Features sorted by descending influence.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
