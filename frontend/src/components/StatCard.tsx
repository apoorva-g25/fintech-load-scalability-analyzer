import React from 'react';

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: string;
  accentColor?: string;
}

export const StatCard: React.FC<Props> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  accentColor = 'border-gray-800'
}) => {
  return (
    <div className={`bg-gray-900/90 rounded-xl p-5 border ${accentColor} shadow-lg backdrop-blur-sm transition-all duration-200 hover:border-cyan-500/30`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 tracking-wider uppercase">{title}</span>
        {icon && <div className="text-cyan-400 p-2 bg-gray-800/80 rounded-lg">{icon}</div>}
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
        {trend && <span className="text-xs font-medium text-emerald-400">{trend}</span>}
      </div>
      {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
    </div>
  );
};
