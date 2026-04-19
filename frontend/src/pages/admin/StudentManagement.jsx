import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Filter,
  Eye,
  Trash2,
  UserX,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Sidebar from "../../components/admin/layout/Sidebar";
import Header from "../../components/admin/layout/Header";
import adminService from "../../services/adminService";

const PAGE_SIZE = 5;

function StatusPill({ type, value }) {
  const map = {
    face: {
      verified: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
      warning: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
      not_registered: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
    },
    exam: {
      active: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
      idle: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
      suspended: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
    },
  };
  const labels = {
    verified: "Verified",
    warning: "Warning",
    not_registered: "Not Registered",
    active: "Active",
    idle: "Idle",
    suspended: "Suspended",
  };

  const icon =
    type === "face" && value === "verified" ? (
      <ShieldCheck className="w-3.5 h-3.5" />
    ) : type === "face" && value === "warning" ? (
      <ShieldAlert className="w-3.5 h-3.5" />
    ) : type === "face" ? (
      <ShieldX className="w-3.5 h-3.5" />
    ) : null;

  const klass = map[type]?.[value] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${klass}`}>
      {icon}
      {labels[value] || value}
    </span>
  );
}

export default function StudentManagement() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [faceFilter, setFaceFilter] = useState("all");
  const [subscriptionFilter, setSubscriptionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getStudents({
        search: searchTerm,
        department: departmentFilter,
        face_status: faceFilter,
        subscription_status: subscriptionFilter,
        page,
        page_size: 100,
      });
      setStudents(Array.isArray(data) ? data : []);
    } catch (error) { void error;
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, departmentFilter, faceFilter, subscriptionFilter, page]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const departments = useMemo(() => {
    const unique = new Set(students.map((s) => s.department).filter(Boolean));
    return ["all", ...Array.from(unique)];
  }, [students]);

  const totalPages = Math.max(1, Math.ceil(students.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pagedStudents = students.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const handleDelete = async (studentId, name) => {
    if (!window.confirm(`Delete ${name}?`)) return;
    try {
      await adminService.deleteStudent(studentId);
      await loadStudents();
    } catch { void 0; }
  };

  const handleBlockToggle = async (studentId) => {
    try {
      await adminService.toggleStudentBlock(studentId);
      await loadStudents();
    } catch { void 0; }
  };

  const handleViewResults = async (student) => {
    try {
      const data = await adminService.getStudentResults(student.id);
      setSelectedStudent(student);
      setResults(data);
    } catch { void 0; }
  };

  const clearFilters = () => {
    setDepartmentFilter("all");
    setFaceFilter("all");
    setSubscriptionFilter("all");
    setSearchTerm("");
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#0f172a] to-[#1e293b]">
      <Sidebar activeTab="students" isOpen={isSidebarOpen} />
      <div className={`min-h-screen min-w-0 flex flex-col transition-all duration-300 ${isSidebarOpen ? "lg:pl-64" : "lg:pl-20"}`}>
        <Header activeTab="students" toggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 md:p-5 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col xl:flex-row gap-3 xl:items-center">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by name, ID or email..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <select value={departmentFilter} onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20">
                {departments.map((dept) => <option key={dept} value={dept}>{dept === "all" ? "All Departments" : dept}</option>)}
              </select>

              <select value={faceFilter} onChange={(e) => { setFaceFilter(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20">
                <option value="all">All Face Status</option>
                <option value="verified">Verified</option>
                <option value="warning">Warning</option>
                <option value="not_registered">Not Registered</option>
              </select>

              <select value={subscriptionFilter} onChange={(e) => { setSubscriptionFilter(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20">
                <option value="all">All Subscriptions</option>
                <option value="paid">Subscribed (Paid)</option>
                <option value="free">Free Plan</option>
              </select>

              <button type="button" onClick={clearFilters} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
                <Filter className="w-4 h-4" />
                Clear Filters
              </button>
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left dark:bg-slate-900">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wide">Student Details</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wide">Department & Batch</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wide">Subscription</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wide">Face Registration</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wide">Exam Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wide text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {(loading || pagedStudents.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                        {loading ? "Loading students..." : "No students found for the selected filters."}
                      </td>
                    </tr>
                  )}
                  {!loading && pagedStudents.map((student) => {
                    const initials = student.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                    return (
                      <tr key={student.id} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold flex items-center justify-center">{initials}</div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{student.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">STU{String(student.id).padStart(3, "0")} • {student.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{student.department}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{student.batch}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${student.subscription_plan === "FREE" ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"}`}>
                            {student.subscription_plan}
                          </span>
                        </td>
                        <td className="px-6 py-4"><StatusPill type="face" value={student.face_status} /></td>
                        <td className="px-6 py-4"><StatusPill type="exam" value={student.exam_status} /></td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button title="View Results" onClick={() => handleViewResults(student)} className="p-2 rounded-lg text-slate-500 dark:text-slate-300 hover:text-blue-400 hover:bg-blue-500/10 transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button title={student.blocked ? "Unblock Student" : "Block Student"} onClick={() => handleBlockToggle(student.id)} className={`p-2 rounded-lg transition-colors ${student.blocked ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10" : "text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10"}`}>
                              {student.blocked ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                            </button>
                            <button title="Delete Student" onClick={() => handleDelete(student.id, student.name)} className="p-2 rounded-lg text-slate-500 dark:text-slate-300 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-4 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">Showing {pagedStudents.length} of {students.length} students</p>
              <div className="flex items-center gap-2">
                <button type="button" disabled={pageSafe === 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800"><ChevronLeft className="w-4 h-4" />Previous</button>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 px-2">{pageSafe} / {totalPages}</span>
                <button type="button" disabled={pageSafe === totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800">Next<ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          </section>
        </main>
      </div>

      {selectedStudent && results && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Student Results</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{selectedStudent.name} (STU{String(selectedStudent.id).padStart(3, "0")})</p>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div className="flex items-center justify-between text-sm"><span className="text-slate-500 dark:text-slate-400">Exams Taken</span><span className="font-semibold text-slate-900 dark:text-slate-100">{results.exams_taken}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-slate-500 dark:text-slate-400">Average Score</span><span className="font-semibold text-slate-900 dark:text-slate-100">{results.avg_score}%</span></div>
              <div className="text-sm"><p className="text-slate-500 dark:text-slate-400 mb-1">Latest Result</p><p className="font-semibold text-slate-900 dark:text-slate-100">{results.latest_result || "-"}</p></div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button type="button" onClick={() => { setSelectedStudent(null); setResults(null); }} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
