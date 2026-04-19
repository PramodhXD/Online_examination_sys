import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "../../components/dashboard/layout/DashboardLayout";

export default function ResumeAttempt() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const type = params.get("type");
  const categoryId = params.get("category");
  const attemptId = params.get("attempt");

  const isAssessment = type === "assessment";
  const isPractice = type === "practice";

  const title = useMemo(() => {
    if (isAssessment) return "Resume Assessment Attempt";
    if (isPractice) return "Resume Practice Attempt";
    return "Resume Attempt";
  }, [isAssessment, isPractice]);

  const continueAttempt = () => {
    if (!categoryId || !attemptId) {
      navigate("/dashboard", { replace: true });
      return;
    }

    if (isAssessment) {
      const faceVerified = sessionStorage.getItem("faceVerified") === "true";
      if (!faceVerified) {
        navigate(
          `/student/face-verification?category=${categoryId}&attempt=${attemptId}&resume=1`,
          { replace: true }
        );
        return;
      }

      navigate(
        `/assessment/start?category=${categoryId}&attempt=${attemptId}&resume=1`,
        { replace: true }
      );
      return;
    }

    navigate(
      `/practice/questions?category=${categoryId}&attempt=${attemptId}&resume=1`,
      { replace: true }
    );
  };

  const backToList = () => {
    if (isAssessment) {
      navigate("/assessments", { replace: true });
      return;
    }
    navigate("/practice", { replace: true });
  };

  return (
    <DashboardLayout title="Resume Attempt">
      <div className="max-w-3xl mx-auto py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
            In-progress attempt found
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">{title}</h1>
          <p className="mt-3 text-gray-600">
            You already have an unfinished attempt for this exam. Continue the same attempt to avoid conflicts.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Attempt ID: <span className="font-mono">{attemptId || "N/A"}</span>
          </p>

          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              onClick={continueAttempt}
              className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Continue Attempt
            </button>
            <button
              type="button"
              onClick={backToList}
              className="inline-flex items-center rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
