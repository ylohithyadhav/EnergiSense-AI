import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { AnalysisHistoryItem } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Download, Database, RefreshCw } from 'lucide-react';

export const AnalysisHistory: React.FC = () => {
  const { getIdToken } = useAuth();
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      const records = await api.getAnalysesHistory(token);
      setHistory(records);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve analysis history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleExport = (analysisId: string) => {
    const url = api.getExportUrl(analysisId);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">Analysis & Evaluation History</h1>
          <p className="mt-1 text-sm text-slate-500">
            Persistent records of your trained models, evaluated datasets, and detected anomalies.
          </p>
        </div>
        <button
          onClick={fetchHistory}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition w-full sm:w-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Records</span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          {error}
        </div>
      )}

      {loading && <LoadingSpinner message="Retrieving Cloud Firestore analysis history..." size="md" />}

      {!loading && history.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-12 text-center shadow-sm">
          <Database className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-3 text-base font-semibold text-navy-900">No Past Analyses Found</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            You haven't executed any anomaly detection pipelines yet. Upload a dataset to begin.
          </p>
        </div>
      )}

      {!loading && history.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">Dataset Name</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Records</th>
                  <th className="py-3 px-4">Buildings</th>
                  <th className="py-3 px-4">MAE (kWh)</th>
                  <th className="py-3 px-4">RMSE (kWh)</th>
                  <th className="py-3 px-4">Anomalies</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {history.map((item) => (
                  <tr key={item.analysis_id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-sans font-semibold text-navy-900">{item.dataset_name}</td>
                    <td className="py-3 px-4 text-slate-500">{new Date(item.created_at).toLocaleString()}</td>
                    <td className="py-3 px-4 text-slate-800">{item.record_count.toLocaleString()}</td>
                    <td className="py-3 px-4 text-slate-800">{item.building_count}</td>
                    <td className="py-3 px-4 text-blue-700">{item.mae.toFixed(2)}</td>
                    <td className="py-3 px-4 text-blue-700">{item.rmse.toFixed(2)}</td>
                    <td className="py-3 px-4 text-rose-600 font-bold">{item.anomalies_count}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleExport(item.analysis_id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition"
                      >
                        <Download className="h-3 w-3" />
                        <span>Export CSV</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
