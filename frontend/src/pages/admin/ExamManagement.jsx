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

const emptyProgrammingForm = {
  title: "",
  description: "",
  duration_minutes: 90,
  status: "draft",
  problem: {
    title: "",
    difficulty: "Easy",
    statement: "",
    input_format: "",
    output_format: "",
    constraints: "",
    sample_input: "",
    sample_output: "",
    starter_code: "",
  },
  sample_tests: [{ input_data: "", expected_output: "", marks: 1 }],
  hidden_tests: [{ input_data: "", expected_output: "", marks: 1 }],
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
  draft: "bg-slate-100 text-slate-700 dark:text-slate-200",
  published: "bg-blue-100 text-blue-700",
  live: "bg-green-100 text-green-700",
  completed: "bg-orange-100 text-orange-700",
};

const typeStyles = {
  assessment: "bg-indigo-100 text-indigo-700",
  practice: "bg-emerald-100 text-emerald-700",
  programming: "bg-fuchsia-100 text-fuchsia-700",
};

function generateCode(examType = "assessment") {
  const prefix = examType === "practice" ? "PRC" : (examType === "programming" ? "PRG" : "ASM");
  return `${prefix}-${Math.floor(Math.random() * 900 + 100)}`;
}

function mapProgrammingExamToCard(exam) {
  return {
    id: exam.id,
    code: `PRG-${String(exam.id).padStart(3, "0")}`,
    exam_type: "programming",
    title: exam.title,
    subject: exam.description || "Programming",
    exam_date: exam.created_at,
    duration_minutes: exam.duration_minutes,
    attempt_limit: null,
    assigned_students: exam.assigned_students ?? 0,
    status: exam.status || "draft",
    total_marks: exam.total_marks ?? 0,
  };
}

