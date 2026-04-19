import { TrendingDown, TrendingUp } from "lucide-react";

function normalizeChange(value) {
  const numeric = Number(value || 0);
  if (Number.isNaN(numeric)) return 0;
  return numeric;
}

export default function WeeklyProgressCard({ improvement = 0 }) {
  const change = normalizeChange(improvement);
  const positive = change >= 0;
  const TrendIcon = positive ? TrendingUp : TrendingDown;

  return (
    <div className="h-full min-h-[132px] rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Weekly Progress
        </span>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${positive ? "bg-emerald-100" : "bg-rose-100"}`}>
          <TrendIcon className={`h-4 w-4 ${positive ? "text-emerald-600" : "text-rose-600"}`} />
        </div>
      </div>

      <h3 className={`text-xl font-semibold ${positive ? "text-emerald-600" : "text-rose-600"}`}>
        {positive ? "+" : ""}{change.toFixed(0)}%
      </h3>
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
        vs last week
      </p>
    </div>
  );
}
