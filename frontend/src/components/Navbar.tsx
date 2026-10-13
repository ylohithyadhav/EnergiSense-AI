import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { LogOut, RefreshCw } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [backendStatus, setBackendStatus] = useState<'checking' | 'live' | 'cold-start' | 'offline'>('checking');

  const checkStatus = async () => {
    setBackendStatus('checking');
    try {
      await api.checkHealth();
      setBackendStatus('live');
    } catch (err: any) {
      if (err.message && err.message.includes('cold start')) {
        setBackendStatus('cold-start');
      } else {
        setBackendStatus('offline');
      }
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur">
      {/* Brand Logo & Title */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900 shadow-sm">
          <img src="/logo.svg" alt="EnergiSense AI" className="h-7 w-7" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-navy-900">EnergiSense AI</span>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
              ML 2.0
            </span>
          </div>
          <p className="text-[11px] font-medium text-slate-500 hidden sm:block">
            Predict Smart. Detect Early. Save Energy.
          </p>
        </div>
      </div>

      {/* Backend Status & Profile */}
      <div className="flex items-center gap-4">
        {/* Backend Status Pill */}
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs">
          <button 
            onClick={checkStatus} 
            title="Refresh backend status"
            className="hover:rotate-180 transition-transform duration-300"
          >
            <RefreshCw className="h-3 w-3 text-slate-400 hover:text-slate-600" />
          </button>
          {backendStatus === 'checking' && (
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" />
              Checking API...
            </span>
          )}
          {backendStatus === 'live' && (
            <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              API Online
            </span>
          )}
          {backendStatus === 'cold-start' && (
            <span className="flex items-center gap-1.5 text-amber-700 font-medium" title="Free tier Render container is waking up">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
              Render Cold Start
            </span>
          )}
          {backendStatus === 'offline' && (
            <span className="flex items-center gap-1.5 text-rose-700 font-medium" title="Backend unreachable">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              API Offline
            </span>
          )}
        </div>

        {/* User Profile & Logout */}
        {currentUser && (
          <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-800 text-xs font-semibold text-white">
                {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-slate-800 leading-none">
                  {currentUser.displayName}
                </p>
                <p className="text-[10px] text-slate-500 leading-tight">
                  {currentUser.isDemo ? 'Demonstration Mode' : currentUser.email}
                </p>
              </div>
            </div>

            <button
              onClick={() => logout()}
              title="Sign Out"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-rose-600 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
