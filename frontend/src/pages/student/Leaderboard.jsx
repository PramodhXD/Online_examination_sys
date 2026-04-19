import { useEffect, useMemo, useState } from "react";

import TopThreeCard from "../../components/leaderboard/TopThreeCard";
import LeaderboardRow from "../../components/leaderboard/LeaderboardRow";
import DashboardLayout from "../../components/dashboard/layout/DashboardLayout";
import dashboardService from "../../services/dashboardService";
import { getErrorMessage } from "../../utils/errorMessage";

const SCOPE_OPTIONS = [
  { value: "all", label: "All Exams" },
  { value: "assessment", label: "Assessment" },
  { value: "practice", label: "Practice" },
];

const normalizeEntry = (entry) => ({
  ...entry,
  isCurrentUser: Boolean(entry?.isCurrentUser ?? entry?.is_current_user),
});

export default function Leaderboard() {
  const [scope, setScope] = useState("all");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await dashboardService.getLeaderboard(scope, 30);
        setData(response);
      } catch (err) {
        setData(null);
        const fallback =
          err?.response?.status === 403
            ? "Upgrade required to access leaderboard."
            : "Unable to load leaderboard right now. Please try again.";
        setError(getErrorMessage(err, fallback));
      } finally {
        setLoading(false);
      }
    };

    void loadLeaderboard();
  }, [scope]);

  const entries = useMemo(
    () => (Array.isArray(data?.entries) ? data.entries.map(normalizeEntry) : []),
    [data]
  );
  const podium = entries.slice(0, 3);

  return (
    <DashboardLayout title="Leaderboard">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-50 via-white to-emerald-50 p-6 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                Student Rankings
              </p>
              <h2 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">
                Leaderboard
              </h2>
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                Rankings are based on average score and attempts.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {SCOPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setScope(option.value)}
                  aria-pressed={scope === option.value}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    scope === option.value
                      ? "bg-slate-900 text-white dark:bg-blue-600"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {!loading && !error ? (
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <div className="rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-slate-700 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-200">
                Total students:{" "}
                <span className="font-bold text-slate-900 dark:text-white">
                  {data?.total_students ?? 0}
                </span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-slate-700 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-200">
                Your rank:{" "}
                <span className="font-bold text-slate-900 dark:text-white">
                  {data?.my_rank != null ? `#${data.my_rank}` : "-"}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-900">
            <div className="animate-pulse space-y-3">
              <div className="h-4 w-52 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 w-4/5 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-amber-800 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-200">
            {error}
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            No leaderboard data available yet.
          </div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              {podium.map((entry) => (
                <TopThreeCard
                  key={`podium-${entry.user_id}-${entry.rank}`}
                  entry={entry}
                />
              ))}
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
              <div className="max-h-[560px] overflow-auto">
                <table className="w-full min-w-[820px]">
                  <thead className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
                      <th className="px-5 py-3">Rank</th>
                      <th className="px-5 py-3">Student</th>
                      <th className="px-5 py-3">Roll Number</th>
                      <th className="px-5 py-3">Score</th>
                      <th className="px-5 py-3">Attempts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <LeaderboardRow
                        key={`${entry.user_id}-${entry.rank}`}
                        entry={entry}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
