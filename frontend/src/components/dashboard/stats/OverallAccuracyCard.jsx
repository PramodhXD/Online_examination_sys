import { TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

export default function OverallAccuracyCard({ accuracy = 84.5 }) {
  const [displayValue, setDisplayValue] = useState(0);

  // 🔥 Animate percentage count-up
  useEffect(() => {
    let start = 0;
    const duration = 1000; // 1 second
    const increment = accuracy / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= accuracy) {
        start = accuracy;
        clearInterval(timer);
      }
      setDisplayValue(start.toFixed(1));
    }, 16);

    return () => clearInterval(timer);
  }, [accuracy]);

  // 🎨 Dynamic color logic
  let barColor = "bg-green-500";
  let textColor = "text-green-600";

  if (accuracy < 50) {
    barColor = "bg-red-500";
    textColor = "text-red-600";
  } else if (accuracy < 75) {
    barColor = "bg-yellow-500";
    textColor = "text-yellow-600";
  }

  return (
    <div className="h-full min-h-[132px] rounded-xl border bg-white p-4 shadow-sm transition dark:border-slate-700 dark:bg-slate-800">

      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </div>
          <h3 className="text-xs text-gray-500 dark:text-gray-400">
            Accuracy
          </h3>
        </div>
        <span className={`shrink-0 text-xl font-semibold leading-none ${textColor}`}>
          {displayValue}%
        </span>
      </div>

      <p className="mb-3 text-xs text-gray-400 dark:text-gray-500">
        Based on recent assessments
      </p>

      <div className="mt-auto">
        <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
          <div
            className={`${barColor} h-2 rounded-full transition-all duration-1000`}
            style={{ width: `${accuracy}%` }}
          ></div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
          <span>Poor</span>
          <span>Avg</span>
          <span>Target</span>
          <span>Top</span>
        </div>
      </div>
    </div>
  );
}
