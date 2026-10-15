import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnalysis } from '../context/AnalysisContext';
import { api } from '../services/api';
import {
  Search,
  Download,
  Cpu
} from 'lucide-react';

export const AnomalyDetails: React.FC = () => {
  const { activeAnomaly } = useAnalysis();
  const navigate = useNavigate();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [buildingFilter, setBuildingFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Filter logic
  const filteredRecords = useMemo(() => {
    if (!activeAnomaly) return [];

    return activeAnomaly.anomalies.filter((rec) => {
      const matchSearch =
        rec.building_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.timestamp.includes(searchQuery) ||
        rec.regime.toLowerCase().includes(searchQuery.toLowerCase());

      const matchSeverity = severityFilter === 'All' || rec.severity === severityFilter;
      const matchBuilding = buildingFilter === 'All' || rec.building_id === buildingFilter;

      return matchSearch && matchSeverity && matchBuilding;
    });
  }, [activeAnomaly, searchQuery, severityFilter, buildingFilter]);

  // Unique building list
  const buildings = useMemo(() => {
    if (!activeAnomaly) return [];
    return Array.from(new Set(activeAnomaly.anomalies.map((a) => a.building_id)));
  }, [activeAnomaly]);

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage]);

  const handleExport = () => {
    if (!activeAnomaly) return;
    const url = api.getExportUrl(activeAnomaly.analysis_id);
    window.open(url, '_blank');
  };

  const handleExplainWithSHAP = (recordIndex: number) => {
    navigate(`/explainable-ai?record=${recordIndex}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-navy-900">Granular Anomaly Investigation</h1>
          <p className="mt-1 text-sm text-slate-500">
            Per-interval residual analysis, severity scores, and facility triage guidance.
          </p>
        </div>
        {activeAnomaly && (
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-navy-800 transition w-full sm:w-auto"
          >
            <Download className="h-4 w-4" />
            <span>Export Anomaly Report (CSV)</span>
          </button>
        )}
      </div>

      {!activeAnomaly && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 text-center shadow-sm">
          <p className="text-sm text-slate-600 font-medium">No anomaly detection results active.</p>
          <button
            onClick={() => navigate('/anomalies')}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700 transition w-full sm:w-auto"
          >
            Run Anomaly Detection First
          </button>
        </div>
      )}

      {activeAnomaly && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="relative w-full md:w-72">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search timestamp, building, regime..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-xs focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between sm:justify-start gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Severity:</span>
                <select
                  value={severityFilter}
                  onChange={(e) => {
                    setSeverityFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-slate-300 p-1.5 text-xs focus:border-blue-600 focus:outline-none bg-white"
                >
                  <option value="All">All Severities</option>
                  <option value="Critical">Critical</option>
                  <option value="Warning">Warning</option>
                  <option value="Normal">Normal</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Building:</span>
                <select
                  value={buildingFilter}
                  onChange={(e) => {
                    setBuildingFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-slate-300 p-1.5 text-xs focus:border-blue-600 focus:outline-none bg-white"
                >
                  <option value="All">All Buildings</option>
                  {buildings.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <span className="text-xs text-slate-500 font-medium">
                {filteredRecords.length} records matching
              </span>
            </div>
          </div>

          {/* Anomaly Records Table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden min-w-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Building</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Actual (kWh)</th>
                    <th className="py-3 px-4">Predicted</th>
                    <th className="py-3 px-4">Residual</th>
                    <th className="py-3 px-4">Threshold</th>
                    <th className="py-3 px-4">Regime</th>
                    <th className="py-3 px-4">Suggested Action</th>
                    <th className="py-3 px-4 text-center">Explain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {paginatedRecords.map((row) => {
                    const isCrit = row.severity === 'Critical';
                    const isWarn = row.severity === 'Warning';
                    return (
                      <tr key={row.index} className={isCrit ? 'bg-rose-50/30' : isWarn ? 'bg-amber-50/20' : 'hover:bg-slate-50/50'}>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isCrit
                              ? 'bg-rose-100 text-rose-800'
                              : isWarn
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {row.severity}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans font-semibold text-navy-900">{row.building_id}</td>
                        <td className="py-3 px-4 text-slate-600">{row.timestamp}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{row.actual_energy.toFixed(2)}</td>
                        <td className="py-3 px-4 text-blue-700">{row.predicted_energy.toFixed(2)}</td>
                        <td className={`py-3 px-4 font-semibold ${row.residual > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                          {row.residual > 0 ? `+${row.residual.toFixed(2)}` : row.residual.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-slate-500">{row.threshold.toFixed(2)}</td>
                        <td className="py-3 px-4 font-sans text-slate-600">{row.regime}</td>
                        <td className="py-3 px-4 font-sans text-slate-600 max-w-xs truncate" title={row.suggested_action}>
                          {row.suggested_action}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleExplainWithSHAP(row.index)}
                            title="Generate SHAP Explanation for this row"
                            className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-blue-600 hover:text-white transition"
                          >
                            <Cpu className="h-3 w-3" />
                            <span>SHAP</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 px-4 sm:px-6 py-3 bg-slate-50">
              <span className="text-xs text-slate-500">
                Page <span className="font-semibold text-navy-900">{currentPage}</span> of{' '}
                <span className="font-semibold text-navy-900">{totalPages}</span>
              </span>
              <div className="flex gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
