import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function StatCard({
  label,
  value,
  icon,
  color,
  trend,
}) {
  return (
    <div className="relative bg-white dark:bg-slate-900 rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-300 border border-slate-100 dark:border-slate-700">

      {/* Top Section */}
      <div className="flex items-start justify-between mb-4">
        
        {/* Icon */}
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${color}`}>
          {icon ? React.createElement(icon, { size: 18 }) : null}
        </div>

        {/* Trend Badge */}
        {trend && (
          <div
            className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full 
              ${trend.isUp
                ? "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-300"
                : "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300"
              }`}
          >
            {trend.isUp ? (
              <ArrowUpRight size={12} />
            ) : (
              <ArrowDownRight size={12} />
            )}
            {trend.value}
          </div>
        )}
      </div>

      {/* Content */}
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{value}</h3>
      </div>

      {/* View Details */}
      <div className="mt-3">
        <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200 transition-colors">
          View Details ?
        </button>
      </div>

    </div>
  );
}
