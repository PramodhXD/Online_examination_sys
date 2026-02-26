import { useMemo, useState } from "react";
import PerformanceChart from "./PerformanceChart";

export default function PerformanceSection({ data = [] }) {
  const [range, setRange] = useState("monthly");

  const filteredData = useMemo(() => {
    const now = new Date();
    const start = new Date(now);

    if (range === "today") {
      start.setHours(0, 0, 0, 0);
    } else if (range === "weekly") {
      start.setDate(now.getDate() - 7);
    } else if (range === "monthly") {
      start.setMonth(now.getMonth() - 1);
    } else if (range === "yearly") {
      start.setFullYear(now.getFullYear() - 1);
    }

    return data.filter((item) => {
      const ts = item?.timestamp ? new Date(item.timestamp) : null;
      // Backward compatibility: if backend payload has no timestamp yet,
      // keep the point visible instead of hiding the whole chart.
      if (!ts || Number.isNaN(ts.getTime())) return true;
      return ts >= start && ts <= now;
    });
  }, [data, range]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border dark:border-slate-700 p-6 transition">

      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Performance Overview
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Score progression across recent assessments
          </p>
        </div>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"
        >
          <option value="today">Today</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>

      {/* Chart Container */}
      <div className="w-full h-80">
        <PerformanceChart data={filteredData} />
      </div>

    </div>
  );
}
