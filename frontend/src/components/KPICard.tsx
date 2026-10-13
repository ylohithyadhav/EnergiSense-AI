import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number | null | undefined;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'blue' | 'green' | 'amber' | 'red' | 'navy';
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'blue'
}) => {
  const variantStyles = {
    blue: {
      bg: 'bg-blue-50 border-blue-100',
      iconBg: 'bg-blue-600 text-white',
      text: 'text-blue-900',
      accent: 'text-blue-600'
    },
    green: {
      bg: 'bg-emerald-50 border-emerald-100',
      iconBg: 'bg-emerald-600 text-white',
      text: 'text-emerald-900',
      accent: 'text-emerald-600'
    },
    amber: {
      bg: 'bg-amber-50 border-amber-100',
      iconBg: 'bg-amber-500 text-white',
      text: 'text-amber-900',
      accent: 'text-amber-600'
    },
    red: {
      bg: 'bg-rose-50 border-rose-100',
      iconBg: 'bg-rose-600 text-white',
      text: 'text-rose-900',
      accent: 'text-rose-600'
    },
    navy: {
      bg: 'bg-slate-50 border-slate-200',
      iconBg: 'bg-navy-800 text-white',
      text: 'text-navy-900',
      accent: 'text-navy-700'
    }
  };

  const style = variantStyles[variant];

  return (
    <div className={`rounded-xl border p-5 shadow-sm transition-all hover:shadow-md ${style.bg}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
        <div className={`rounded-lg p-2.5 ${style.iconBg} shadow-sm`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3">
        <h3 className={`text-2xl font-bold tracking-tight ${style.text}`}>
          {value !== null && value !== undefined && value !== '' ? value : 'N/A'}
        </h3>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-500 font-medium">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
