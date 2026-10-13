import React from 'react';
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
import { Award, BookOpen, AlertCircle, CheckCircle2, ShieldCheck, Info } from 'lucide-react';
import { KPICard } from '../components/KPICard';

export const ResearchBenchmark: React.FC = () => {
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
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">Research Benchmark Reference</h1>
          <p className="mt-1 text-sm text-slate-500">
            LEAD 1.0 Empirical Reference Performance on 30 Deterministically Selected Smart Buildings.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs text-blue-800 font-semibold">
          <BookOpen className="h-4 w-4 text-blue-600" />
          <span>Reference Literature Dataset</span>
        </div>
      </div>

      {/* Prominent Verification & Attribution Alert */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm flex items-start gap-3">
        <Info className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <span className="font-bold">Experimental Reference Notice:</span> The figures presented on this page are previously reported research results from the LEAD 1.0 benchmark literature. They serve as a standardized baseline of reference comparison and are maintained strictly separate from live dataset analyses run on this web platform.
        </div>
      </div>

      {/* Dataset Metadata KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-navy-900 mb-2">1. Energy Prediction Accuracy (LEAD 1.0)</h2>
        <p className="text-xs text-slate-500 mb-4">
          LightGBM regression achieves a significant error reduction over the standard persistence baseline.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Predictive Architecture</th>
                  <th className="py-2.5 px-4 font-mono">MAE</th>
                  <th className="py-2.5 px-4 font-mono">RMSE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                <tr className="bg-blue-50/40 font-bold">
                  <td className="py-2.5 px-4 font-sans text-navy-900">LightGBM (Proposed Pipeline)</td>
                  <td className="py-2.5 px-4 text-blue-700">6.005</td>
                  <td className="py-2.5 px-4 text-blue-700">12.818</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-sans text-slate-600">Persistence Baseline</td>
                  <td className="py-2.5 px-4 text-slate-600">7.363</td>
                  <td className="py-2.5 px-4 text-slate-600">16.615</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={energyPredictionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="model" tick={{ fontSize: 9 }} interval={0} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="mae" name="MAE (Lower is Better)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rmse" name="RMSE (Lower is Better)" fill="#64748b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Anomaly Detection Comparison Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm overflow-hidden">
        <h2 className="text-base font-bold text-navy-900 mb-2">2. Anomaly Detection Method Comparison (LEAD 1.0 Test Set)</h2>
        <p className="text-xs text-slate-500 mb-6">
          Rigorous comparison across all four methods. Accurately note trade-offs: the Proposed Regime-Aware method delivers the highest Precision (0.372) and ROC-AUC (0.722) while minimizing False Positives (6.49 / 1k), whereas Isolation Forest achieves higher Recall (0.189) and F1-score (0.232).
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200 font-semibold">
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
            <tbody className="divide-y divide-slate-100 font-mono">
              {anomalyBenchmarkData.map((row) => {
                const isProposed = row.method.includes('Proposed');
                return (
                  <tr key={row.method} className={isProposed ? 'bg-blue-50/50 font-bold' : 'hover:bg-slate-50/50'}>
                    <td className="py-3 px-4 font-sans text-navy-900 flex items-center gap-1.5">
                      {isProposed && <span className="h-2 w-2 rounded-full bg-blue-600" />}
                      {row.method}
                    </td>
                    <td className="py-3 px-4 text-emerald-700">{row.precision.toFixed(3)}</td>
                    <td className="py-3 px-4 text-slate-800">{row.recall.toFixed(3)}</td>
                    <td className="py-3 px-4 text-slate-800">{row.f1.toFixed(3)}</td>
                    <td className="py-3 px-4 text-slate-800">{row.prAuc.toFixed(3)}</td>
                    <td className="py-3 px-4 text-blue-700">{row.rocAuc.toFixed(3)}</td>
                    <td className="py-3 px-4 text-rose-700">{row.fpPer1k.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Trade-off Analysis Cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
            <h3 className="font-bold text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Proposed Regime-Aware Adaptive Strengths
            </h3>
            <ul className="mt-2 space-y-1 text-emerald-800 list-disc list-inside">
              <li><strong>Highest Precision (0.372):</strong> When an anomaly is flagged, facility managers have the greatest confidence it is real.</li>
              <li><strong>Lowest False Positive Rate (6.49 / 1k):</strong> Dramatically reduces alarm fatigue by adjusting thresholds to building operating regime.</li>
              <li><strong>Highest ROC-AUC (0.722):</strong> Superior overall diagnostic discrimination ability.</li>
            </ul>
          </div>

          <div className="rounded-lg bg-purple-50 border border-purple-200 p-4">
            <h3 className="font-bold text-purple-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-purple-600" />
              Isolation Forest Strengths
            </h3>
            <ul className="mt-2 space-y-1 text-purple-800 list-disc list-inside">
              <li><strong>Higher Recall (0.189 vs 0.128):</strong> Captures a wider fraction of subtle atypical multi-dimensional patterns.</li>
              <li><strong>Higher F1-Score (0.232 vs 0.190):</strong> Favorable harmonic mean when maximizing raw discovery count is prioritized over false-alarm reduction.</li>
              <li>Trade-off: Suffers more than 2x higher false positive alarms (13.22 vs 6.49 per 1,000 normal intervals).</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
