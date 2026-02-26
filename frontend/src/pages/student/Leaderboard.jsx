import { useEffect, useMemo, useState } from "react";
import { Crown, Medal, Trophy } from "lucide-react";
import DashboardLayout from "../../components/dashboard/layout/DashboardLayout";
import dashboardService from "../../services/dashboardService";
import { getErrorMessage } from "../../utils/errorMessage";

const SCOPE_OPTIONS = [
  { value: "all", label: "All Exams" },
  { value: "assessment", label: "Assessment" },
  { value: "practice", label: "Practice" },
];

const PODIUM_STYLES = {
  1: "border-yellow-200 bg-yellow-50",
  2: "border-slate-200 bg-slate-50",
  3: "border-amber-200 bg-amber-50",
};

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
        if (err?.response?.status === 403) {
          setError(getErrorMessage(err, "Upgrade required to access leaderboard."));
        }
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, [scope]);

  const entries = useMemo(() => (Array.isArray(data?.entries) ? data.entries : []), [data]);
  const podium = entries.slice(0, 3);

  return (
    <DashboardLayout title="Leaderboard">
      <div className="max-w-6xl mx-auto">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-50 via-white to-emerald-50 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-blue-700 tracking-wide uppercase">Student Rankings</p>
              <h2 className="text-3xl font-bold text-slate-900 mt-1">Leaderboard</h2>
              <p className="text-slate-600 mt-2">Rankings are based on average score and attempts.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SCOPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setScope(option.value)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    scope === option.value
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          {!loading && data?.my_rank && (
            <p className="mt-4 text-sm text-slate-700">
              Your rank: <span className="font-bold text-slate-900">#{data.my_rank}</span> / {data.total_students}
            </p>
          )}
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-slate-500">Loading leaderboard...</div>
        ) : error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-amber-800">{error}</div>
        ) : entries.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-slate-600">No leaderboard data available yet.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {podium.map((entry) => (
                <div
                  key={`podium-${entry.user_id}-${entry.rank}`}
                  className={`rounded-xl border p-4 ${PODIUM_STYLES[entry.rank] || "border-slate-200 bg-slate-50"}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-slate-800">
                      {entry.rank === 1 ? <Crown className="w-4 h-4 text-yellow-600" /> : <Medal className="w-4 h-4" />}
                      #{entry.rank}
                    </span>
                    <Trophy className={`w-4 h-4 ${entry.rank === 1 ? "text-yellow-600" : "text-slate-500"}`} />
                  </div>
                  <p className="font-semibold text-slate-900">{entry.name}</p>
                  <p className="text-sm text-slate-600">{entry.roll_number || "-"}</p>
                  <p className="mt-2 text-lg font-bold text-slate-900">{entry.average_score}%</p>
                  <p className="text-xs text-slate-500">{entry.attempts} attempts</p>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full min-w-[760px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-600">
                    <th className="px-5 py-3">Rank</th>
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Roll Number</th>
                    <th className="px-5 py-3">Average Score</th>
                    <th className="px-5 py-3">Attempts</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr
                      key={`${entry.user_id}-${entry.rank}`}
                      className={`border-b border-slate-100 ${
                        entry.is_current_user ? "bg-blue-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="px-5 py-3 font-semibold text-slate-800">
                        <span className="inline-flex items-center gap-2">
                          {entry.rank <= 3 ? (
                            <Medal className={`w-4 h-4 ${entry.rank === 1 ? "text-yellow-600" : "text-slate-500"}`} />
                          ) : null}
                          #{entry.rank}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-900 font-medium">
                        {entry.name}
                        {entry.is_current_user ? (
                          <span className="ml-2 rounded-full bg-blue-600 text-white text-[10px] px-2 py-0.5">You</span>
                        ) : null}
                      </td>
                      <td className="px-5 py-3 text-slate-700">{entry.roll_number || "-"}</td>
                      <td className="px-5 py-3 text-slate-900">{entry.average_score}%</td>
                      <td className="px-5 py-3 text-slate-700">{entry.attempts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
