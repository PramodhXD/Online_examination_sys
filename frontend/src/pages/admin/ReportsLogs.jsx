import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, FileText, Download, Calendar } from "lucide-react";
import Sidebar from "../../components/admin/layout/Sidebar";
import Header from "../../components/admin/layout/Header";
import adminService from "../../services/adminService";

export default function ReportsLogs() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getLogs({
        search: query,
        event_type: typeFilter,
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (error) { void error;
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [query, typeFilter]);

  useEffect(() => {
    const t = setTimeout(loadLogs, 250);
    return () => clearTimeout(t);
  }, [loadLogs]);

  const list = useMemo(() => rows, [rows]);

  const generateReport = async () => {
    try {
      const res = await adminService.generateLogReport();
      window.alert(`${res.message} (${res.records} records)`);
    } catch { void 0; }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#0f172a] to-[#1e293b]">
      <Sidebar activeTab="reports" isOpen={isSidebarOpen} />
      <div className={`min-h-screen min-w-0 flex flex-col transition-all duration-300 ${isSidebarOpen ? "lg:pl-64" : "lg:pl-20"}`}>
        <Header activeTab="reports" toggleSidebar={() => setIsSidebarOpen((p) => !p)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: "Daily Activity Report", desc: "Exam participation and completion summary." },
              { title: "Security Incident Report", desc: "Suspicious activities and proctoring alerts." },
              { title: "Performance Report", desc: "Department-wise score and pass-rate trends." },
            ].map((r) => (
              <div key={r.title} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{r.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{r.desc}</p>
                <div className="mt-4 flex gap-2">
                  <button onClick={generateReport} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"><FileText className="w-3.5 h-3.5" />Generate</button>
                  <button onClick={generateReport} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-500/50 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10"><Download className="w-3.5 h-3.5" />Download</button>
                </div>
              </div>
            ))}
          </section>

          <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search logs by type or message..." className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div className="flex gap-3">
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none">
                  <option value="all">All Types</option>
                  <option value="Security">Security</option>
                  <option value="System">System</option>
                  <option value="Admin">Admin</option>
                  <option value="Student">Student</option>
                </select>
                <button className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"><Calendar className="w-4 h-4" />Date</button>
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-300 uppercase">Log ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-300 uppercase">Type</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-300 uppercase">Message</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-300 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {loading && <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">Loading logs...</td></tr>}
                  {!loading && list.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-slate-100">LOG-{String(l.id).padStart(4, "0")}</td>
                      <td className="px-6 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${l.event_type === "Security" ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300" : l.event_type === "System" ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300" : l.event_type === "Student" ? "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300" : "bg-slate-100 text-slate-700 dark:text-slate-200 dark:bg-slate-700 dark:text-slate-200"}`}>{l.event_type}</span></td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200">{l.message}</td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{new Date(l.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {!loading && list.length === 0 && <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">No logs found.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}




