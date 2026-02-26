import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock3,
  Pencil,
  PlusCircle,
  Search,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import Sidebar from "../../components/admin/layout/Sidebar";
import Header from "../../components/admin/layout/Header";
import adminService from "../../services/adminService";

const emptyForm = {
  code: "",
  exam_type: "assessment",
  title: "",
  subject: "",
  exam_date: "",
  duration_minutes: 60,
  attempt_limit: 1,
  status: "draft",
};

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getTimeLimitState(minutes) {
  if (minutes >= 30 && minutes <= 180) {
    return { label: "Time Limit OK", className: "bg-green-100 text-green-700", icon: CheckCircle2 };
  }
  return { label: "Check Time Limit", className: "bg-orange-100 text-orange-700", icon: AlertTriangle };
}

function isUnlimitedAttemptLimit(limit) {
  return Number(limit) === 0;
}

function formatAttemptLimit(limit) {
  if (isUnlimitedAttemptLimit(limit)) return "Unlimited";
  return Number(limit ?? 1);
}

const statusStyles = {
  draft: "bg-slate-100 text-slate-700",
  published: "bg-blue-100 text-blue-700",
  live: "bg-green-100 text-green-700",
  completed: "bg-orange-100 text-orange-700",
};

const typeStyles = {
  assessment: "bg-indigo-100 text-indigo-700",
  practice: "bg-emerald-100 text-emerald-700",
};

function generateCode(examType = "assessment") {
  const prefix = examType === "practice" ? "PRC" : "ASM";
  return `${prefix}-${Math.floor(Math.random() * 900 + 100)}`;
}

