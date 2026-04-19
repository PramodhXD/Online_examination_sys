import { AlertTriangle } from "lucide-react";

export default function WeakAreaAlert({ weakSkills = [] }) {
  if (!weakSkills.length) {
    return null;
  }

  const primaryWeakSkill = weakSkills[0];

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/10">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-amber-100 p-2 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            Weak Area Detected
          </h3>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            Your <strong>{primaryWeakSkill.name}</strong> score is low.
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Recommended: Practice {primaryWeakSkill.name} mock tests.
          </p>
        </div>
      </div>
    </div>
  );
}
