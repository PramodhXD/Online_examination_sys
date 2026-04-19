import Avatar from "./Avatar";
import ScoreProgress from "./ScoreProgress";

function rankLabel(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

export default function LeaderboardRow({ entry }) {
  const isCurrentUser = Boolean(entry?.isCurrentUser);

  return (
    <tr
      className={`border-b border-slate-100 dark:border-slate-800 ${
        isCurrentUser
          ? "cursor-pointer border-l-4 border-blue-500 bg-blue-50 transition-colors duration-200 dark:bg-blue-950/30"
          : "cursor-pointer hover:bg-gray-50 transition-colors duration-200 dark:hover:bg-slate-800/60"
      }`}
    >
      <td className="px-5 py-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
        {rankLabel(Number(entry?.rank || 0))}
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <Avatar name={entry?.name} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {entry?.name || "Unknown Student"}
              </p>
              {isCurrentUser ? (
                <span className="ml-2 rounded bg-blue-500 px-2 py-0.5 text-xs text-white">
                  You
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </td>
      <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
        {entry?.roll_number || "-"}
      </td>
      <td className="px-5 py-4">
        <ScoreProgress value={entry?.average_score} />
      </td>
      <td className="px-5 py-4 text-sm font-medium text-slate-700 dark:text-slate-200">
        {entry?.attempts ?? 0}
      </td>
    </tr>
  );
}
