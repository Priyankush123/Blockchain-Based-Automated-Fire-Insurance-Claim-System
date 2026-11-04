import React, { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, trend }) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <div className="p-2.5 bg-slate-800/80 rounded-lg text-slate-200">
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold tracking-tight text-white mb-1">
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-slate-400 flex items-center justify-between">
          <span>{subtitle}</span>
          {trend && <span className="text-emerald-400 font-medium">{trend}</span>}
        </div>
      )}
    </div>
  );
};

