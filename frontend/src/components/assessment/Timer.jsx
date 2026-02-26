import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";

export default function Timer() {
  const [seconds, setSeconds] = useState(60 * 60); // 60 minutes

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  const percent = (seconds / (60 * 60)) * 100;

  return (
    <div className="sticky top-0 z-20 border-b border-slate-800/60 bg-slate-950 text-white px-4 sm:px-6 lg:px-8 py-4 shadow">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-wide">
          Aptitude Assessment
        </h1>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1.5 text-sm font-semibold text-amber-300">
            <Clock3 className="w-4 h-4" />
            Time Left: {minutes}:{secs}
          </div>
          <div className="w-28 sm:w-36 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full ${percent > 25 ? "bg-emerald-400" : "bg-red-400"}`} style={{ width: `${percent}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
