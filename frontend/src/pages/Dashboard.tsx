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
  ResponsiveContainer,
  AreaChart,
  Area
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

  // Chart 8: Hourly consumption average
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

  // Chart 3: Normal vs Anomalous distribution
  const normalVsAnomalyData = useMemo(() => {
    if (!activeAnomaly) return [];
    const anomCount = activeAnomaly.anomalies.filter((a) => a.is_anomaly).length;
    const normCount = activeAnomaly.total_samples - anomCount;
    return [
      { name: 'Normal Intervals', value: normCount, color: '#10b981' },
      { name: 'Anomalous Intervals', value: anomCount, color: '#ef4444' }
    ];
  }, [activeAnomaly]);

  // Chart 4: Anomalies by building
  const buildingAnomalyData = useMemo(() => {
    if (!activeAnomaly) return [];
    return Object.entries(activeAnomaly.anomalies_by_building).map(([building, count]) => ({
      building,
      count
    }));
  }, [activeAnomaly]);

  // Chart 5: Operating Regime breakdown
  const regimeData = useMemo(() => {
    if (!activeAnomaly) return [];
    return Object.entries(activeAnomaly.regime_distribution).map(([name, value]) => ({
      name,
      value
    }));
  }, [activeAnomaly]);

  // Chart 6: Detection method comparison
  const methodComparisonData = useMemo(() => {
    if (!activeAnomaly) return [];
    return activeAnomaly.method_comparison.map((m) => ({
      method: m.method_name.replace(' Threshold', '').replace(' Adaptive', ''),
      count: m.anomalies_detected
    }));
  }, [activeAnomaly]);

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-navy-900">Smart Building Energy Analytics Dashboard</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Regime-Aware machine learning for load forecasting, anomaly triage, and energy efficiency.
          </p>
        </div>
        {!activeUpload && (
          <button
            onClick={() => navigate('/upload')}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700 transition w-full sm:w-auto"
          >
            <Sparkles className="h-4 w-4" />
            <span>Upload or Load Demo Dataset</span>
          </button>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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

      {/* Guided Empty State */}
      {!activeTrain && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Zap className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-bold text-navy-900">No Active Analysis Running</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
            Upload your building energy CSV telemetry or load our pre-configured synthetic demo dataset to view interactive predictions, anomaly distributions, and SHAP explainability charts.
          </p>
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => navigate('/upload')}
              className="flex items-center justify-center gap-2 rounded-lg bg-navy-900 px-5 py-2.5 text-xs font-semibold text-white shadow hover:bg-navy-800 transition w-full sm:w-auto"
            >
              <span>Get Started with Dataset Upload</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Complete Suite of 8 Interactive Charts */}
      {activeTrain && (
        <div className="space-y-6">
          {/* Chart 1: Actual vs Predicted Energy */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
              <div>
                <h2 className="text-base font-bold text-navy-900">1. Actual vs Predicted Energy Consumption</h2>
                <p className="text-xs text-slate-500">
                  Chronological test interval evaluation comparing actual meter readings against LightGBM predictions.
                </p>
              </div>
              <button
                onClick={() => navigate('/predict')}
                className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 self-start sm:self-auto"
              >
                <span>Pipeline Details</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="h-64 sm:h-72 w-full mt-4 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activeTrain.actual_vs_predicted_preview}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} tickFormatter={(ts) => ts.split(' ')[1] || ts} minTickGap={15} />
                  <YAxis tick={{ fontSize: 10 }} unit=" kWh" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="actual_energy" name="Actual Load (kWh)" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="predicted_energy" name="Predicted Load (kWh)" stroke="#2563eb" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Energy Consumption Over Time */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
            <h2 className="text-base font-bold text-navy-900 mb-1">2. Energy Consumption Over Time (Continuous Baseline Load)</h2>
            <p className="text-xs text-slate-500 mb-4">
              Area trace visualizing the total smart building energy trajectory across time.
            </p>
            <div className="h-48 sm:h-56 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activeTrain.actual_vs_predicted_preview}>
                  <defs>
                    <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} tickFormatter={(ts) => ts.split(' ')[1] || ts} minTickGap={15} />
                  <YAxis tick={{ fontSize: 10 }} unit=" kWh" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }} />
                  <Area type="monotone" dataKey="actual_energy" name="Telemetry Load (kWh)" stroke="#0891b2" fillOpacity={1} fill="url(#colorEnergy)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row: Chart 3 (Normal vs Anomalous) & Chart 4 (Anomalies by Building) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Chart 3: Normal vs Anomalous Observations */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm min-w-0">
              <h2 className="text-base font-bold text-navy-900 mb-1">3. Normal vs Anomalous Observations</h2>
              <p className="text-xs text-slate-500 mb-4">
                Proportion of normal operations versus flagged abnormal deviations.
              </p>
              <div className="h-64 w-full flex items-center justify-center min-w-0">
                {normalVsAnomalyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={normalVsAnomalyData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        innerRadius={40}
                        outerRadius={65}
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {normalVsAnomalyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    Run Anomaly Detection to visualize ratio
                  </div>
                )}
              </div>
            </div>

            {/* Chart 4: Anomalies by Building */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                <h2 className="text-base font-bold text-navy-900">4. Anomalies Flagged by Building</h2>
                {activeAnomaly && (
                  <button onClick={() => navigate('/anomalies/details')} className="text-xs text-blue-600 hover:underline self-start sm:self-auto">
                    View Details
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Facility meters exhibiting the highest frequency of abnormal consumption.
              </p>
              <div className="h-64 w-full min-w-0">
                {buildingAnomalyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={buildingAnomalyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="building" tick={{ fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={40} />
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
          </div>

          {/* Charts Row: Chart 5 (Operating Regime) & Chart 6 (Detection Method Comparison) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Chart 5: Operating Regime Distribution */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm min-w-0">
              <h2 className="text-base font-bold text-navy-900 mb-1">5. Operating Regime Distribution</h2>
              <p className="text-xs text-slate-500 mb-4">
                Proportion of data categorized by occupancy schedule and thermal cooling stress.
              </p>
              <div className="h-64 w-full flex items-center justify-center min-w-0">
                {regimeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={regimeData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        outerRadius={65}
                        label={({ name, percent }) => `${name.split('_')[0]} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {regimeData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    Run Anomaly Detection to view operating regimes
                  </div>
                )}
              </div>
            </div>

            {/* Chart 6: Detection Method Comparison */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm min-w-0">
              <h2 className="text-base font-bold text-navy-900 mb-1">6. Detection Method Comparison</h2>
              <p className="text-xs text-slate-500 mb-4">
                Comparative anomaly discoveries across Global, Rolling, Isolation Forest, and Regime-Aware.
              </p>
              <div className="h-64 w-full min-w-0">
                {methodComparisonData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={methodComparisonData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="method" tick={{ fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={45} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }} />
                      <Bar dataKey="count" name="Flagged Instances" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    Run Anomaly Detection to view method comparison
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Charts Row: Chart 7 (Feature Importance) & Chart 8 (Energy Usage by Hour) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Chart 7: Feature Importance */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm min-w-0">
              <h2 className="text-base font-bold text-navy-900 mb-1">7. Feature Importance (LightGBM Gain)</h2>
              <p className="text-xs text-slate-500 mb-4">
                Most influential predictors driving smart building load forecasting.
              </p>
              <div className="h-64 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activeTrain.feature_importances.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="feature" type="category" width={85} tick={{ fontSize: 9 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }} />
                    <Bar dataKey="importance" name="Relative Gain" fill="#2563eb" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 8: Hourly Energy Usage Profile */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm min-w-0">
              <h2 className="text-base font-bold text-navy-900 mb-1">8. Diurnal Energy Usage Profile</h2>
              <p className="text-xs text-slate-500 mb-4">
                Average consumption by time of day across the evaluated intervals.
              </p>
              <div className="h-64 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} minTickGap={10} />
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
