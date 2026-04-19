import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Eye, Flag, StopCircle, ShieldAlert } from "lucide-react";
import Sidebar from "../../components/admin/layout/Sidebar";
import Header from "../../components/admin/layout/Header";
import adminService from "../../services/adminService";

export default function LiveMonitoring() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [rows, setRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedRow, setSelectedRow] = useState(null);

  const loadRows = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getLiveSessions(searchTerm);
      setRows(Array.isArray(data) ? data : []);
    } catch (error) { void error;
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    const t = setTimeout(loadRows, 250);
    return () => clearTimeout(t);
  }, [loadRows]);
  useEffect(() => {
    const interval = setInterval(() => {
      loadRows();
    }, 10000);
    return () => clearInterval(interval);
  }, [loadRows]);

  const filtered = useMemo(() => {
    const q = (searchTerm || "").trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => (
      String(r.student_name || "").toLowerCase().includes(q)
      || String(r.exam_title || "").toLowerCase().includes(q)
      || String(r.session_code || "").toLowerCase().includes(q)
      || String(r.attempt_type || "").toLowerCase().includes(q)
    ));
  }, [rows, searchTerm]);
  const online = rows.filter((r) => r.status === "Live").length;
  const flagged = rows.filter((r) => r.status === "Flagged").length;
  const alerts = rows.reduce((acc, r) => acc + (r.total_alerts || 0), 0);

  const flagSession = async (id) => {
    try {
      await adminService.flagSession(id);
      await loadRows();
    } catch { void 0; }
  };

  const stopSession = async (id) => {
    try {
      await adminService.stopSession(id);
      await loadRows();
    } catch { void 0; }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#0f172a] to-[#1e293b]">
      <Sidebar activeTab="live" isOpen={isSidebarOpen} />
      <div className={`min-h-screen min-w-0 flex flex-col transition-all duration-300 ${isSidebarOpen ? "lg:pl-64" : "lg:pl-20"}`}>
        <Header activeTab="live" toggleSidebar={() => setIsSidebarOpen((p) => !p)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200"><p className="text-xs text-slate-500">Students Online</p><p className="text-2xl font-bold text-slate-900 mt-1">{online}</p></div>
            <div className="bg-white rounded-2xl p-5 border border-slate-200"><p className="text-xs text-slate-500">Flagged Sessions</p><p className="text-2xl font-bold text-orange-600 mt-1">{flagged}</p></div>
            <div className="bg-white rounded-2xl p-5 border border-slate-200"><p className="text-xs text-slate-500">Total Alerts</p><p className="text-2xl font-bold text-red-600 mt-1">{alerts}</p></div>
          </section>

          <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by student, exam or session id..." className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Student</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Exam</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Type</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Face Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Progress</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Session</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading && <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-500">Loading sessions...</td></tr>}
                  {!loading && filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-4"><p className="text-sm font-semibold">{r.student_name}</p><p className="text-xs text-slate-500">{r.session_code}</p></td>
                      <td className="px-6 py-4 text-sm text-slate-700">{r.exam_title}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${r.attempt_type === "practice" ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"}`}>
                          {r.attempt_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${r.face_status === "ok" ? "bg-green-100 text-green-700" : r.face_status === "warning" ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"}`}>
                          <ShieldAlert className="w-3.5 h-3.5" />
                          {r.face_status === "ok" ? "Verified" : r.face_status === "warning" ? "Warning" : "Alert"}
                        </span>
                        {r.total_alerts > 0 && (
                          <div className="mt-1 space-y-1 text-[11px] text-slate-500">
                            <p>Alerts: {r.total_alerts}</p>
                            <p>Tab: {r.tab_switches} | Fullscreen: {r.fullscreen_exits} | Webcam: {r.webcam_alerts}</p>
                            {r.last_alert_message ? <p className="text-slate-600">{r.last_alert_message}</p> : null}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-36">
                          <p className="text-xs text-slate-500 mb-1">{r.progress}%</p>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-blue-600" style={{ width: `${r.progress}%` }} /></div>
                        </div>
                      </td>
                      <td className="px-6 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${r.status === "Live" ? "bg-blue-100 text-blue-700" : r.status === "Flagged" ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-700"}`}>{r.status === "Flagged" ? "Violation" : r.status}</span></td>
                      <td className="px-6 py-4"><div className="flex justify-end gap-2">
                        <button onClick={() => setSelectedRow(r)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100"><Eye className="w-3.5 h-3.5" />View</button>
                        <button onClick={() => flagSession(r.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-50"><Flag className="w-3.5 h-3.5" />Flag</button>
                        <button onClick={() => stopSession(r.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"><StopCircle className="w-3.5 h-3.5" />Stop</button>
                      </div></td>
                    </tr>
                  ))}
                  {!loading && filtered.length === 0 && <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-500">No sessions found.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {selectedRow && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Live Session Details</h2>
              <button onClick={() => setSelectedRow(null)} className="text-sm font-semibold text-slate-500 hover:text-slate-700">Close</button>
            </div>
            <div className="px-6 py-5 grid grid-cols-2 gap-3 text-sm">
              <p className="text-slate-500">Student</p><p className="font-semibold text-slate-900">{selectedRow.student_name}</p>
              <p className="text-slate-500">Exam</p><p className="font-semibold text-slate-900">{selectedRow.exam_title}</p>
              <p className="text-slate-500">Session ID</p><p className="font-semibold text-slate-900">{selectedRow.session_code}</p>
              <p className="text-slate-500">Type</p><p className="font-semibold text-slate-900">{selectedRow.attempt_type}</p>
              <p className="text-slate-500">Progress</p><p className="font-semibold text-slate-900">{selectedRow.progress}%</p>
              <p className="text-slate-500">Total Alerts</p><p className="font-semibold text-slate-900">{selectedRow.total_alerts || 0}</p>
              <p className="text-slate-500">Tab Switches</p><p className="font-semibold text-slate-900">{selectedRow.tab_switches || 0}</p>
              <p className="text-slate-500">Fullscreen Exits</p><p className="font-semibold text-slate-900">{selectedRow.fullscreen_exits || 0}</p>
              <p className="text-slate-500">Webcam Alerts</p><p className="font-semibold text-slate-900">{selectedRow.webcam_alerts || 0}</p>
              <p className="text-slate-500">Latest Alert</p><p className="font-semibold text-slate-900">{selectedRow.last_alert_message || "No alerts recorded"}</p>
              <p className="text-slate-500">Violation Status</p><p className={`font-semibold ${selectedRow.status === "Flagged" ? "text-orange-600" : "text-green-600"}`}>{selectedRow.status === "Flagged" ? "Violation Detected" : "Normal"}</p>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
              <button onClick={() => setSelectedRow(null)} className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



