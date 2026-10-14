import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  LogOut,
  RefreshCw,
  Menu,
  X,
  LayoutDashboard,
  UploadCloud,
  TrendingUp,
  AlertTriangle,
  SearchCheck,
  Cpu,
  Award,
  History,
  Settings,
  ShieldCheck
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [backendStatus, setBackendStatus] = useState<'checking' | 'live' | 'cold-start' | 'offline'>('checking');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/upload', label: 'Dataset Upload', icon: UploadCloud },
    { to: '/predict', label: 'Energy Prediction', icon: TrendingUp },
    { to: '/anomalies', label: 'Anomaly Detection', icon: AlertTriangle },
    { to: '/anomalies/details', label: 'Anomaly Details', icon: SearchCheck },
    { to: '/explainable-ai', label: 'Explainable AI (SHAP)', icon: Cpu },
    { to: '/benchmark', label: 'Research Benchmark', icon: Award },
    { to: '/history', label: 'Analysis History', icon: History },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

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

  // Automatically retry health check if waiting on Render free-tier cold-start
  useEffect(() => {
    if (backendStatus === 'cold-start') {
      const timer = setTimeout(() => {
        checkStatus();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [backendStatus]);

  // Close mobile drawer on desktop resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-3 sm:px-6 backdrop-blur">
        {/* Left: Hamburger & Brand */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Hamburger Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            className="md:hidden flex items-center justify-center h-10 w-10 rounded-lg text-slate-700 hover:text-navy-900 hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Brand Logo & Title */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-navy-900 shadow-sm flex-shrink-0">
              <img src="/logo.svg" alt="EnergiSense AI" className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-base sm:text-lg font-bold tracking-tight text-navy-900 truncate">
                  EnergiSense AI
                </span>
                <span className="hidden sm:inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                  ML 2.0
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 hidden sm:block">
                Predict Smart. Detect Early. Save Energy.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Backend Status & Profile */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Backend Status Pill */}
          <div className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 sm:px-3 py-1 text-xs">
            <button 
              onClick={checkStatus} 
              title="Refresh backend status"
              className="hover:rotate-180 transition-transform duration-300 p-0.5"
            >
              <RefreshCw className="h-3 w-3 text-slate-400 hover:text-slate-600" />
            </button>
            {backendStatus === 'checking' && (
              <span className="flex items-center gap-1.5 text-slate-500 text-[11px] sm:text-xs">
                <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" />
                <span className="hidden sm:inline">Checking API...</span>
                <span className="sm:hidden">Checking</span>
              </span>
            )}
            {backendStatus === 'live' && (
              <span className="flex items-center gap-1.5 text-emerald-700 font-medium text-[11px] sm:text-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="hidden sm:inline">API Online</span>
                <span className="sm:hidden">Online</span>
              </span>
            )}
            {backendStatus === 'cold-start' && (
              <span className="flex items-center gap-1.5 text-amber-700 font-medium text-[11px] sm:text-xs" title="Free tier Render container is waking up">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                <span className="hidden sm:inline">Render Cold Start</span>
                <span className="sm:hidden">Waking</span>
              </span>
            )}
            {backendStatus === 'offline' && (
              <span className="flex items-center gap-1.5 text-rose-700 font-medium text-[11px] sm:text-xs" title="Backend unreachable">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="hidden sm:inline">API Offline</span>
                <span className="sm:hidden">Offline</span>
              </span>
            )}
          </div>

          {/* User Profile & Logout */}
          {currentUser && (
            <div className="flex items-center gap-2 sm:gap-3 border-l border-slate-200 pl-2 sm:pl-4">
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

      {/* Mobile Navigation Drawer & Backdrop */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          {/* Backdrop */}
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
          />

          {/* Slide-over Drawer */}
          <div className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-navy-900 text-slate-300 flex flex-col justify-between shadow-2xl overflow-y-auto">
            <div className="p-4 space-y-5">
              {/* Drawer Top Header */}
              <div className="flex items-center justify-between pb-3 border-b border-navy-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-800 border border-navy-700">
                    <img src="/logo.svg" alt="EnergiSense AI" className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-base font-bold text-white tracking-tight">EnergiSense AI</span>
                    <p className="text-[10px] text-cyan-400 font-medium">Smart Building ML 2.0</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label="Close navigation menu"
                  className="flex items-center justify-center h-9 w-9 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <div>
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Analytics & Operations
                </p>
                <nav className="mt-2 space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                              : 'text-slate-300 hover:bg-navy-800 hover:text-white'
                          }`
                        }
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </nav>
              </div>

              {/* Regime-Aware ML Badge */}
              <div className="rounded-xl bg-navy-800/80 p-3 border border-navy-700/50">
                <div className="flex items-center gap-2 text-cyan-400">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="text-xs font-semibold">Regime-Aware ML</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                  LightGBM baseline with adaptive thermal & occupancy residual thresholding.
                </p>
              </div>
            </div>

            {/* Drawer User Footer */}
            <div className="p-4 border-t border-navy-800 bg-navy-950/60">
              {currentUser && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-800 text-xs font-semibold text-white border border-navy-700 flex-shrink-0">
                      {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{currentUser.displayName}</p>
                      <p className="text-[10px] text-slate-400 truncate">{currentUser.isDemo ? 'Guest Demo Analyst' : currentUser.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      logout();
                    }}
                    title="Sign Out"
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-navy-800 transition"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
