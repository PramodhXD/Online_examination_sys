import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Calendar } from "lucide-react";
import Sidebar from "../../components/admin/layout/Sidebar";
import Header from "../../components/admin/layout/Header";
import adminService from "../../services/adminService";

export default function SupportTickets() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getSupportLogs({ search: query });
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const t = setTimeout(loadLogs, 250);
    return () => clearTimeout(t);
  }, [loadLogs]);

  const list = useMemo(() => rows, [rows]);

  const parseSupportMessage = (value) => {
    if (!value) return null;
    const text = String(value);
    if (!text.includes("Student support ticket")) return null;

    const afterMarker = text.split("Student support ticket").pop() || "";
    const parts = afterMarker.split("|").map((part) => part.trim()).filter(Boolean);
    const data = {};
    for (const part of parts) {
      const [rawKey, ...rest] = part.split("=");
      const key = rawKey?.trim();
      if (!key) continue;
      const val = rest.join("=").trim();
      if (val) data[key] = val;
    }
    return Object.keys(data).length ? data : null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#0f172a] to-[#1e293b]">
      <Sidebar activeTab="support" isOpen={isSidebarOpen} />
      <div className={`min-h-screen min-w-0 flex flex-col transition-all duration-300 ${isSidebarOpen ? "lg:pl-64" : "lg:pl-20"}`}>
        <Header activeTab="support" toggleSidebar={() => setIsSidebarOpen((p) => !p)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-white">Support Tickets</h2>
            <p className="text-slate-300">Review and triage student support submissions.</p>
          </div>

          <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tickets by message..." className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div className="flex gap-3">
                <button className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"><Calendar className="w-4 h-4" />Date</button>
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-300 uppercase">Ticket ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-300 uppercase">Message</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-300 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {loading && <tr><td colSpan={3} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">Loading tickets...</td></tr>}
                  {!loading && list.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-slate-100">SUP-{String(l.id).padStart(4, "0")}</td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200">
                        {(() => {
                          const parsed = parseSupportMessage(l.message);
                          if (!parsed) {
                            return l.message;
                          }

                          return (
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                                {parsed.name ? (
                                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1">
                                    {parsed.name}
                                  </span>
                                ) : null}
                                {parsed.email ? (
                                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1">
                                    {parsed.email}
                                  </span>
                                ) : null}
                                {parsed.category ? (
                                  <span className="rounded-full bg-blue-100 dark:bg-blue-500/20 px-2 py-1 text-blue-700 dark:text-blue-300">
                                    {parsed.category}
                                  </span>
                                ) : null}
                                {parsed.priority ? (
                                  <span className="rounded-full bg-amber-100 dark:bg-amber-500/20 px-2 py-1 text-amber-700 dark:text-amber-200">
                                    {parsed.priority}
                                  </span>
                                ) : null}
                              </div>
                              {parsed.subject ? (
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                  {parsed.subject}
                                </p>
                              ) : null}
                              {parsed.message ? (
                                <p className="text-sm text-slate-700 dark:text-slate-200">
                                  {parsed.message}
                                </p>
                              ) : null}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{new Date(l.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {!loading && list.length === 0 && <tr><td colSpan={3} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">No support tickets found.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

