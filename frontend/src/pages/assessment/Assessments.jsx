import { useEffect, useState } from "react";
import { Layers, ClipboardCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/dashboard/layout/DashboardLayout";
import assessmentService from "../../services/assessmentService";

function isUnlimitedAttemptLimit(limit) {
  return Number(limit) === 0;
}

export default function Assessments() {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState([]);

  useEffect(() => {
    const fetchAssessments = async () => {
      try {
        const data = await assessmentService.getAssessments();
        setAssessments(data);
      } catch {
        void 0;
      }
    };

    fetchAssessments();
  }, []);

  const getIcon = (title) => {
    if (title.toLowerCase().includes("technical")) return ClipboardCheck;
    return Layers;
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-gray-900">Assessments</h2>
          <p className="text-gray-600 mt-2">Take official assessments to evaluate your performance.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {assessments.map((exam) => {
            const Icon = getIcon(exam.title);
            const unlimited = isUnlimitedAttemptLimit(exam.attempt_limit);
            return (
              <div
                key={exam.id}
                className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <Icon size={24} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">{exam.title}</h3>
                </div>

                <p className="text-gray-600 mb-4">{exam.description}</p>

                <div className="flex gap-6 text-sm text-gray-500 mb-3">
                  <span>{exam.duration} Minutes</span>
                  <span>{exam.total_marks} Marks</span>
                </div>
                <p className="text-sm text-gray-600 mb-6">
                  Attempt limit: <strong>{unlimited ? "Unlimited" : (exam.attempt_limit ?? 1)}</strong> | Used: <strong>{exam.attempts_used ?? 0}</strong> | Left: <strong>{unlimited ? "Unlimited" : (exam.attempts_left ?? 0)}</strong>
                </p>

                <button
                  disabled={Boolean(exam.limit_reached)}
                  onClick={() => navigate(`/assessments/instructions?category=${exam.id}`)}
                  className={`w-full py-3 rounded-lg font-medium transition ${
                    exam.limit_reached
                      ? "bg-slate-300 text-slate-600 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {exam.limit_reached ? "Attempt Limit Reached" : "Start Assessment"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