export default function ExamManagement() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [exams, setExams] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [examTypeFilter, setExamTypeFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigningExam, setAssigningExam] = useState(null);
  const [assignmentMode, setAssignmentMode] = useState("all");
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [assignmentCandidates, setAssignmentCandidates] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [assignmentError, setAssignmentError] = useState("");

  const loadExams = useCallback(async () => {
    try {
      const data = await adminService.getExams(searchTerm, examTypeFilter);
      setExams(Array.isArray(data) ? data : []);
    } catch (err) {
      void err;
      setExams([]);
    }
  }, [searchTerm, examTypeFilter]);

  useEffect(() => {
    const t = setTimeout(() => {
      loadExams();
    }, 250);
    return () => clearTimeout(t);
  }, [loadExams]);

  const filteredExams = useMemo(() => exams, [exams]);

  const loadAssignments = useCallback(async (examId, search = "") => {
    const data = await adminService.getExamAssignments(examId, search);
    setAssignmentMode(data.assignment_mode || "all");
    setAssignmentCandidates(Array.isArray(data.candidates) ? data.candidates : []);
    setSelectedStudentIds((data.selected_students || []).map((student) => student.id));
  }, []);

  useEffect(() => {
    if (!isAssignModalOpen || !assigningExam) return;
    const t = setTimeout(async () => {
      try {
        await loadAssignments(assigningExam.id, assignmentSearch);
      } catch (err) {
        void err;
      }
    }, 250);
    return () => clearTimeout(t);
  }, [assignmentSearch, isAssignModalOpen, assigningExam, loadAssignments]);

  const openCreate = () => {
    setEditingExamId(null);
    const selectedType = examTypeFilter === "all" ? "assessment" : examTypeFilter;
    setForm({
      ...emptyForm,
      exam_type: selectedType,
      code: generateCode(selectedType),
      exam_date: new Date().toISOString().split("T")[0],
    });
    setError("");
    setIsModalOpen(true);
  };

  const openEdit = (exam) => {
    setEditingExamId(exam.id);
    setForm({
      code: exam.code,
      exam_type: exam.exam_type || "assessment",
      title: exam.title,
      subject: exam.subject,
      exam_date: exam.exam_date.slice(0, 10),
      duration_minutes: exam.duration_minutes,
      attempt_limit: exam.attempt_limit ?? 1,
      status: ["draft", "published"].includes((exam.status || "").toLowerCase()) ? exam.status.toLowerCase() : "draft",
    });
    setError("");
    setIsModalOpen(true);
  };

  const openAssign = async (exam) => {
    setAssigningExam(exam);
    setAssignmentSearch("");
    setAssignmentError("");
    setIsAssignModalOpen(true);
    try {
      await loadAssignments(exam.id, "");
    } catch (err) {
      setAssignmentError(err?.response?.data?.detail || "Failed to load assignments");
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingExamId(null);
    setForm(emptyForm);
    setError("");
  };

  const closeAssignModal = () => {
    setIsAssignModalOpen(false);
    setAssigningExam(null);
    setAssignmentMode("all");
    setAssignmentSearch("");
    setAssignmentCandidates([]);
    setSelectedStudentIds([]);
    setAssignmentError("");
  };

  const onSave = async () => {
    if (!form.title.trim() || !form.subject.trim() || !form.exam_date) {
      setError("Title, subject, and date are required.");
      return;
    }
    if (Number(form.duration_minutes) < 10 || Number(form.duration_minutes) > 300) {
      setError("Time limit must be between 10 and 300 minutes.");
      return;
    }
    const rawAttemptLimit = String(form.attempt_limit ?? "").trim();
    const parsedAttemptLimit = Number(rawAttemptLimit);
    if (rawAttemptLimit === "" || !Number.isInteger(parsedAttemptLimit) || parsedAttemptLimit < 0) {
      setError("Attempt limit must be 0 (Unlimited) or at least 1.");
      return;
    }

    try {
      if (editingExamId) {
        await adminService.updateExam(editingExamId, {
          exam_type: form.exam_type,
          title: form.title,
          subject: form.subject,
          duration_minutes: Number(form.duration_minutes),
          attempt_limit: parsedAttemptLimit,
          status: form.status,
        });
      } else {
        await adminService.createExam({
          code: form.code,
          exam_type: form.exam_type,
          title: form.title,
          subject: form.subject,
          exam_date: form.exam_date,
          duration_minutes: Number(form.duration_minutes),
          attempt_limit: parsedAttemptLimit,
          status: form.status,
        });
      }
      await loadExams();
      closeModal();
    } catch (err) {
      setError(err?.response?.data?.detail || "Save failed");
    }
  };

  const saveAssignments = async () => {
    if (!assigningExam) return;
    if (assignmentMode === "specific" && selectedStudentIds.length === 0) {
      setAssignmentError("Select at least one student.");
      return;
    }
    try {
      await adminService.updateExamAssignments(assigningExam.id, {
        assignment_mode: assignmentMode,
        student_ids: assignmentMode === "specific" ? selectedStudentIds : [],
      });
      await loadExams();
      closeAssignModal();
    } catch (err) {
      setAssignmentError(err?.response?.data?.detail || "Failed to save assignments");
    }
  };

  const toggleStudent = (studentId) => {
    setSelectedStudentIds((prev) => (
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    ));
  };

  const onDelete = async (exam) => {
    if (!window.confirm(`Delete ${exam.exam_type || "assessment"} exam "${exam.title}"?`)) return;
    try {
      await adminService.deleteExam(exam.id);
      await loadExams();
    } catch {
      void 0;
    }
  };

  const runTimeLimitCheck = async (exam) => {
    try {
      const res = await adminService.checkExamTimeLimit(exam.id);
      window.alert(`${exam.title}: ${res.message}`);
    } catch {
      void 0;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#0f172a] to-[#1e293b]">
      <Sidebar activeTab="exams" isOpen={isSidebarOpen} />
      <div className={`min-h-screen min-w-0 flex flex-col transition-all duration-300 ${isSidebarOpen ? "lg:pl-64" : "lg:pl-20"}`}>
        <Header activeTab="exams" toggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          <section className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search exams..." className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <select value={examTypeFilter} onChange={(e) => setExamTypeFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20">
                <option value="all">All Types</option>
                <option value="assessment">Assessment</option>
                <option value="practice">Practice</option>
              </select>
              <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-lg shadow-blue-900/20">
                <PlusCircle className="w-4 h-4" />
                Create New Exam
              </button>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {filteredExams.length === 0 && <div className="md:col-span-2 xl:col-span-4 bg-white/90 rounded-2xl border border-slate-200 p-8 text-center text-slate-600">No exams found.</div>}
            {filteredExams.map((exam) => {
              const timeState = getTimeLimitState(exam.duration_minutes);
              const TimeIcon = timeState.icon;
              return (
                <article key={exam.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${statusStyles[exam.status] || statusStyles.draft}`}>{exam.status}</span>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${typeStyles[exam.exam_type] || typeStyles.assessment}`}>{exam.exam_type || "assessment"}</span>
                    </div>
                    <div><h3 className="text-xl font-bold text-slate-900 leading-tight">{exam.title}</h3><p className="text-sm text-slate-500 mt-1">{exam.subject}</p></div>
                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400" /><span>{formatDate(exam.exam_date)}</span></div>
                      <div className="flex items-center gap-2"><Clock3 className="w-4 h-4 text-slate-400" /><span>{exam.duration_minutes} mins</span></div>
                      <div className="flex items-center gap-2"><Pencil className="w-4 h-4 text-slate-400" /><span>Attempt limit: {formatAttemptLimit(exam.attempt_limit)}</span></div>
                      <div className="flex items-center gap-2"><Users className="w-4 h-4 text-slate-400" /><span>{exam.assigned_students} students assigned</span></div>
                    </div>
                    <button onClick={() => runTimeLimitCheck(exam)} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${timeState.className}`}>
                      <TimeIcon className="w-3.5 h-3.5" />
                      {timeState.label}
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2 border-t border-slate-200 p-3 bg-slate-50/60">
                    <button onClick={() => openEdit(exam)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"><Pencil className="w-3.5 h-3.5" />Edit</button>
                    <button onClick={() => onDelete(exam)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" />Delete</button>
                    <button onClick={() => openAssign(exam)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"><UserPlus className="w-3.5 h-3.5" />Assign</button>
                    <button onClick={() => runTimeLimitCheck(exam)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"><Clock3 className="w-3.5 h-3.5" />Check</button>
                  </div>
                </article>
              );
            })}
          </section>
        </main>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">{editingExamId ? "Edit Exam" : "Create Exam"}</h2>
              <p className="text-sm text-slate-500">Set exam details and validate the time limit before saving.</p>
            </div>
            <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label><span className="text-xs font-semibold text-slate-600">Exam Type</span><select value={form.exam_type} onChange={(e) => {
                const nextType = e.target.value;
                setForm((prev) => ({ ...prev, exam_type: nextType, code: editingExamId ? prev.code : generateCode(nextType) }));
              }} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"><option value="assessment">Assessment</option><option value="practice">Practice</option></select></label>
              <label className="sm:col-span-2"><span className="text-xs font-semibold text-slate-600">Title</span><input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20" /></label>
              <label><span className="text-xs font-semibold text-slate-600">Subject</span><input value={form.subject} onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20" /></label>
              <label><span className="text-xs font-semibold text-slate-600">Time Limit (mins)</span><input type="number" min={10} max={300} value={form.duration_minutes} onChange={(e) => setForm((prev) => ({ ...prev, duration_minutes: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20" /></label>
              <label><span className="text-xs font-semibold text-slate-600">Attempt Limit</span><input type="number" min={0} value={form.attempt_limit} onChange={(e) => setForm((prev) => ({ ...prev, attempt_limit: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20" /></label>
              <label><span className="text-xs font-semibold text-slate-600">Lifecycle Status</span><select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"><option value="draft">Draft</option><option value="published">Published</option></select></label>
              <p className="sm:col-span-2 text-xs text-slate-500">Use 0 for unlimited attempts.</p>
              {error && <p className="sm:col-span-2 text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{error}</p>}
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={onSave} className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700">{editingExamId ? "Save Changes" : "Create Exam"}</button>
            </div>
          </div>
        </div>
      )}

      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Assign Exam</h2>
              <p className="text-sm text-slate-500">{assigningExam?.title}</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input type="radio" checked={assignmentMode === "all"} onChange={() => setAssignmentMode("all")} />
                  Assign to all students
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input type="radio" checked={assignmentMode === "specific"} onChange={() => setAssignmentMode("specific")} />
                  Assign to specific students
                </label>
              </div>
              {assignmentMode === "specific" && (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={assignmentSearch} onChange={(e) => setAssignmentSearch(e.target.value)} placeholder="Search by name, email, or roll number..." className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                  <div className="max-h-72 overflow-auto rounded-xl border border-slate-200">
                    {assignmentCandidates.length === 0 ? (
                      <p className="text-sm text-slate-500 p-3">No students found.</p>
                    ) : (
                      assignmentCandidates.map((student) => (
                        <label key={student.id} className="flex items-start gap-3 p-3 border-b last:border-b-0 border-slate-100 hover:bg-slate-50">
                          <input type="checkbox" checked={selectedStudentIds.includes(student.id)} onChange={() => toggleStudent(student.id)} className="mt-1" />
                          <span className="text-sm text-slate-700">
                            <strong>{student.name}</strong> ({student.roll_number})<br />
                            {student.email}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </>
              )}
              {assignmentError && <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{assignmentError}</p>}
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={closeAssignModal} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={saveAssignments} className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700">Save Assignment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
