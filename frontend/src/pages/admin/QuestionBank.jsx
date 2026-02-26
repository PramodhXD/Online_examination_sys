import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, PlusCircle, Rows3, Pencil, Trash2, Filter, X } from "lucide-react";
import Sidebar from "../../components/admin/layout/Sidebar";
import Header from "../../components/admin/layout/Header";
import adminService from "../../services/adminService";

const mkId = () => `Q-${Math.floor(Math.random() * 900 + 100)}`;
const row = () => ({ k: `${Date.now()}-${Math.random()}`, code: mkId(), question: "", explanation: "", a: "", b: "", c: "", d: "", ans: "" });
const singleEmpty = { code: "", examId: "", question: "", explanation: "", type: "MCQ", difficulty: "Easy", marks: 1, a: "", b: "", c: "", d: "", ans: "" };
const bulkEmpty = { examId: "", type: "MCQ", difficulty: "Easy", marks: 1, rows: [row(), row()] };

export default function QuestionBank() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [exams, setExams] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [examFilter, setExamFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("single");
  const [editing, setEditing] = useState(null);
  const [single, setSingle] = useState(singleEmpty);
  const [bulk, setBulk] = useState(bulkEmpty);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const examTitle = (id) => {
    const exam = exams.find((e) => String(e.id) === String(id));
    if (!exam) return "";
    const typeLabel = exam.exam_type === "practice" ? "Practice" : "Assessment";
    return `${exam.title} (${typeLabel})`;
  };

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [examData, questionData] = await Promise.all([
        adminService.getExams("", "all"),
        adminService.getQuestions({
          search: searchTerm || undefined,
          exam_id: examFilter === "all" ? undefined : Number(examFilter),
        }),
      ]);
      setExams(Array.isArray(examData) ? examData : []);
      setQuestions(Array.isArray(questionData) ? questionData : []);
    } catch (err) { void err;
      setQuestions([]);
      setExams([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, examFilter]);

  useEffect(() => {
    const t = setTimeout(loadAll, 250);
    return () => clearTimeout(t);
  }, [loadAll]);

  const list = useMemo(() => questions, [questions]);

  const close = () => {
    setOpen(false);
    setEditing(null);
    setMode("single");
    setSingle(singleEmpty);
    setBulk(bulkEmpty);
    setError("");
  };

  const openSingle = () => {
    setMode("single");
    setEditing(null);
    setSingle({ ...singleEmpty, code: mkId(), examId: exams[0]?.id ? String(exams[0].id) : "" });
    setError("");
    setOpen(true);
  };

  const openBulk = () => {
    setMode("bulk");
    setEditing(null);
    setBulk({ ...bulkEmpty, examId: exams[0]?.id ? String(exams[0].id) : "", rows: [row(), row()] });
    setError("");
    setOpen(true);
  };

  const openEdit = (q) => {
    setMode("single");
    setEditing(q);
    setSingle({
      code: q.code,
      examId: String(q.exam_id),
      question: q.question_text,
      explanation: q.explanation || "",
      type: q.question_type,
      difficulty: q.difficulty,
      marks: q.marks,
      a: q.options[0] || "",
      b: q.options[1] || "",
      c: q.options[2] || "",
      d: q.options[3] || "",
      ans: q.correct_answer,
    });
    setError("");
    setOpen(true);
  };

  const validateSingle = (f) => {
    if (!f.code.trim() || !f.examId || !f.question.trim()) return "Question code, exam and question are required.";
    if (Number(f.marks) <= 0) return "Marks must be greater than 0.";
    if (f.type === "MCQ") {
      const opts = [f.a, f.b, f.c, f.d];
      if (opts.some((x) => !x.trim())) return "All four options are required for MCQ.";
      if (!opts.includes(f.ans)) return "Correct answer must match one option.";
    } else if (!f.ans.trim()) return "Answer is required.";
    return "";
  };

  const saveSingle = async () => {
    const v = validateSingle(single);
    if (v) return setError(v);
    const payload = {
      code: single.code.trim(),
      exam_id: Number(single.examId),
      question_text: single.question.trim(),
      question_type: single.type,
      difficulty: single.difficulty,
      marks: Number(single.marks),
      option_1: single.type === "MCQ" ? single.a.trim() : null,
      option_2: single.type === "MCQ" ? single.b.trim() : null,
      option_3: single.type === "MCQ" ? single.c.trim() : null,
      option_4: single.type === "MCQ" ? single.d.trim() : null,
      correct_answer: single.ans.trim(),
      explanation: single.explanation.trim() || null,
    };
    try {
      if (editing) {
        await adminService.updateQuestion(editing.id, {
          question_text: payload.question_text,
          question_type: payload.question_type,
          difficulty: payload.difficulty,
          marks: payload.marks,
          option_1: payload.option_1,
          option_2: payload.option_2,
          option_3: payload.option_3,
          option_4: payload.option_4,
          correct_answer: payload.correct_answer,
          explanation: payload.explanation,
        });
      } else {
        await adminService.createQuestion(payload);
      }
      await loadAll();
      close();
    } catch (err) { void err;
      setError(err?.response?.data?.detail || "Save failed");
    }
  };

  const saveBulk = async () => {
    if (!bulk.examId) return setError("Select exam for bulk add.");
    if (Number(bulk.marks) <= 0) return setError("Marks must be greater than 0.");
    const items = [];
    for (let i = 0; i < bulk.rows.length; i += 1) {
      const r = bulk.rows[i];
      if (!r.code.trim() || !r.question.trim()) return setError(`Row ${i + 1}: code and question are required.`);
      if (bulk.type === "MCQ") {
        const opts = [r.a, r.b, r.c, r.d];
        if (opts.some((x) => !x.trim())) return setError(`Row ${i + 1}: all MCQ options are required.`);
        if (!opts.includes(r.ans)) return setError(`Row ${i + 1}: answer must match an option.`);
      } else if (!r.ans.trim()) return setError(`Row ${i + 1}: answer is required.`);

      items.push({
        code: r.code.trim(),
        exam_id: Number(bulk.examId),
        question_text: r.question.trim(),
        question_type: bulk.type,
        difficulty: bulk.difficulty,
        marks: Number(bulk.marks),
        option_1: bulk.type === "MCQ" ? r.a.trim() : null,
        option_2: bulk.type === "MCQ" ? r.b.trim() : null,
        option_3: bulk.type === "MCQ" ? r.c.trim() : null,
        option_4: bulk.type === "MCQ" ? r.d.trim() : null,
        correct_answer: r.ans.trim(),
        explanation: r.explanation.trim() || null,
      });
    }
    try {
      await adminService.createQuestionsBulk(items);
      await loadAll();
      close();
    } catch (err) { void err;
      setError(err?.response?.data?.detail || "Bulk save failed");
    }
  };

  const remove = async (questionId) => {
    if (!window.confirm("Delete this question?")) return;
    try {
      await adminService.deleteQuestion(questionId);
      await loadAll();
    } catch { void 0; }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#0f172a] to-[#1e293b]">
      <Sidebar activeTab="questions" isOpen={isSidebarOpen} />
      <div className={`min-h-screen min-w-0 flex flex-col transition-all duration-300 ${isSidebarOpen ? "lg:pl-64" : "lg:pl-20"}`}>
        <Header activeTab="questions" toggleSidebar={() => setIsSidebarOpen((p) => !p)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by code, question or exam..." className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <Filter className="w-4 h-4 text-slate-500" />
                <select value={examFilter} onChange={(e) => setExamFilter(e.target.value)} className="bg-transparent text-sm outline-none">
                  <option value="all">All Exams</option>
                  {exams.map((e) => <option key={e.id} value={String(e.id)}>{examTitle(e.id)}</option>)}
                </select>
              </div>
              <button onClick={openSingle} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"><PlusCircle className="w-4 h-4" />Add Question</button>
              <button onClick={openBulk} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100"><Rows3 className="w-4 h-4" />Add Multiple</button>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Question</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Exam</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Type</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Difficulty</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Marks</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading && <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-500">Loading questions...</td></tr>}
                  {!loading && list.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-4"><p className="text-sm font-semibold">{q.code}</p><p className="text-sm text-slate-600">{q.question_text}</p></td>
                      <td className="px-6 py-4 text-sm">{examTitle(q.exam_id) || q.exam_title || "Unknown Exam"}</td>
                      <td className="px-6 py-4 text-sm">{q.question_type}</td>
                      <td className="px-6 py-4 text-sm">{q.difficulty}</td>
                      <td className="px-6 py-4 text-sm">{q.marks}</td>
                      <td className="px-6 py-4"><div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(q)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100"><Pencil className="w-3.5 h-3.5" />Edit</button>
                        <button onClick={() => remove(q.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" />Delete</button>
                      </div></td>
                    </tr>
                  ))}
                  {!loading && list.length === 0 && <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-500">No questions found.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 text-sm text-slate-600">Total Questions: {list.length}</div>
          </section>
        </main>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="min-h-full flex items-start sm:items-center justify-center py-4">
            <div className="w-full max-w-4xl bg-white rounded-2xl border border-slate-200 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                <h2 className="text-lg font-bold">{editing ? "Edit Question" : mode === "bulk" ? "Add Multiple Questions" : "Add Question"}</h2>
                {!editing && <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50">
                  <button onClick={() => { setMode("single"); setError(""); }} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${mode === "single" ? "bg-white shadow-sm" : "text-slate-600"}`}>Single</button>
                  <button onClick={() => { setMode("bulk"); setError(""); }} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${mode === "bulk" ? "bg-white shadow-sm" : "text-slate-600"}`}>Bulk</button>
                </div>}
              </div>

              <div className="px-6 py-5 overflow-y-auto flex-1 min-h-0 space-y-4">
                {mode === "single" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input placeholder="Question Code" value={single.code} onChange={(e) => setSingle((p) => ({ ...p, code: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                    <select value={single.examId} onChange={(e) => setSingle((p) => ({ ...p, examId: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">Select Exam</option>{exams.map((e) => <option key={e.id} value={String(e.id)}>{examTitle(e.id)}</option>)}</select>
                    <textarea rows={3} placeholder="Question text" value={single.question} onChange={(e) => setSingle((p) => ({ ...p, question: e.target.value }))} className="sm:col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none" />
                    <textarea rows={3} placeholder="Explanation (shown in Practice)" value={single.explanation} onChange={(e) => setSingle((p) => ({ ...p, explanation: e.target.value }))} className="sm:col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none" />
                    <select value={single.type} onChange={(e) => setSingle((p) => ({ ...p, type: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="MCQ">MCQ</option><option value="Short Answer">Short Answer</option></select>
                    <select value={single.difficulty} onChange={(e) => setSingle((p) => ({ ...p, difficulty: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option></select>
                    <input type="number" min={1} value={single.marks} onChange={(e) => setSingle((p) => ({ ...p, marks: e.target.value }))} placeholder="Marks" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                    {single.type === "MCQ" && <>
                      <input placeholder="Option A" value={single.a} onChange={(e) => setSingle((p) => ({ ...p, a: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                      <input placeholder="Option B" value={single.b} onChange={(e) => setSingle((p) => ({ ...p, b: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                      <input placeholder="Option C" value={single.c} onChange={(e) => setSingle((p) => ({ ...p, c: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                      <input placeholder="Option D" value={single.d} onChange={(e) => setSingle((p) => ({ ...p, d: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                    </>}
                    <input placeholder={single.type === "MCQ" ? "Correct Answer (must match option)" : "Answer"} value={single.ans} onChange={(e) => setSingle((p) => ({ ...p, ans: e.target.value }))} className="sm:col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  </div>
                )}

                {mode === "bulk" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <select value={bulk.examId} onChange={(e) => setBulk((p) => ({ ...p, examId: e.target.value }))} className="sm:col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">Select Exam</option>{exams.map((e) => <option key={e.id} value={String(e.id)}>{examTitle(e.id)}</option>)}</select>
                      <select value={bulk.type} onChange={(e) => setBulk((p) => ({ ...p, type: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="MCQ">MCQ</option><option value="Short Answer">Short Answer</option></select>
                      <select value={bulk.difficulty} onChange={(e) => setBulk((p) => ({ ...p, difficulty: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option></select>
                      <input type="number" min={1} value={bulk.marks} onChange={(e) => setBulk((p) => ({ ...p, marks: e.target.value }))} placeholder="Marks" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                    </div>
                    {bulk.rows.map((r, i) => (
                      <div key={r.k} className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-xs font-semibold text-slate-600">Row {i + 1}</p>
                          <button onClick={() => setBulk((p) => ({ ...p, rows: p.rows.length === 1 ? p.rows : p.rows.filter((x) => x.k !== r.k) }))} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-600"><X className="w-3.5 h-3.5" />Remove</button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input placeholder="Question Code" value={r.code} onChange={(e) => setBulk((p) => ({ ...p, rows: p.rows.map((x) => (x.k === r.k ? { ...x, code: e.target.value } : x)) }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                          <textarea rows={2} placeholder="Question text" value={r.question} onChange={(e) => setBulk((p) => ({ ...p, rows: p.rows.map((x) => (x.k === r.k ? { ...x, question: e.target.value } : x)) }))} className="sm:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none" />
                          <textarea rows={2} placeholder="Explanation (shown in Practice)" value={r.explanation} onChange={(e) => setBulk((p) => ({ ...p, rows: p.rows.map((x) => (x.k === r.k ? { ...x, explanation: e.target.value } : x)) }))} className="sm:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none" />
                          {bulk.type === "MCQ" && <>
                            <input placeholder="Option A" value={r.a} onChange={(e) => setBulk((p) => ({ ...p, rows: p.rows.map((x) => (x.k === r.k ? { ...x, a: e.target.value } : x)) }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                            <input placeholder="Option B" value={r.b} onChange={(e) => setBulk((p) => ({ ...p, rows: p.rows.map((x) => (x.k === r.k ? { ...x, b: e.target.value } : x)) }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                            <input placeholder="Option C" value={r.c} onChange={(e) => setBulk((p) => ({ ...p, rows: p.rows.map((x) => (x.k === r.k ? { ...x, c: e.target.value } : x)) }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                            <input placeholder="Option D" value={r.d} onChange={(e) => setBulk((p) => ({ ...p, rows: p.rows.map((x) => (x.k === r.k ? { ...x, d: e.target.value } : x)) }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                          </>}
                          <input placeholder={bulk.type === "MCQ" ? "Correct Answer" : "Answer"} value={r.ans} onChange={(e) => setBulk((p) => ({ ...p, rows: p.rows.map((x) => (x.k === r.k ? { ...x, ans: e.target.value } : x)) }))} className="sm:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                        </div>
                      </div>
                    ))}
                    <button onClick={() => setBulk((p) => ({ ...p, rows: [...p.rows, row()] }))} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold hover:bg-slate-50"><PlusCircle className="w-4 h-4" />Add Another Row</button>
                  </div>
                )}
                {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{error}</p>}
              </div>

              <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 shrink-0">
                <button onClick={close} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold hover:bg-slate-50">Cancel</button>
                <button onClick={mode === "bulk" ? saveBulk : saveSingle} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">{mode === "bulk" ? "Add All Questions" : editing ? "Save Changes" : "Add Question"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



