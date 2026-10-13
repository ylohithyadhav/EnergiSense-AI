import React from 'react';
import { NavLink } from 'react-router-dom';
import {
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

export const Sidebar: React.FC = () => {
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

  return (
    <aside className="w-64 flex-shrink-0 bg-navy-900 text-slate-300 flex flex-col justify-between min-h-[calc(100vh-4rem)] border-r border-navy-800">
      <div className="p-4 space-y-6">
        <div>
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Analytics & Operations
          </p>
          <nav className="mt-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
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

        <div className="rounded-xl bg-navy-800/80 p-3.5 border border-navy-700/50">
          <div className="flex items-center gap-2 text-cyan-400">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-xs font-semibold">Regime-Aware ML</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
            LightGBM baseline with adaptive thermal & occupancy residual thresholding.
          </p>
        </div>
      </div>

      <div className="p-4 border-t border-navy-800 text-[11px] text-slate-400">
        <p className="font-medium text-slate-300">B.Tech CSE Capstone</p>
        <p className="text-[10px] text-slate-400">Zero-Cost Cloud Deployment</p>
      </div>
    </aside>
  );
};
