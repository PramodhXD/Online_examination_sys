import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import * as Motion from "framer-motion";
import { CheckCircle, Clock, FileQuestion, Trophy, XCircle } from "lucide-react";

import DashboardLayout from "../../components/dashboard/layout/DashboardLayout";
import practiceService from "../../services/practiceService";

function formatTimeTaken(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  if (minutes === 0) return `${seconds} sec`;
  if (seconds === 0) return `${minutes} min`;
  return `${minutes} min ${seconds} sec`;
}

function formatDateTime(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}

function formatSubmissionReason(reason) {
  return String(reason || "").toLowerCase() === "timeout" ? "Timeout" : "Manual";
}

export default function PracticeReview() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const attemptId = Number(params.get("attempt") || state?.attemptId || 0);

  useEffect(() => {
    if (!attemptId) {
      setLoading(false);
      setError("No practice review data found.");
      return;
    }

    const loadReview = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await practiceService.getAttemptReview(attemptId);
        setReview(data);
      } catch (err) {
        setError(err?.response?.data?.detail || "Failed to load practice review.");
      } finally {
        setLoading(false);
      }
    };

    void loadReview();
  }, [attemptId]);

  const summary = useMemo(() => {
    if (!review) return null;
    const questions = review.questions || [];
    return {
      practiceName: review.practice_title || "Practice",
      total: Number(review.total_questions || questions.length || 0),
      attempted: questions.filter((item) => Number(item?.user_answer || 0) > 0).length,
      correct: Number(review.correct_answers || 0),
      wrong: Number(review.wrong_answers || 0),
      scorePercent: Number(review.percentage || 0),
      timeTaken: questions.reduce(
        (sum, item) => sum + Math.max(0, Number(item?.time_taken_seconds) || 0),
        0
      ),
      submissionReason: review.submission_reason || "manual",
      startedAt: review.started_at,
      completedAt: review.completed_at,
    };
  }, [review]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-10 text-center text-gray-500">Loading practice review...</div>
      </DashboardLayout>
    );
  }

  if (error || !summary) {
    return (
      <DashboardLayout>
        <div className="p-10 text-center text-red-500">{error || "No practice review data found."}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-10">
        <Motion.motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-auto w-full max-w-6xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8 lg:p-10"
        >
          <div className="mb-8 text-center">
            <Trophy className="mx-auto mb-3 text-yellow-500" size={40} />
            <h1 className="text-2xl font-bold">{summary.practiceName} Review</h1>
            <p className="mt-2 text-gray-500">
              Review your answers, correct responses, timing, and submission details.
            </p>
          </div>

          <div className="mb-8 rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center">
            <h2 className="text-lg font-semibold">Final Score</h2>
            <p className="mt-2 text-4xl font-bold text-blue-600">{summary.scorePercent}%</p>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl bg-gray-50 p-5 text-center shadow-sm">
              <p className="text-sm text-gray-500">Total Questions</p>
              <p className="text-xl font-semibold">{summary.total}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-5 text-center shadow-sm">
              <p className="text-sm text-gray-500">Attempted</p>
              <p className="text-xl font-semibold">{summary.attempted}</p>
            </div>
            <div className="rounded-xl bg-green-50 p-5 text-center shadow-sm">
              <div className="flex items-center justify-center gap-2 text-green-600">
                <CheckCircle size={18} />
                <span>Correct</span>
              </div>
              <p className="mt-2 text-xl font-semibold">{summary.correct}</p>
            </div>
            <div className="rounded-xl bg-red-50 p-5 text-center shadow-sm">
              <div className="flex items-center justify-center gap-2 text-red-600">
                <XCircle size={18} />
                <span>Wrong</span>
              </div>
              <p className="mt-2 text-xl font-semibold">{summary.wrong}</p>
            </div>
          </div>

          <div className="mb-8 rounded-xl bg-gray-50 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-gray-700">
              <Clock size={18} />
              <span className="font-medium">Timing & Submission</span>
            </div>
            <div className="space-y-2 text-sm text-gray-700">
              <p>Time Taken: <span className="font-semibold">{formatTimeTaken(summary.timeTaken)}</span></p>
              <p>Submission Reason: <span className="font-semibold">{formatSubmissionReason(summary.submissionReason)}</span></p>
              <p>Started At: <span className="font-semibold">{formatDateTime(summary.startedAt)}</span></p>
              <p>Completed At: <span className="font-semibold">{formatDateTime(summary.completedAt)}</span></p>
            </div>
          </div>

          <div className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <FileQuestion className="text-slate-700" size={20} />
              <h2 className="text-xl font-semibold">Question Review</h2>
            </div>

            <div className="space-y-4">
              {(review?.questions || []).map((question) => (
                <div key={question.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Question {question.order}
                      </p>
                      <h3 className="mt-1 text-base font-semibold text-slate-900">
                        {question.question_text}
                      </h3>
                    </div>
                    <div
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        question.is_correct ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {question.is_correct ? "Correct" : "Incorrect"}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Your Answer
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        {question.user_answer
                          ? `Option ${question.user_answer}: ${question.user_answer_text}`
                          : "Not Answered"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-emerald-50 p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        Correct Answer
                      </p>
                      <p className="text-sm font-medium text-emerald-900">
                        {`Option ${question.correct_answer}: ${question.correct_answer_text}`}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                    Time Taken: <span className="font-semibold">{formatTimeTaken(question.time_taken_seconds)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <button onClick={() => navigate("/practice")} className="rounded-lg border px-6 py-2">
              Back to Practice
            </button>
            <button onClick={() => navigate("/dashboard")} className="rounded-lg bg-blue-600 px-6 py-2 text-white">
              Go to Dashboard
            </button>
          </div>
        </Motion.motion.div>
      </div>
    </DashboardLayout>
  );
}
