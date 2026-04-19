import { Sparkles } from "lucide-react";

export default function PerformanceCoach({ strongestSkill, weakestSkill }) {
  if (!strongestSkill && !weakestSkill) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm dark:border-slate-600 dark:bg-slate-700">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-blue-600" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
          Performance Coach
        </h3>
      </div>

      <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
        {weakestSkill ? (
          <p>
            Focus more on <strong>{weakestSkill.name}</strong>.
          </p>
        ) : null}
        {strongestSkill ? (
          <p>
            You are strongest in <strong>{strongestSkill.name}</strong>.
          </p>
        ) : null}
      </div>
    </div>
  );
}
