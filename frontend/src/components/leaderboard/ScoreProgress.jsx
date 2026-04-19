const clampScore = (value) => {
  const numeric = Number(value || 0);
  if (Number.isNaN(numeric)) return 0;
  return Math.min(100, Math.max(0, numeric));
};

const formatPercent = (value) =>
  `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(clampScore(value))}%`;

export default function ScoreProgress({ value }) {
  const score = clampScore(value);

  return (
    <div className="min-w-[140px]">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        {formatPercent(score)}
      </p>
      <div className="mt-1 h-2 w-full rounded-full bg-gray-300 dark:bg-slate-700">
        <div
          className="h-2 rounded-full bg-green-500 transition-all duration-500"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
