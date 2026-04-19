import { Eye, Flag, AlertCircle, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function LiveStatusTable({ rows = [], loading = false }) {
  const navigate = useNavigate();
  const online = rows.filter((r) => r.status === "Live").length;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
      <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Live Exam Monitoring</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Real-time status of students currently attempting exams</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-300 bg-green-50 dark:bg-green-500/20 px-2 py-1 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          {online} Students Online
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-800">
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Student Name</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Exam Name</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Progress</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Face Detection</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">Loading live sessions...</td>
              </tr>
            )}

            {!loading && rows.slice(0, 5).map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/60 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-200">
                      {row.student_name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{row.student_name}</span>
                  </div>
                </td>

                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{row.exam_title}</td>

                <td className="px-6 py-4">
                  <div className="w-24">
                    <span className="text-[10px] font-bold text-slate-400">{row.progress}%</span>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-blue-600 rounded-full transition-all duration-1000" style={{ width: `${row.progress}%` }} />
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${row.status === "Live" ? "bg-green-50 text-green-600 dark:bg-green-500/20 dark:text-green-300" : row.status === "Flagged" ? "bg-orange-50 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200"}`}>
                    {row.status}
                  </span>
                </td>

                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${row.face_status === "ok" ? "bg-green-50 text-green-600 dark:bg-green-500/20 dark:text-green-300" : "bg-orange-50 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300"}`}>
                    {row.face_status === "ok" ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    {row.face_status === "ok" ? "OK" : row.face_status}
                  </span>
                  {row.tab_switches > 0 && <p className="text-[10px] mt-1 text-slate-400">Tab Switches: {row.tab_switches}</p>}
                </td>

                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => navigate("/admin/live")} className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => navigate("/admin/live")} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                      <Flag className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">No live sessions available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-slate-100 dark:border-slate-700 text-center">
        <button onClick={() => navigate("/admin/live")} className="text-sm font-semibold text-blue-600 dark:text-blue-300 hover:underline">
          View All Active Exams
        </button>
      </div>
    </div>
  );
}
