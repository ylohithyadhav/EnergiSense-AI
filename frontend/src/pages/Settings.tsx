import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { isFirebaseConfigured } from '../services/firebase';
import { Server, Database } from 'lucide-react';

export const Settings: React.FC = () => {
  const { currentUser } = useAuth();
  const [apiStatus, setApiStatus] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const check = async () => {
      setChecking(true);
      try {
        const res = await api.checkHealth();
        setApiStatus(res);
      } catch (e: any) {
        setApiStatus({ status: 'offline', error: e.message });
      } finally {
        setChecking(false);
      }
    };
    check();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl min-w-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-navy-900 dark:text-white">Application Configuration & Environment</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Backend API endpoints, Firebase services, and zero-cost cloud architecture settings.
        </p>
      </div>

      {/* Cloud Environment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Backend API Box */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-bold text-navy-900 dark:text-white">Python ML Backend Service</h2>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-slate-100 dark:border-slate-800 gap-1">
              <span className="text-slate-500 dark:text-slate-400 flex-shrink-0">Base API URL:</span>
              <span className="font-mono text-slate-800 dark:text-slate-200 break-all">{import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && (window.location.hostname.endsWith('web.app') || window.location.hostname.endsWith('firebaseapp.com')) ? 'https://energisense-ai.onrender.com' : 'http://127.0.0.1:8000')}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Health Status:</span>
              <span className={`font-semibold ${apiStatus?.status === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {checking ? 'Checking...' : apiStatus?.status === 'ok' ? 'Online (HTTP 200)' : 'Unreachable'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">ML Engine:</span>
              <span className="text-slate-800 dark:text-slate-200">LightGBM 4.3 + TreeExplainer SHAP</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 dark:text-slate-400">Hosting Tier:</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold">Render Free Web Service (₹0 Budget)</span>
            </div>
          </div>
        </div>

        {/* Firebase Services Box */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <Database className="h-5 w-5 text-amber-500 dark:text-amber-400" />
            <h2 className="text-sm font-bold text-navy-900 dark:text-white">Firebase Cloud Services</h2>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Firebase Configured:</span>
              <span className={`font-semibold ${isFirebaseConfigured ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {isFirebaseConfigured ? 'Configured (Active)' : 'Demo Fallback Mode'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Firebase Auth:</span>
              <span className="text-slate-800 dark:text-slate-200">Email & Password Auth</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Cloud Firestore:</span>
              <span className="text-slate-800 dark:text-slate-200">Analyses & Evaluation Docs</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 dark:text-slate-400">Plan:</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold">Spark Free Plan (₹0 Budget)</span>
            </div>
          </div>
        </div>
      </div>

      {/* User Session Box */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm min-w-0">
        <h2 className="text-sm font-bold text-navy-900 dark:text-white mb-3">Active Authenticated Analyst Profile</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700/60 min-w-0">
            <span className="text-slate-500 dark:text-slate-400 block">User UID:</span>
            <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold break-all">{currentUser?.uid}</span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700/60 min-w-0">
            <span className="text-slate-500 dark:text-slate-400 block">Email:</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold break-all">{currentUser?.email}</span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700/60 min-w-0">
            <span className="text-slate-500 dark:text-slate-400 block">Access Mode:</span>
            <span className="text-blue-700 dark:text-blue-400 font-semibold">{currentUser?.isDemo ? 'Guest Analyst (Local)' : 'Firebase Authenticated'}</span>
          </div>
        </div>
      </div>

      {/* Architecture Citation & Academic Project Info */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm min-w-0">
        <h2 className="text-sm font-bold text-navy-900 dark:text-white mb-2">Project Specification</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <strong>Title:</strong> A Regime-Aware Explainable Machine Learning Framework for Energy Prediction and Anomaly Detection in Smart Buildings.<br />
          <strong>Degree:</strong> B.Tech Computer Science and Engineering Capstone Project.<br />
          <strong>Implementation:</strong> Full-stack FastAPI + React 18 + LightGBM + SHAP with zero-cost cloud deployment.
        </p>
      </div>
    </div>
  );
};
