import { useEffect, useMemo, useState } from "react";
import { Search, TrendingUp, Trophy, Users } from "lucide-react";
import Sidebar from "../../components/admin/layout/Sidebar";
import Header from "../../components/admin/layout/Header";
import adminService from "../../services/adminService";

export default function ResultsAnalytics() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await adminService.getAnalytics();
        setRows(Array.isArray(data) ? data : []);
      } catch (error) { void error;
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => !q || r.exam.toLowerCase().includes(q));
  }, [rows, query]);

  const totalAttempts = rows.reduce((a, b) => a + (b.attempts || 0), 0);
  const avgScore = rows.length ? Math.round(rows.reduce((a, b) => a + (b.average || 0), 0) / rows.length) : 0;
  const avgPass = rows.length ? Math.round(rows.reduce((a, b) => a + (b.pass_rate || 0), 0) / rows.length) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#0f172a] to-[#1e293b]">
      <Sidebar activeTab="analytics" isOpen={isSidebarOpen} />
      <div className={`min-h-screen min-w-0 flex flex-col transition-all duration-300 ${isSidebarOpen ? "lg:pl-64" : "lg:pl-20"}`}>
        <Header activeTab="analytics" toggleSidebar={() => setIsSidebarOpen((p) => !p)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-700"><p className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" />Total Attempts</p><p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{totalAttempts}</p></div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-700"><p className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" />Average Score</p><p className="text-2xl font-bold text-blue-700 mt-1">{avgScore}%</p></div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-700"><p className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1"><Trophy className="w-3.5 h-3.5" />Pass Rate</p><p className="text-2xl font-bold text-green-700 mt-1">{avgPass}%</p></div>
          </section>

          <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search exam results..." className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Exam</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Attempts</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Average</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Pass Rate</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Distribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {loading && <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">Loading analytics...</td></tr>}
                  {!loading && list.map((r) => (
                    <tr key={r.exam} className="hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/70">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-slate-100">{r.exam}</td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200">{r.attempts}</td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200">{r.average}%</td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200">{r.pass_rate}%</td>
                      <td className="px-6 py-4"><div className="w-48 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-600" style={{ width: `${r.average}%` }} /></div></td>
                    </tr>
                  ))}
                  {!loading && list.length === 0 && <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">No analytics found.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}



