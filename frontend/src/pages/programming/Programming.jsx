import { FileCode2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/dashboard/layout/DashboardLayout";
import programmingExamService from "../../services/programmingExamService";

export default function Programming() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const loadExams = async () => {
      try {
        setLoading(true);
        setLoadError("");
        const data = await programmingExamService.getExams();
        setExams(Array.isArray(data) ? data : []);
      } catch (error) {
        const message =
          error?.response?.data?.detail ||
          error?.response?.data?.message ||
          error?.message ||
          "Unable to load programming exams.";
        setLoadError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadExams();
  }, []);

  return (
    <DashboardLayout title="Programming">
      <div className="max-w-7xl mx-auto space-y-8">
        <section className="rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-50 via-white to-cyan-50 p-6 md:p-8 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
          <p className="text-xs font-semibold tracking-wide uppercase text-blue-700 dark:text-blue-300">Programming Zone</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">Practice. Build. Improve.</h2>
          <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
            Use this space to improve coding fundamentals, solve challenges, and practice implementation with real-time feedback.
          </p>
          <div className="mt-5">
            <button
              type="button"
              onClick={() => navigate("/code-editor")}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Open Code Lab
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Available Programming Exams</h3>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              Loading exams...
            </div>
          ) : loadError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm dark:border-rose-700/50 dark:bg-rose-900/30 dark:text-rose-100">
              {loadError}
            </div>
          ) : exams.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              No programming exams are available yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {exams.map((exam) => (
                <button
                  key={exam.id}
                  type="button"
                  onClick={() => navigate(`/programming-exam/${exam.id}`)}
                  className="group flex w-full flex-col items-start gap-4 rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50/30 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500/60"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                    <FileCode2 className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{exam.title}</h3>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      {exam.description || "Timed programming assessment."}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                        {exam.duration_minutes} mins
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-blue-600 transition group-hover:translate-x-1">
                    Precheck and Start {"->"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

      </div>
    </DashboardLayout>
  );
}
