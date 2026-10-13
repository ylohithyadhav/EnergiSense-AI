import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnalysis } from '../context/AnalysisContext';
import { KPICard } from '../components/KPICard';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Building2,
  Database,
  Zap,
  TrendingUp,
  AlertTriangle,
  Percent,
  CheckCircle2,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { activeUpload, activeTrain, activeAnomaly } = useAnalysis();
  const navigate = useNavigate();

  // Compute live KPI summaries
  const kpis = useMemo(() => {
    if (!activeTrain) {
      return {
        buildings: activeUpload ? '1+' : null,
        records: activeUpload ? activeUpload.total_rows : null,
        avgActual: null,
        avgPredicted: null,
        totalAnomalies: null,
        anomalyPct: null,
        mae: null,
        rmse: null
      };
    }

    const preview = activeTrain.actual_vs_predicted_preview;
    const avgAct = preview.length ? preview.reduce((acc, cur) => acc + cur.actual_energy, 0) / preview.length : 0;
    const avgPred = preview.length ? preview.reduce((acc, cur) => acc + cur.predicted_energy, 0) / preview.length : 0;

    let totAnom = null;
    let anomPct = null;
    let buildingCount = 1;

    if (activeAnomaly) {
      const flagged = activeAnomaly.anomalies.filter((a) => a.is_anomaly).length;
      totAnom = flagged;
      anomPct = `${((flagged / activeAnomaly.total_samples) * 100).toFixed(1)}%`;
      buildingCount = Object.keys(activeAnomaly.anomalies_by_building).length || 1;
    }

    return {
      buildings: buildingCount,
      records: activeTrain.test_rows,
      avgActual: `${avgAct.toFixed(1)} kWh`,
      avgPredicted: `${avgPred.toFixed(1)} kWh`,
      totalAnomalies: totAnom,
      anomalyPct: anomPct,
      mae: `${activeTrain.mae.toFixed(2)} kWh`,
      rmse: `${activeTrain.rmse.toFixed(2)} kWh`
    };
  }, [activeUpload, activeTrain, activeAnomaly]);

  // Hourly consumption average chart data
  const hourlyData = useMemo(() => {
    if (!activeTrain) return [];
    const hourlyMap: Record<number, { count: number; total: number }> = {};
    activeTrain.actual_vs_predicted_preview.forEach((row) => {
      const parts = row.timestamp.split(' ');
      const hour = parts[1] ? parseInt(parts[1].split(':')[0], 10) : 0;
      if (!hourlyMap[hour]) hourlyMap[hour] = { count: 0, total: 0 };
      hourlyMap[hour].count += 1;
      hourlyMap[hour].total += row.actual_energy;
    });

    return Object.entries(hourlyMap).map(([hour, val]) => ({
      hour: `${hour}:00`,
      avgEnergy: Number((val.total / val.count).toFixed(2))
    })).sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
  }, [activeTrain]);

  // Anomalies by building data
  const buildingAnomalyData = useMemo(() => {
    if (!activeAnomaly) return [];
    return Object.entries(activeAnomaly.anomalies_by_building).map(([building, count]) => ({
      building,
      count
    }));
  }, [activeAnomaly]);

  // Regime data
  const regimeData = useMemo(() => {
    if (!activeAnomaly) return [];
    return Object.entries(activeAnomaly.regime_distribution).map(([name, value]) => ({
      name,
      value
    }));
  }, [activeAnomaly]);

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">Smart Building Energy Analytics Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Regime-Aware machine learning for load forecasting, anomaly triage, and energy efficiency.
          </p>
        </div>
        {!activeUpload && (
          <button
            onClick={() => navigate('/upload')}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700 transition"
          >
            <Sparkles className="h-4 w-4" />
            <span>Upload or Load Demo Dataset</span>
          </button>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Buildings Analyzed"
          value={kpis.buildings}
          subtitle="Smart meters monitored"
          icon={Building2}
          variant="navy"
        />
        <KPICard
          title="Records Processed"
          value={kpis.records ? kpis.records.toLocaleString() : null}
          subtitle="Hourly load observations"
          icon={Database}
          variant="blue"
        />
        <KPICard
          title="Avg Actual Energy"
          value={kpis.avgActual}
          subtitle="Building telemetry baseline"
          icon={Zap}
          variant="green"
        />
        <KPICard
          title="Avg Predicted Energy"
          value={kpis.avgPredicted}
          subtitle="LightGBM model output"
          icon={TrendingUp}
          variant="blue"
        />
        <KPICard
          title="Total Anomalies"
          value={kpis.totalAnomalies}
          subtitle="Flagged by adaptive regime rules"
          icon={AlertTriangle}
          variant="amber"
        />
        <KPICard
          title="Anomaly Percentage"
          value={kpis.anomalyPct}
          subtitle="Relative prevalence rate"
          icon={Percent}
          variant="red"
        />
        <KPICard
          title="Test MAE"
          value={kpis.mae}
          subtitle="Mean Absolute Error"
          icon={CheckCircle2}
          variant="blue"
        />
        <KPICard
          title="Test RMSE"
          value={kpis.rmse}
          subtitle="Root Mean Squared Error"
          icon={CheckCircle2}
          variant="blue"
        />
      </div>

      {/* When no data is active, show guided empty state */}
      {!activeTrain && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Zap className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-bold text-navy-900">No Active Analysis Running</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
            Upload your building energy CSV telemetry or load our pre-configured synthetic demo dataset to view interactive predictions, anomaly distributions, and SHAP explainability charts.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => navigate('/upload')}
              className="flex items-center gap-2 rounded-lg bg-navy-900 px-5 py-2.5 text-xs font-semibold text-white shadow hover:bg-navy-800 transition"
            >
              <span>Get Started with Dataset Upload</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Active Charts */}
      {activeTrain && (
        <div className="space-y-6">
          {/* Chart 1: Actual vs Predicted Energy Over Time */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-navy-900">1. Actual vs Predicted Energy Consumption Over Time</h2>
                <p className="text-xs text-slate-500">
                  Chronological test interval evaluation comparing actual meter readings against LightGBM predictions.
                </p>
              </div>
              <button
                onClick={() => navigate('/predict')}
                className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
              >
                <span>Pipeline Details</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activeTrain.actual_vs_predicted_preview}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} tickFormatter={(ts) => ts.split(' ')[1] || ts} />
                  <YAxis tick={{ fontSize: 10 }} unit=" kWh" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="actual_energy" name="Actual Load (kWh)" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="predicted_energy" name="Predicted Load (kWh)" stroke="#2563eb" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 4: Anomalies by Building */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-bold text-navy-900">2. Anomalies Flagged by Building</h2>
                {activeAnomaly && (
                  <button onClick={() => navigate('/anomalies/details')} className="text-xs text-blue-600 hover:underline">
                    View Details
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Identifies which physical facility meters exhibit the highest frequency of abnormal consumption.
              </p>
              <div className="h-64 w-full">
                {buildingAnomalyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={buildingAnomalyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="building" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }} />
                      <Bar dataKey="count" name="Anomalous Events" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    Run Anomaly Detection to view building breakdown
                  </div>
                )}
              </div>
            </div>

            {/* Chart 5: Operating Regime Distribution */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-bold text-navy-900 mb-2">3. Operating Regime Distribution</h2>
              <p className="text-xs text-slate-500 mb-4">
                Proportion of data categorized by occupancy schedule and thermal cooling stress.
              </p>
              <div className="h-64 w-full flex items-center justify-center">
                {regimeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={regimeData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name.split('_')[0]} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {regimeData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    Run Anomaly Detection to view operating regimes
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chart Row 3 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 7: Feature Importance */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-bold text-navy-900 mb-2">4. Top Model Features (LightGBM Gain)</h2>
              <p className="text-xs text-slate-500 mb-4">
                Most influential predictors driving smart building load forecasting.
              </p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activeTrain.feature_importances.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="feature" type="category" width={130} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }} />
                    <Bar dataKey="importance" name="Relative Gain" fill="#2563eb" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 8: Hourly Energy Usage Profile */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-bold text-navy-900 mb-2">5. Diurnal Energy Usage Profile</h2>
              <p className="text-xs text-slate-500 mb-4">
                Average consumption by time of day across the evaluated intervals.
              </p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} unit=" kWh" />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }} />
                    <Line type="monotone" dataKey="avgEnergy" name="Average Load (kWh)" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
