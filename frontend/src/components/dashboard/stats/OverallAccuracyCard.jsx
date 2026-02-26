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
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border dark:border-slate-700 p-6 transition">

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Overall Accuracy
          </h3>
        </div>

        <span className={`text-2xl font-bold ${textColor}`}>
          {displayValue}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3 mb-4 overflow-hidden">
        <div
          className={`${barColor} h-3 rounded-full transition-all duration-1000`}
          style={{ width: `${accuracy}%` }}
        ></div>
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
        <span>Poor</span>
        <span>Average</span>
        <span>Target</span>
        <span>Excellent</span>
      </div>

      <p className="text-xs text-gray-400 italic">
        Based on recent assessments
      </p>
    </div>
  );
}
