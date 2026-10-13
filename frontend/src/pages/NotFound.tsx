import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center p-6">
      <div className="rounded-full bg-rose-50 p-4 text-rose-600 mb-4">
        <AlertCircle className="h-10 w-10" />
      </div>
      <h1 className="text-3xl font-extrabold text-navy-900">404 - Page Not Found</h1>
      <p className="mt-2 text-sm text-slate-500 max-w-sm">
        The requested EnergiSense AI page could not be located. Check the URL or return to the dashboard.
      </p>
      <Link
        to="/dashboard"
        className="mt-6 flex items-center gap-2 rounded-lg bg-navy-900 px-5 py-2.5 text-xs font-semibold text-white shadow hover:bg-navy-800 transition"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  );
};
