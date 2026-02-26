import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useExam } from "../../hooks/useExam";
import assessmentService from "../../services/assessmentService";

import Timer from "../../components/assessment/Timer";
import QuestionCard from "../../components/assessment/QuestionCard";
import QuestionPalette from "../../components/assessment/QuestionPalette";
import ActionBar from "../../components/assessment/ActionBar";

export default function AssessmentQuestions() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const categoryId = params.get("category");

  const [questions, setQuestions] = useState([]);
  const [attemptId, setAttemptId] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState({});
  const [showPalette, setShowPalette] = useState(true);
  const [loading, setLoading] = useState(true);
  const [autoSubmitting, setAutoSubmitting] = useState(false);
  const submitInFlightRef = useRef(false);
  const submitTriggeredRef = useRef(false);

  const { isFullscreen, examTerminated, warningMessage, warnings, finishExam, stopMonitoring } = useExam();

  /* ================= FACE VERIFICATION CHECK ================= */
  useEffect(() => {
    const isFaceVerified =
      sessionStorage.getItem("faceVerified") === "true";

    if (!isFaceVerified) {
      navigate(`/student/face-verification?category=${categoryId}`, {
        replace: true,
      });
    }
  }, [navigate, categoryId]);

  /* ================= START ATTEMPT + FETCH QUESTIONS ================= */
  useEffect(() => {
    if (!categoryId) return;

    const initAssessment = async () => {
      try {
        setLoading(true);

        const { attempt_id } =
          await assessmentService.startAssessment(categoryId);

        setAttemptId(attempt_id);

        const data =
          await assessmentService.getQuestions(categoryId, 60);

        setQuestions(data || []);
      } catch (error) { void error;
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    initAssessment();
  }, [categoryId, navigate]);

  /* ================= SUBMIT ATTEMPT ================= */
  const submitAttempt = useCallback(async (submitReason = null) => {
    if (!attemptId || submitInFlightRef.current) return;

    submitInFlightRef.current = true;
    try {
      const payload = {
        attempt_id: attemptId,
        question_ids: questions.map((q) => q.id),
        answers: questions.map((_, index) => answers[index] ?? 0),
        submit_reason: submitReason,
      };
      return await assessmentService.submitAssessment(payload);
    } catch { void 0; }
    finally {
      submitInFlightRef.current = false;
    }
  }, [attemptId, questions, answers]);

  const cleanupExamSession = useCallback(() => {
    stopMonitoring();
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => { void 0; });
    }
    sessionStorage.removeItem("faceVerified");
  }, [stopMonitoring]);

  /* ================= SUBMIT & NAVIGATE TO DASHBOARD ================= */
  const handleSubmit = async () => {
    submitTriggeredRef.current = true;
    const result = await submitAttempt();
    cleanupExamSession();

    if (!result) {
      navigate("/dashboard", { replace: true });
      return;
    }

    const attempted = Object.values(answers).filter((value) => Number(value) > 0).length;
    navigate("/assessment/result", {
      replace: true,
      state: {
        examName: "Assessment",
        total: questions.length,
        attempted,
        correct: result.correct_answers ?? 0,
        wrong: result.wrong_answers ?? 0,
        scorePercent: Number(result.percentage ?? 0),
        timeTaken: 0,
        attemptId: result.attempt_id,
        certificateEligible: Boolean(result.certificate_eligible),
      },
    });
  };

  /* ================= VIOLATION AUTO SUBMIT ================= */
  useEffect(() => {
    if (!examTerminated) return;
    if (submitTriggeredRef.current) return;
    if (!attemptId || !questions.length) return;

    submitTriggeredRef.current = true;
    setAutoSubmitting(true);

    let cancelled = false;
    const run = async () => {
      await submitAttempt("violation");
      if (!cancelled) {
        setAutoSubmitting(false);
        finishExam();
      }
    };
    void run();

    return () => {
      cancelled = true;
    };
  }, [examTerminated, attemptId, questions.length, submitAttempt, finishExam]);

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-lg font-medium bg-slate-50">
        Loading Assessment...
      </div>
    );
  }

  /* ================= NO QUESTIONS ================= */
  if (!questions.length) {
    return (
      <div className="h-screen flex items-center justify-center text-lg font-medium bg-slate-50">
        No Questions Found
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50/60 relative">

      {/* ================= AUTO TERMINATE ================= */}
      {examTerminated && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="bg-white p-10 rounded-2xl text-center shadow-2xl max-w-md border border-slate-200">
                <h2 className="text-xl font-bold mb-4 text-red-600">
                  Exam Auto-Submitted
                </h2>
                {autoSubmitting && (
                  <p className="mb-4 text-sm text-slate-600">
                    Saving your attempt...
                  </p>
                )}
                <button
                  onClick={finishExam}
                  disabled={autoSubmitting}
                  className="bg-red-600 text-white px-6 py-2 rounded-md"
                >
                  OK
                </button>
          </div>
        </div>
      )}

      {warningMessage && !examTerminated && (
        <div className="fixed top-20 right-4 z-50 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 shadow-lg">
          Warning {warnings}/3: {warningMessage}
        </div>
      )}

      {/* ================= FULLSCREEN BLOCK ================= */}
      {!isFullscreen && !examTerminated && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white p-10 rounded-2xl text-center border border-slate-200">
            <h2 className="text-xl font-bold mb-4 text-red-600">
              Fullscreen Required
            </h2>
            <button
              onClick={() =>
                document.documentElement.requestFullscreen()
              }
              className="bg-blue-600 text-white px-6 py-2 rounded-md"
            >
              Re-enter Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* ================= TIMER ================= */}
      <Timer />

      <div className="flex flex-1 overflow-hidden pb-24">

        {/* ================= QUESTION ================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <QuestionCard
            question={questions[current]}
            selected={answers[current]}
            index={current}
            total={questions.length}
            mandatory={answers[current] === undefined}
            onSelect={(opt) =>
              setAnswers((prev) => ({
                ...prev,
                [current]: opt,
              }))
            }
          />
        </div>

        {/* ================= QUESTION PALETTE ================= */}
        {showPalette && (
          <QuestionPalette
            questions={questions}
            current={current}
            answers={answers}
            marked={marked}
            onJump={setCurrent}
            onSubmit={handleSubmit}
            onToggle={() => setShowPalette(false)}
          />
        )}
      </div>

      {!showPalette && (
        <button
          onClick={() => setShowPalette(true)}
          className="fixed right-4 bottom-24 z-40 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-blue-700"
        >
          Show Palette
        </button>
      )}

      {/* ================= ACTION BAR ================= */}
      <ActionBar
        hasPalette={showPalette}
        onTogglePalette={() => setShowPalette(true)}
        onPrev={() => setCurrent((c) => Math.max(c - 1, 0))}
        onNext={() =>
          setCurrent((c) =>
            Math.min(c + 1, questions.length - 1)
          )
        }
        onClear={() =>
          setAnswers((prev) => {
            const copy = { ...prev };
            delete copy[current];
            return copy;
          })
        }
        onMark={() =>
          setMarked((m) => ({
            ...m,
            [current]: !m[current],
          }))
        }
      />
    </div>
  );
}