export default function ExamManagement() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [exams, setExams] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [examTypeFilter, setExamTypeFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [programmingForm, setProgrammingForm] = useState(emptyProgrammingForm);
  const [error, setError] = useState("");

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigningExam, setAssigningExam] = useState(null);
  const [assignmentMode, setAssignmentMode] = useState("all");
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [assignmentCandidates, setAssignmentCandidates] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [assignmentError, setAssignmentError] = useState("");
  const [deletingExam, setDeletingExam] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const loadExams = useCallback(async () => {
    try {
      if (examTypeFilter === "programming") {
        const programming = await adminService.getProgrammingExams(searchTerm);
        const mapped = Array.isArray(programming) ? programming.map(mapProgrammingExamToCard) : [];
        setExams(mapped);
        return;
      }

      if (examTypeFilter === "all") {
        const [regular, programming] = await Promise.all([
          adminService.getExams(searchTerm, "all"),
          adminService.getProgrammingExams(searchTerm),
        ]);
        const mappedRegular = Array.isArray(regular) ? regular : [];
        const mappedProgramming = Array.isArray(programming) ? programming.map(mapProgrammingExamToCard) : [];
        const combined = [...mappedRegular, ...mappedProgramming].sort(
          (a, b) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime()
        );
        setExams(combined);
        return;
      }

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

  const loadAssignments = useCallback(async (examId, search = "", examType = "assessment") => {
    const data = examType === "programming"
      ? await adminService.getProgrammingExamAssignments(examId, search)
      : await adminService.getExamAssignments(examId, search);
    setAssignmentMode(data.assignment_mode || "all");
    setAssignmentCandidates(Array.isArray(data.candidates) ? data.candidates : []);
    setSelectedStudentIds((data.selected_students || []).map((student) => student.id));
  }, []);

  useEffect(() => {
    if (!isAssignModalOpen || !assigningExam) return;
    const t = setTimeout(async () => {
      try {
        await loadAssignments(assigningExam.id, assignmentSearch, assigningExam.exam_type);
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
    setProgrammingForm({ ...emptyProgrammingForm });
    setError("");
    setIsModalOpen(true);
  };

  const openEdit = async (exam) => {
    setEditingExamId(exam.id);
    if (exam.exam_type === "programming") {
      try {
        const detail = await adminService.getProgrammingExam(exam.id);
        const problem = detail.problem || {};
        const cases = Array.isArray(problem.test_cases) ? problem.test_cases : [];
        const sampleTests = cases.filter((c) => c.is_sample).map((c) => ({
          input_data: c.input_data,
          expected_output: c.expected_output,
          marks: c.marks ?? 1,
        }));
        const hiddenTests = cases.filter((c) => !c.is_sample).map((c) => ({
          input_data: c.input_data,
          expected_output: c.expected_output,
          marks: c.marks ?? 1,
        }));
        setForm((prev) => ({ ...prev, exam_type: "programming", code: exam.code }));
        setProgrammingForm({
          title: detail.title || "",
          description: detail.description || "",
          duration_minutes: detail.duration_minutes ?? 90,
          status: (detail.status || "draft").toLowerCase(),
          problem: {
            title: problem.title || "",
            difficulty: problem.difficulty || "Easy",
            statement: problem.statement || "",
            input_format: problem.input_format || "",
            output_format: problem.output_format || "",
            constraints: problem.constraints || "",
            sample_input: problem.sample_input || "",
            sample_output: problem.sample_output || "",
            starter_code: problem.starter_code || "",
          },
          sample_tests: sampleTests.length ? sampleTests : [{ input_data: "", expected_output: "", marks: 1 }],
          hidden_tests: hiddenTests.length ? hiddenTests : [{ input_data: "", expected_output: "", marks: 1 }],
        });
      } catch (err) {
        void err;
        setError("Failed to load programming exam.");
      }
    } else {
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
    }
    setError("");
    setIsModalOpen(true);
  };

  const openAssign = async (exam) => {
    setAssigningExam(exam);
    setAssignmentSearch("");
    setAssignmentError("");
    setIsAssignModalOpen(true);
    try {
      await loadAssignments(exam.id, "", exam.exam_type);
    } catch (err) {
      setAssignmentError(err?.response?.data?.detail || "Failed to load assignments");
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingExamId(null);
    setForm(emptyForm);
    setProgrammingForm(emptyProgrammingForm);
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

  const openDeleteModal = (exam) => {
    setDeletingExam(exam);
    setDeleteError("");
  };

  const closeDeleteModal = () => {
    setDeletingExam(null);
    setDeleteError("");
  };

  const normalizeTestRows = (rows) => rows
    .map((row) => ({
      input_data: row.input_data || "",
      expected_output: row.expected_output || "",
      marks: Number(row.marks || 1),
    }))
    .filter((row) => row.input_data.trim() || row.expected_output.trim());

  const saveProgrammingExam = async () => {
    const examTitle = programmingForm.title.trim();
    const problem = programmingForm.problem;
    const problemTitle = problem.title.trim();
    const statement = problem.statement.trim();
    if (!examTitle) {
      setError("Programming exam title is required.");
      return;
    }
    if (!statement) {
      setError("Problem statement is required.");
      return;
    }
    const sampleTests = normalizeTestRows(programmingForm.sample_tests).map((row) => ({ ...row, is_sample: true }));
    const hiddenTests = normalizeTestRows(programmingForm.hidden_tests).map((row) => ({ ...row, is_sample: false }));
    const allTests = [...sampleTests, ...hiddenTests];
    if (allTests.length === 0) {
      setError("Add at least one test case.");
      return;
    }
    if (allTests.some((t) => !Number.isInteger(t.marks) || t.marks < 1)) {
      setError("Test case marks must be a positive integer.");
      return;
    }

    const payload = {
      title: examTitle,
      description: programmingForm.description.trim(),
      duration_minutes: Number(programmingForm.duration_minutes || 90),
      status: programmingForm.status,
      problem: {
        title: problemTitle || "Programming Problem",
        difficulty: problem.difficulty || "Easy",
        statement,
        input_format: problem.input_format || "",
        output_format: problem.output_format || "",
        constraints: problem.constraints || "",
        sample_input: problem.sample_input || "",
        sample_output: problem.sample_output || "",
        starter_code: problem.starter_code || "",
        test_cases: allTests,
      },
    };

    try {
      if (editingExamId) {
        await adminService.updateProgrammingExam(editingExamId, payload);
      } else {
        await adminService.createProgrammingExam(payload);
      }
      await loadExams();
      closeModal();
    } catch (err) {
      setError(err?.response?.data?.detail || "Save failed");
    }
  };

  const onSave = async () => {
    if (form.exam_type === "programming") {
      await saveProgrammingExam();
      return;
    }
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
      const payload = {
        assignment_mode: assignmentMode,
        student_ids: assignmentMode === "specific" ? selectedStudentIds : [],
      };
      if (assigningExam.exam_type === "programming") {
        await adminService.updateProgrammingExamAssignments(assigningExam.id, payload);
      } else {
        await adminService.updateExamAssignments(assigningExam.id, payload);
      }
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

  const confirmDelete = async () => {
    if (!deletingExam) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      if (deletingExam.exam_type === "programming") {
        await adminService.deleteProgrammingExam(deletingExam.id);
      } else {
        await adminService.deleteExam(deletingExam.id);
      }
      await loadExams();
      closeDeleteModal();
    } catch (err) {
      setDeleteError(err?.response?.data?.detail || "Failed to delete exam.");
    } finally {
      setIsDeleting(false);
    }
  };

  const runTimeLimitCheck = async (exam) => {
    if (exam.exam_type === "programming") {
      return;
    }
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
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 md:p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search exams..." className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <select value={examTypeFilter} onChange={(e) => setExamTypeFilter(e.target.value)} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20">
                <option value="all">All Types</option>
                <option value="assessment">Assessment</option>
                <option value="practice">Practice</option>
                <option value="programming">Programming</option>
              </select>
              <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-lg shadow-blue-900/20">
                <PlusCircle className="w-4 h-4" />
                Create New Exam
              </button>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {filteredExams.length === 0 && <div className="md:col-span-2 xl:col-span-4 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-600">No exams found.</div>}
            {filteredExams.map((exam) => {
              const timeState = getTimeLimitState(exam.duration_minutes);
              const TimeIcon = timeState.icon;
              return (
                <article key={exam.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                  <div className="p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${statusStyles[exam.status] || statusStyles.draft}`}>{exam.status}</span>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${typeStyles[exam.exam_type] || typeStyles.assessment}`}>{exam.exam_type || "assessment"}</span>
                    </div>
                    <div><h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight">{exam.title}</h3><p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{exam.subject}</p></div>
                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400" /><span>{formatDate(exam.exam_date)}</span></div>
                      <div className="flex items-center gap-2"><Clock3 className="w-4 h-4 text-slate-400" /><span>{exam.duration_minutes} mins</span></div>
                      {exam.exam_type === "programming" ? (
                        <>
                          <div className="flex items-center gap-2"><Pencil className="w-4 h-4 text-slate-400" /><span>Total marks: {exam.total_marks ?? 0}</span></div>
                          <div className="flex items-center gap-2"><Users className="w-4 h-4 text-slate-400" /><span>{exam.assigned_students} students assigned</span></div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2"><Pencil className="w-4 h-4 text-slate-400" /><span>Attempt limit: {formatAttemptLimit(exam.attempt_limit)}</span></div>
                          <div className="flex items-center gap-2"><Users className="w-4 h-4 text-slate-400" /><span>{exam.assigned_students} students assigned</span></div>
                        </>
                      )}
                    </div>
                    {exam.exam_type !== "programming" && (
                      <button onClick={() => runTimeLimitCheck(exam)} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${timeState.className}`}>
                        <TimeIcon className="w-3.5 h-3.5" />
                        {timeState.label}
                      </button>
                    )}
                  </div>
                  <div className={`grid ${exam.exam_type === "programming" ? "grid-cols-3" : "grid-cols-4"} gap-2 border-t border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-800/60`}>
                    <button onClick={() => openEdit(exam)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"><Pencil className="w-3.5 h-3.5" />Edit</button>
                    <button onClick={() => openDeleteModal(exam)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" />Delete</button>
                    {exam.exam_type === "programming" && (
                      <button onClick={() => openAssign(exam)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"><UserPlus className="w-3.5 h-3.5" />Assign</button>
                    )}
                    {exam.exam_type !== "programming" && (
                      <>
                        <button onClick={() => openAssign(exam)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"><UserPlus className="w-3.5 h-3.5" />Assign</button>
                        <button onClick={() => runTimeLimitCheck(exam)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"><Clock3 className="w-3.5 h-3.5" />Check</button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        </main>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-lg max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{editingExamId ? "Edit Exam" : "Create Exam"}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {form.exam_type === "programming"
                  ? "Set programming exam details, problem statement, and test cases."
                  : "Set exam details and validate the time limit before saving."}
              </p>
            </div>
            <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto">
              <label><span className="text-xs font-semibold text-slate-600">Exam Type</span><select value={form.exam_type} onChange={(e) => {
                const nextType = e.target.value;
                setForm((prev) => ({ ...prev, exam_type: nextType, code: editingExamId ? prev.code : generateCode(nextType) }));
                if (nextType === "programming") {
                  setProgrammingForm({ ...emptyProgrammingForm });
                }
              }} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20"><option value="assessment">Assessment</option><option value="practice">Practice</option><option value="programming">Programming</option></select></label>
              {form.exam_type !== "programming" ? (
                <>
                  <label className="sm:col-span-2"><span className="text-xs font-semibold text-slate-600">Title</span><input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20" /></label>
                  <label><span className="text-xs font-semibold text-slate-600">Subject</span><input value={form.subject} onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20" /></label>
                  <label><span className="text-xs font-semibold text-slate-600">Time Limit (mins)</span><input type="number" min={10} max={300} value={form.duration_minutes} onChange={(e) => setForm((prev) => ({ ...prev, duration_minutes: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20" /></label>
                  <label><span className="text-xs font-semibold text-slate-600">Attempt Limit</span><input type="number" min={0} value={form.attempt_limit} onChange={(e) => setForm((prev) => ({ ...prev, attempt_limit: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20" /></label>
                  <label><span className="text-xs font-semibold text-slate-600">Lifecycle Status</span><select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20"><option value="draft">Draft</option><option value="published">Published</option></select></label>
                  <p className="sm:col-span-2 text-xs text-slate-500 dark:text-slate-400">Use 0 for unlimited attempts.</p>
                </>
              ) : (
                <>
                  <label className="sm:col-span-2"><span className="text-xs font-semibold text-slate-600">Exam Title</span><input value={programmingForm.title} onChange={(e) => setProgrammingForm((prev) => ({ ...prev, title: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20" /></label>
                  <label className="sm:col-span-2"><span className="text-xs font-semibold text-slate-600">Description</span><input value={programmingForm.description} onChange={(e) => setProgrammingForm((prev) => ({ ...prev, description: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20" /></label>
                  <label><span className="text-xs font-semibold text-slate-600">Time Limit (mins)</span><input type="number" min={30} max={300} value={programmingForm.duration_minutes} onChange={(e) => setProgrammingForm((prev) => ({ ...prev, duration_minutes: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20" /></label>
                  <label><span className="text-xs font-semibold text-slate-600">Lifecycle Status</span><select value={programmingForm.status} onChange={(e) => setProgrammingForm((prev) => ({ ...prev, status: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20"><option value="draft">Draft</option><option value="published">Published</option></select></label>

                  <div className="sm:col-span-2 border-t border-slate-200 dark:border-slate-700 pt-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Programming Problem</div>
                  <label className="sm:col-span-2"><span className="text-xs font-semibold text-slate-600">Problem Title</span><input value={programmingForm.problem.title} onChange={(e) => setProgrammingForm((prev) => ({ ...prev, problem: { ...prev.problem, title: e.target.value } }))} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20" /></label>
                  <label><span className="text-xs font-semibold text-slate-600">Difficulty</span><select value={programmingForm.problem.difficulty} onChange={(e) => setProgrammingForm((prev) => ({ ...prev, problem: { ...prev.problem, difficulty: e.target.value } }))} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20"><option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option></select></label>
                  <label className="sm:col-span-2"><span className="text-xs font-semibold text-slate-600">Statement</span><textarea value={programmingForm.problem.statement} onChange={(e) => setProgrammingForm((prev) => ({ ...prev, problem: { ...prev.problem, statement: e.target.value } }))} rows={4} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20" /></label>
                  <label className="sm:col-span-2"><span className="text-xs font-semibold text-slate-600">Input Format</span><textarea value={programmingForm.problem.input_format} onChange={(e) => setProgrammingForm((prev) => ({ ...prev, problem: { ...prev.problem, input_format: e.target.value } }))} rows={2} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20" /></label>
                  <label className="sm:col-span-2"><span className="text-xs font-semibold text-slate-600">Output Format</span><textarea value={programmingForm.problem.output_format} onChange={(e) => setProgrammingForm((prev) => ({ ...prev, problem: { ...prev.problem, output_format: e.target.value } }))} rows={2} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20" /></label>
                  <label className="sm:col-span-2"><span className="text-xs font-semibold text-slate-600">Constraints</span><textarea value={programmingForm.problem.constraints} onChange={(e) => setProgrammingForm((prev) => ({ ...prev, problem: { ...prev.problem, constraints: e.target.value } }))} rows={2} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20" /></label>
                  <label className="sm:col-span-2"><span className="text-xs font-semibold text-slate-600">Sample Input</span><textarea value={programmingForm.problem.sample_input} onChange={(e) => setProgrammingForm((prev) => ({ ...prev, problem: { ...prev.problem, sample_input: e.target.value } }))} rows={2} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 font-mono" /></label>
                  <label className="sm:col-span-2"><span className="text-xs font-semibold text-slate-600">Sample Output</span><textarea value={programmingForm.problem.sample_output} onChange={(e) => setProgrammingForm((prev) => ({ ...prev, problem: { ...prev.problem, sample_output: e.target.value } }))} rows={2} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 font-mono" /></label>
                  <label className="sm:col-span-2"><span className="text-xs font-semibold text-slate-600">Starter Code</span><textarea value={programmingForm.problem.starter_code} onChange={(e) => setProgrammingForm((prev) => ({ ...prev, problem: { ...prev.problem, starter_code: e.target.value } }))} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 font-mono" /></label>

                  <div className="sm:col-span-2 border-t border-slate-200 dark:border-slate-700 pt-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Sample Test Cases</div>
                  {programmingForm.sample_tests.map((row, idx) => (
                    <div key={`sample-${idx}`} className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <textarea value={row.input_data} onChange={(e) => setProgrammingForm((prev) => {
                        const next = [...prev.sample_tests];
                        next[idx] = { ...next[idx], input_data: e.target.value };
                        return { ...prev, sample_tests: next };
                      })} rows={2} placeholder="Input" className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 font-mono" />
                      <textarea value={row.expected_output} onChange={(e) => setProgrammingForm((prev) => {
                        const next = [...prev.sample_tests];
                        next[idx] = { ...next[idx], expected_output: e.target.value };
                        return { ...prev, sample_tests: next };
                      })} rows={2} placeholder="Expected Output" className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 font-mono" />
                      <div className="flex items-center gap-2">
                        <input type="number" min={1} value={row.marks} onChange={(e) => setProgrammingForm((prev) => {
                          const next = [...prev.sample_tests];
                          next[idx] = { ...next[idx], marks: e.target.value };
                          return { ...prev, sample_tests: next };
                        })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20" />
                        <button type="button" onClick={() => setProgrammingForm((prev) => {
                          const next = prev.sample_tests.filter((_, i) => i !== idx);
                          return { ...prev, sample_tests: next.length ? next : [{ input_data: "", expected_output: "", marks: 1 }] };
                        })} className="text-xs text-red-600 hover:text-red-700">Remove</button>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => setProgrammingForm((prev) => ({ ...prev, sample_tests: [...prev.sample_tests, { input_data: "", expected_output: "", marks: 1 }] }))} className="sm:col-span-2 inline-flex items-center justify-center px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">Add Sample Test</button>

                  <div className="sm:col-span-2 border-t border-slate-200 dark:border-slate-700 pt-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Hidden Test Cases</div>
                  {programmingForm.hidden_tests.map((row, idx) => (
                    <div key={`hidden-${idx}`} className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <textarea value={row.input_data} onChange={(e) => setProgrammingForm((prev) => {
                        const next = [...prev.hidden_tests];
                        next[idx] = { ...next[idx], input_data: e.target.value };
                        return { ...prev, hidden_tests: next };
                      })} rows={2} placeholder="Input" className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 font-mono" />
                      <textarea value={row.expected_output} onChange={(e) => setProgrammingForm((prev) => {
                        const next = [...prev.hidden_tests];
                        next[idx] = { ...next[idx], expected_output: e.target.value };
                        return { ...prev, hidden_tests: next };
                      })} rows={2} placeholder="Expected Output" className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 font-mono" />
                      <div className="flex items-center gap-2">
                        <input type="number" min={1} value={row.marks} onChange={(e) => setProgrammingForm((prev) => {
                          const next = [...prev.hidden_tests];
                          next[idx] = { ...next[idx], marks: e.target.value };
                          return { ...prev, hidden_tests: next };
                        })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20" />
                        <button type="button" onClick={() => setProgrammingForm((prev) => {
                          const next = prev.hidden_tests.filter((_, i) => i !== idx);
                          return { ...prev, hidden_tests: next.length ? next : [{ input_data: "", expected_output: "", marks: 1 }] };
                        })} className="text-xs text-red-600 hover:text-red-700">Remove</button>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => setProgrammingForm((prev) => ({ ...prev, hidden_tests: [...prev.hidden_tests, { input_data: "", expected_output: "", marks: 1 }] }))} className="sm:col-span-2 inline-flex items-center justify-center px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">Add Hidden Test</button>
                </>
              )}
              {error && <p className="sm:col-span-2 text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{error}</p>}
            </div>
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
              {form.exam_type === "programming" && editingExamId && (
                <button
                  onClick={() => {
                    closeModal();
                    openAssign({
                      id: editingExamId,
                      exam_type: "programming",
                      title: programmingForm.title || "Programming Exam",
                    });
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800"
                >
                  Assign Students
                </button>
              )}
              <button onClick={closeModal} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800">Cancel</button>
              <button onClick={onSave} className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700">{editingExamId ? "Save Changes" : "Create Exam"}</button>
            </div>
          </div>
        </div>
      )}

      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Assign Exam</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{assigningExam?.title}</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <input type="radio" checked={assignmentMode === "all"} onChange={() => setAssignmentMode("all")} />
                  Assign to all students
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <input type="radio" checked={assignmentMode === "specific"} onChange={() => setAssignmentMode("specific")} />
                  Assign to specific students
                </label>
              </div>
              {assignmentMode === "specific" && (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={assignmentSearch} onChange={(e) => setAssignmentSearch(e.target.value)} placeholder="Search by name, email, or roll number..." className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                  <div className="max-h-72 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
                    {assignmentCandidates.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400 p-3">No students found.</p>
                    ) : (
                      assignmentCandidates.map((student) => (
                        <label key={student.id} className="flex items-start gap-3 p-3 border-b last:border-b-0 border-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800">
                          <input type="checkbox" checked={selectedStudentIds.includes(student.id)} onChange={() => toggleStudent(student.id)} className="mt-1" />
                          <span className="text-sm text-slate-700 dark:text-slate-200">
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
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
              <button onClick={closeAssignModal} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800">Cancel</button>
              <button onClick={saveAssignments} className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700">Save Assignment</button>
            </div>
          </div>
        </div>
      )}

      {deletingExam && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Delete Exam</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Remove this {deletingExam.exam_type || "assessment"} exam from the system.
              </p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                <p className="font-semibold text-slate-900 dark:text-slate-100">{deletingExam.title}</p>
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  This action cannot be undone.
                </p>
              </div>
              {deleteError && <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{deleteError}</p>}
            </div>
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
              <button onClick={closeDeleteModal} disabled={isDeleting} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 disabled:opacity-60">
                Cancel
              </button>
              <button onClick={confirmDelete} disabled={isDeleting} className="px-4 py-2 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                {isDeleting ? "Deleting..." : "Delete Exam"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

