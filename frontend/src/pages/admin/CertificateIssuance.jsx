import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Award, RefreshCcw } from "lucide-react";
import Sidebar from "../../components/admin/layout/Sidebar";
import Header from "../../components/admin/layout/Header";
import adminService from "../../services/adminService";

export default function CertificateIssuance() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [onlyPending, setOnlyPending] = useState(true);
  const [issuingId, setIssuingId] = useState(null);
  const [issuingStudentId, setIssuingStudentId] = useState(null);

  const loadRows = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getEligibleCertificates({
        search,
        only_pending: onlyPending,
      });
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search, onlyPending]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const byStudent = useMemo(() => {
    const map = new Map();
    for (const row of rows) {
      if (!map.has(row.student_id)) {
        map.set(row.student_id, {
          student_id: row.student_id,
          student_name: row.student_name,
          email: row.email,
          roll_number: row.roll_number,
          subscription_plan: row.subscription_plan,
          count: 0,
        });
      }
      map.get(row.student_id).count += 1;
    }
    return Array.from(map.values());
  }, [rows]);

  const handleIssueAttempt = async (attemptId) => {
    try {
      setIssuingId(attemptId);
      await adminService.issueCertificateAttempt(attemptId);
      await loadRows();
    } catch {
      window.alert("Failed to issue certificate for this exam attempt.");
    } finally {
      setIssuingId(null);
    }
  };

  const handleIssueAllForStudent = async (studentId) => {
    try {
      setIssuingStudentId(studentId);
      const res = await adminService.issueStudentCertificates(studentId);
      window.alert(`Issued ${Number(res?.issued || 0)} certificate(s).`);
      await loadRows();
    } catch {
      window.alert("Failed to issue certificates for this student.");
    } finally {
      setIssuingStudentId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#0f172a] to-[#1e293b]">
      <Sidebar isOpen={isSidebarOpen} />
      <div className={`min-h-screen min-w-0 flex flex-col transition-all duration-300 ${isSidebarOpen ? "lg:pl-64" : "lg:pl-20"}`}>
        <Header activeTab="certificates" toggleSidebar={() => setIsSidebarOpen((p) => !p)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 md:p-5 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col xl:flex-row gap-3 xl:items-center">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by student or exam..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200">
                <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} />
                Pending only
              </label>

              <button onClick={loadRows} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800">
                <RefreshCcw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Eligible Students</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{byStudent.length} students</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Student</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Subscription</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Eligible Exams</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {(loading || byStudent.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        {loading ? "Loading students..." : "No eligible records found."}
                      </td>
                    </tr>
                  )}
                  {!loading && byStudent.map((item) => (
                    <tr key={item.student_id}>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.student_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.roll_number} • {item.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700">
                          {item.subscription_plan}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200">{item.count}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          disabled={issuingStudentId === item.student_id}
                          onClick={() => handleIssueAllForStudent(item.student_id)}
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          <Award className="w-3.5 h-3.5" />
                          Issue All
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Eligible Exams</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{rows.length} records</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Student</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Exam</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Score</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Completed</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {(loading || rows.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        {loading ? "Loading exam attempts..." : "No eligible exam attempts found."}
                      </td>
                    </tr>
                  )}
                  {!loading && rows.map((row) => (
                    <tr key={row.attempt_id}>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.student_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{row.roll_number}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-800">{row.assessment_title}</td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200">{row.percentage}% ({row.score}/{row.total})</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{new Date(row.completed_at).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${row.issued ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                          {row.issued ? "Issued" : "Pending"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          disabled={row.issued || issuingId === row.attempt_id}
                          onClick={() => handleIssueAttempt(row.attempt_id)}
                          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <Award className="w-3.5 h-3.5" />
                          {issuingId === row.attempt_id ? "Issuing..." : "Issue"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}


