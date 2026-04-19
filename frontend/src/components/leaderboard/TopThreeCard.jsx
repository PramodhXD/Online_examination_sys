import { Crown, Trophy } from "lucide-react";

import Avatar from "./Avatar";
import ScoreProgress from "./ScoreProgress";

const PODIUM_STYLES = {
  1: "border-yellow-200 bg-yellow-50 dark:border-yellow-500/40 dark:bg-yellow-500/10",
  2: "border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-800/70",
  3: "border-amber-200 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10",
};

function podiumMedal(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

export default function TopThreeCard({ entry }) {
  return (
    <div
      className={`rounded-xl border p-4 ${PODIUM_STYLES[entry.rank] || "border-slate-200 bg-slate-50"}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-sm font-bold text-slate-800 dark:text-slate-100">
          {entry.rank === 1 ? <Crown className="h-4 w-4 text-yellow-600" /> : <span>{podiumMedal(entry.rank)}</span>}
          #{entry.rank}
        </span>
        <Trophy className={`h-4 w-4 ${entry.rank === 1 ? "text-yellow-600" : "text-slate-500"}`} />
      </div>

      <div className="flex items-center gap-3">
        <Avatar name={entry.name} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold text-slate-900 dark:text-white">{entry.name}</p>
            {entry.isCurrentUser ? (
              <span className="ml-2 rounded bg-blue-500 px-2 py-0.5 text-xs text-white">
                You
              </span>
            ) : null}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">{entry.roll_number || "-"}</p>
        </div>
      </div>

      <div className="mt-3">
        <ScoreProgress value={entry.average_score} />
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{entry.attempts} attempts</p>
    </div>
  );
}
