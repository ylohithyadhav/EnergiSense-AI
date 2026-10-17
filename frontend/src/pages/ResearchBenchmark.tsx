import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Award, BookOpen, AlertCircle, CheckCircle2, ShieldCheck, Info, X, ExternalLink } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { KPICard } from '../components/KPICard';

export const ResearchBenchmark: React.FC = () => {
  const { isDark } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const referenceUrl = import.meta.env.VITE_RESEARCH_DATASET_URL;

  const handleResourceClick = () => {
    if (referenceUrl && typeof referenceUrl === 'string' && referenceUrl.trim().startsWith('http')) {
      window.open(referenceUrl.trim(), '_blank', 'noopener,noreferrer');
    } else {
      setShowModal(true);
    }
  };

  // Theme-aware Recharts styling tokens
  const gridStroke = isDark ? '#334155' : '#f1f5f9';
  const axisTickColor = isDark ? '#94a3b8' : '#64748b';
  const tooltipStyle = isDark
    ? { backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', fontSize: '11px' }
    : { backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', borderRadius: '8px', fontSize: '11px' };
  const legendStyle = { fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b' };

  // Reference benchmark numbers exactly as specified in requirements
  const energyPredictionData = [
    { model: 'LightGBM (Proposed Pipeline)', mae: 6.005, rmse: 12.818 },
    { model: 'Persistence Baseline', mae: 7.363, rmse: 16.615 },
  ];

  const anomalyBenchmarkData = [
    {
      method: 'Global Residual',
      precision: 0.293,
      recall: 0.141,
      f1: 0.190,
      prAuc: 0.152,
      rocAuc: 0.697,
      fpPer1k: 10.23,
    },
    {
      method: 'Rolling Residual',
      precision: 0.220,
      recall: 0.075,
      f1: 0.112,
      prAuc: 0.091,
      rocAuc: 0.655,
      fpPer1k: 8.01,
    },
    {
      method: 'Isolation Forest',
      precision: 0.301,
      recall: 0.189,
      f1: 0.232,
      prAuc: 0.193,
      rocAuc: 0.682,
      fpPer1k: 13.22,
    },
    {
      method: 'Proposed Regime-Aware Adaptive',
      precision: 0.372,
      recall: 0.128,
      f1: 0.190,
      prAuc: 0.181,
      rocAuc: 0.722,
      fpPer1k: 6.49,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-navy-900 dark:text-white">Research Benchmark Reference</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            LEAD 1.0 Empirical Reference Performance on 30 Deterministically Selected Smart Buildings.
          </p>
        </div>
        <button
          type="button"
          onClick={handleResourceClick}
          className="flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 px-3 py-1.5 text-xs text-blue-800 dark:text-blue-300 font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/60 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          title="View reference literature dataset details"
        >
          <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span>Reference Literature Dataset</span>
        </button>
      </div>

      {/* Prominent Verification & Attribution Alert */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/40 p-4 shadow-sm flex items-start gap-3">
        <Info className="h-5 w-5 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
          <span className="font-bold">Experimental Reference Notice:</span> The figures presented on this page are previously reported research results from the LEAD 1.0 benchmark literature. They serve as a standardized baseline of reference comparison and are maintained strictly separate from live dataset analyses run on this web platform.
        </div>
      </div>

      {/* Dataset Metadata KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICard
          title="Benchmark Dataset"
          value="LEAD 1.0"
          subtitle="First 30 sorted buildings"
          icon={Award}
          variant="navy"
        />
        <KPICard
          title="Usable Records"
          value="198,030"
          subtitle="70% Train | 15% Val | 15% Test"
          icon={BookOpen}
          variant="blue"
        />
        <KPICard
          title="Test Observations"
          value="29,698"
          subtitle="Chronologically held-out"
          icon={CheckCircle2}
          variant="blue"
        />
        <KPICard
          title="Anomaly Prevalence"
          value="2.92%"
          subtitle="Injected / validated ground truth"
          icon={AlertCircle}
          variant="amber"
        />
      </div>

      {/* Energy Prediction Comparison */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm min-w-0">
        <h2 className="text-base font-bold text-navy-900 dark:text-white mb-2">1. Energy Prediction Accuracy (LEAD 1.0)</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          LightGBM regression achieves a significant error reduction over the standard persistence baseline.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 uppercase border-b border-slate-200 dark:border-slate-800 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Predictive Architecture</th>
                  <th className="py-2.5 px-4 font-mono">MAE</th>
                  <th className="py-2.5 px-4 font-mono">RMSE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                <tr className="bg-blue-50/40 dark:bg-blue-950/30 font-bold">
                  <td className="py-2.5 px-4 font-sans text-navy-900 dark:text-white">LightGBM (Proposed Pipeline)</td>
                  <td className="py-2.5 px-4 text-blue-700 dark:text-blue-400">6.005</td>
                  <td className="py-2.5 px-4 text-blue-700 dark:text-blue-400">12.818</td>
                </tr>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 font-sans text-slate-600 dark:text-slate-300">Persistence Baseline</td>
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">7.363</td>
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">16.615</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="h-48 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={energyPredictionData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="model" tick={{ fontSize: 9, fill: axisTickColor }} interval={0} />
                <YAxis tick={{ fontSize: 10, fill: axisTickColor }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={legendStyle} />
                <Bar dataKey="mae" name="MAE (Lower is Better)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rmse" name="RMSE (Lower is Better)" fill="#64748b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Anomaly Detection Comparison Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm overflow-hidden min-w-0">
        <h2 className="text-base font-bold text-navy-900 dark:text-white mb-2">2. Anomaly Detection Method Comparison (LEAD 1.0 Test Set)</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          Rigorous comparison across all four methods. Accurately note trade-offs: the Proposed Regime-Aware method delivers the highest Precision (0.372) and ROC-AUC (0.722) while minimizing False Positives (6.49 / 1k), whereas Isolation Forest achieves higher Recall (0.189) and F1-score (0.232).
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 uppercase border-b border-slate-200 dark:border-slate-800 font-semibold">
              <tr>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Precision (↑)</th>
                <th className="py-3 px-4">Recall (↑)</th>
                <th className="py-3 px-4">F1-Score (↑)</th>
                <th className="py-3 px-4">PR-AUC (↑)</th>
                <th className="py-3 px-4">ROC-AUC (↑)</th>
                <th className="py-3 px-4">FP / 1k Normals (↓)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {anomalyBenchmarkData.map((row) => {
                const isProposed = row.method.includes('Proposed');
                return (
                  <tr key={row.method} className={isProposed ? 'bg-blue-50/50 dark:bg-blue-950/30 font-bold' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'}>
                    <td className="py-3 px-4 font-sans text-navy-900 dark:text-white flex items-center gap-1.5">
                      {isProposed && <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400" />}
                      {row.method}
                    </td>
                    <td className="py-3 px-4 text-emerald-700 dark:text-emerald-400">{row.precision.toFixed(3)}</td>
                    <td className="py-3 px-4 text-slate-800 dark:text-slate-300">{row.recall.toFixed(3)}</td>
                    <td className="py-3 px-4 text-slate-800 dark:text-slate-300">{row.f1.toFixed(3)}</td>
                    <td className="py-3 px-4 text-slate-800 dark:text-slate-300">{row.prAuc.toFixed(3)}</td>
                    <td className="py-3 px-4 text-blue-700 dark:text-blue-400">{row.rocAuc.toFixed(3)}</td>
                    <td className="py-3 px-4 text-rose-700 dark:text-rose-400">{row.fpPer1k.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Trade-off Analysis Cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 p-4">
            <h3 className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Proposed Regime-Aware Adaptive Strengths
            </h3>
            <ul className="mt-2 space-y-1 text-emerald-800 dark:text-emerald-200 list-disc list-inside">
              <li><strong>Highest Precision (0.372):</strong> When an anomaly is flagged, facility managers have the greatest confidence it is real.</li>
              <li><strong>Lowest False Positive Rate (6.49 / 1k):</strong> Dramatically reduces alarm fatigue by adjusting thresholds to building operating regime.</li>
              <li><strong>Highest ROC-AUC (0.722):</strong> Superior overall diagnostic discrimination ability.</li>
            </ul>
          </div>

          <div className="rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 p-4">
            <h3 className="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              Isolation Forest Strengths
            </h3>
            <ul className="mt-2 space-y-1 text-purple-800 dark:text-purple-200 list-disc list-inside">
              <li><strong>Higher Recall (0.189 vs 0.128):</strong> Captures a wider fraction of subtle atypical multi-dimensional patterns.</li>
              <li><strong>Higher F1-Score (0.232 vs 0.190):</strong> Favorable harmonic mean when maximizing raw discovery count is prioritized over false-alarm reduction.</li>
              <li>Trade-off: Suffers more than 2x higher false positive alarms (13.22 vs 6.49 per 1,000 normal intervals).</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Reference Literature Dataset Information Modal */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-navy-900 dark:text-white">Reference Literature Dataset</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">LEAD 1.0 Smart Building Energy Benchmark</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/30 p-3.5 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                Direct external dataset repository link is not configured in this deployment environment.
              </p>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
              <p>
                The standardized benchmark performance figures presented on this page are established empirical metrics from published literature on the <strong>LEAD 1.0 (Large-scale Energy Anomaly Detection)</strong> benchmark dataset.
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-500 dark:text-slate-400 pl-1">
                <li><strong>Scope:</strong> First 30 deterministically sorted commercial and institutional buildings.</li>
                <li><strong>Volume:</strong> 198,030 hourly observations (29,698 chronologically held-out test records).</li>
                <li><strong>Ground Truth:</strong> 2.92% verified anomaly prevalence under historical operational regimes.</li>
                <li><strong>Purpose:</strong> Serves strictly as a standardized baseline of reference comparison and is maintained independently from user-uploaded data.</li>
              </ul>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] pt-1">
                To run live predictions, anomaly detection, and SHAP explainability on concrete building telemetry, load the pre-calibrated sample dataset from the <em>Dataset Ingestion</em> page.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg bg-navy-900 dark:bg-blue-600 hover:bg-navy-800 dark:hover:bg-blue-700 px-5 py-2 text-xs font-semibold text-white shadow transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
