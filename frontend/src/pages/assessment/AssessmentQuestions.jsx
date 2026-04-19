import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useExam } from "../../hooks/useExam";
import assessmentService from "../../services/assessmentService";

import Timer from "../../components/assessment/Timer";
import QuestionCard from "../../components/assessment/QuestionCard";
import QuestionPalette from "../../components/assessment/QuestionPalette";
import ActionBar from "../../components/assessment/ActionBar";

const AUTO_SUBMIT_WAIT_MS = 5000;
const SESSION_SYNC_INTERVAL_MS = 10000;

export default function AssessmentQuestions() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const categoryId = params.get("category");
  const attemptFromQuery = params.get("attempt");

  const [questions, setQuestions] = useState([]);
  const [attemptId, setAttemptId] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState({});
  const [assessmentMeta, setAssessmentMeta] = useState({
    title: "Assessment",
    durationMinutes: 0,
    remainingSeconds: 0,
    startedAt: null,
    status: "IN_PROGRESS",
  });
  const [showPalette, setShowPalette] = useState(true);
  const [loading, setLoading] = useState(true);
  const [autoSubmitting, setAutoSubmitting] = useState(false);
  const [autoSubmitError, setAutoSubmitError] = useState("");
  const [autoSubmitPendingExit, setAutoSubmitPendingExit] = useState(false);
  const submitInFlightRef = useRef(false);
  const submitTriggeredRef = useRef(false);
  const startTimeRef = useRef(null);
  const questionTimeSpentRef = useRef({});
  const activeQuestionIdRef = useRef(null);
  const activeQuestionStartedAtRef = useRef(null);

  const {
    isFullscreen,
    examTerminated,
    warningMessage,
    warnings,
    finishExam,
    stopMonitoring,
    registerMonitoringSession,
    clearMonitoringSession,
  } = useExam();

  const applySessionSnapshot = useCallback((session, fallbackTitle = null) => {
    if (!session) return;

    const normalizedStartedAt = session.started_at || null;
    startTimeRef.current = normalizedStartedAt ? Date.parse(normalizedStartedAt) : null;
    setAssessmentMeta((prev) => ({
      title: session.assessment_title || fallbackTitle || prev.title,
      durationMinutes: Number(session.duration_minutes) || prev.durationMinutes || 0,
      remainingSeconds: Math.max(0, Number(session.remaining_seconds) || 0),
      startedAt: normalizedStartedAt,
      status: session.status || prev.status,
    }));
  }, []);

  const cleanupExamSession = useCallback(() => {
    stopMonitoring();
    clearMonitoringSession();
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => { void 0; });
    }
    sessionStorage.removeItem("faceVerified");
  }, [clearMonitoringSession, stopMonitoring]);

  const goToResultPage = useCallback((result, submitReason = "manual") => {
    const attempted = Object.values(answers).filter((value) => Number(value) > 0).length;
    const startTime = startTimeRef.current || Date.now();
    const timeTakenSeconds = Math.max(
      0,
      Math.floor((Date.now() - startTime) / 1000)
    );

    navigate(`/assessment/result?attempt=${result.attempt_id}`, {
      replace: true,
      state: {
        examName: assessmentMeta.title || "Assessment",
        total: questions.length,
        attempted,
        correct: result.correct_answers ?? 0,
        wrong: result.wrong_answers ?? 0,
        scorePercent: Number(result.percentage ?? 0),
        timeTaken: timeTakenSeconds,
        attemptId: result.attempt_id,
        certificateEligible: Boolean(result.certificate_eligible),
        submissionReason: submitReason,
      },
    });
  }, [answers, assessmentMeta.title, navigate, questions.length]);

  const navigateFromReview = useCallback(async (targetAttemptId) => {
    const review = await assessmentService.getAttemptReview(targetAttemptId);
    cleanupExamSession();
    navigate(`/assessment/result?attempt=${targetAttemptId}`, {
      replace: true,
      state: {
        examName: review.assessment_title || assessmentMeta.title || "Assessment",
        total: Array.isArray(review.questions) ? review.questions.length : questions.length,
        attempted: Array.isArray(review.questions)
          ? review.questions.filter((item) => Number(item.user_answer) > 0).length
          : 0,
        correct: Number(review.correct_answers ?? 0),
        wrong: Number(review.wrong_answers ?? 0),
        scorePercent: Number(review.percentage ?? 0),
        timeTaken: startTimeRef.current
          ? Math.max(0, Math.floor((Date.now() - startTimeRef.current) / 1000))
          : 0,
        attemptId: targetAttemptId,
        certificateEligible: Boolean(review.certificate_eligible),
        submissionReason: review.submission_reason || "timeout",
      },
    });
  }, [assessmentMeta.title, cleanupExamSession, navigate, questions.length]);

  const accumulateActiveQuestionTime = useCallback(() => {
    const activeQuestionId = activeQuestionIdRef.current;
    const activeStartedAt = activeQuestionStartedAtRef.current;

    if (!activeQuestionId || !activeStartedAt) return;

    const elapsedMs = Math.max(0, Date.now() - activeStartedAt);
    questionTimeSpentRef.current[activeQuestionId] =
      (questionTimeSpentRef.current[activeQuestionId] || 0) + elapsedMs;
    activeQuestionStartedAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    const isFaceVerified =
      sessionStorage.getItem("faceVerified") === "true";

    if (!isFaceVerified) {
      navigate(`/student/face-verification?category=${categoryId}`, {
        replace: true,
      });
    }
  }, [navigate, categoryId]);

  useEffect(() => {
    if (!categoryId) return;

    const initAssessment = async () => {
      let activeAttemptId = attemptFromQuery ? Number(attemptFromQuery) : null;
      let startQuestions = null;

      try {
        setLoading(true);

        const assessments = await assessmentService.getAssessments();
        const matchedAssessment = (assessments || []).find(
          (item) => Number(item?.id) === Number(categoryId)
        );
        if (matchedAssessment) {
          setAssessmentMeta((prev) => ({
            ...prev,
            title: matchedAssessment.title || prev.title,
            durationMinutes: Number(matchedAssessment.duration) || prev.durationMinutes || 0,
          }));
        }

        if (!activeAttemptId) {
          const startData = await assessmentService.startAssessment(categoryId);
          activeAttemptId = Number(startData?.attempt_id || 0);
          startQuestions = Array.isArray(startData?.questions) ? startData.questions : null;
          applySessionSnapshot(
            {
              assessment_title: matchedAssessment?.title || "Assessment",
              duration_minutes: startData?.duration_minutes,
              remaining_seconds: startData?.remaining_seconds,
              started_at: startData?.started_at,
              status: "IN_PROGRESS",
            },
            matchedAssessment?.title
          );
        }

        if (!activeAttemptId) {
          navigate("/dashboard", { replace: true });
          return;
        }

        setAttemptId(activeAttemptId);
        registerMonitoringSession({
          type: "assessment",
          attemptId: activeAttemptId,
        });

        const session = await assessmentService.getAttemptSession(activeAttemptId);
        applySessionSnapshot(session, matchedAssessment?.title);

        if (session?.status && session.status !== "IN_PROGRESS" && session.status !== "LIVE" && session.status !== "FLAGGED") {
          submitTriggeredRef.current = true;
          await navigateFromReview(activeAttemptId);
          return;
        }

        if (Array.isArray(startQuestions) && startQuestions.length) {
          setQuestions(startQuestions);
        } else {
          const data = await assessmentService.getQuestions(categoryId, 60, activeAttemptId);
          setQuestions(data || []);
        }
      } catch (error) {
        const status = error?.response?.status;
        if (status === 409 && activeAttemptId) {
          submitTriggeredRef.current = true;
          await navigateFromReview(activeAttemptId);
          return;
        }
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    void initAssessment();
  }, [applySessionSnapshot, attemptFromQuery, categoryId, navigate, navigateFromReview, registerMonitoringSession]);

  useEffect(() => {
    if (!attemptId || submitTriggeredRef.current) return;

    let cancelled = false;

    const syncSession = async () => {
      try {
        const session = await assessmentService.getAttemptSession(attemptId);
        if (cancelled) return;
        applySessionSnapshot(session);

        if (
          !submitTriggeredRef.current &&
          session?.status &&
          !["IN_PROGRESS", "LIVE", "FLAGGED"].includes(session.status)
        ) {
          submitTriggeredRef.current = true;
          await navigateFromReview(attemptId);
        }
      } catch {
        void 0;
      }
    };

    void syncSession();
    const interval = setInterval(() => {
      void syncSession();
    }, SESSION_SYNC_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [applySessionSnapshot, attemptId, navigateFromReview]);

  useEffect(() => {
    if (submitTriggeredRef.current) return undefined;
    if (assessmentMeta.remainingSeconds <= 0) return undefined;

    const timer = setTimeout(() => {
      setAssessmentMeta((prev) => ({
        ...prev,
        remainingSeconds: Math.max(0, prev.remainingSeconds - 1),
      }));
    }, 1000);

    return () => clearTimeout(timer);
  }, [assessmentMeta.remainingSeconds]);

  useEffect(() => {
    if (!questions.length) return;

    const nextQuestionId = questions[current]?.id;
    if (!nextQuestionId) return;

    if (
      activeQuestionIdRef.current &&
      activeQuestionIdRef.current !== nextQuestionId
    ) {
      accumulateActiveQuestionTime();
    }

    activeQuestionIdRef.current = nextQuestionId;
    activeQuestionStartedAtRef.current = Date.now();
  }, [accumulateActiveQuestionTime, current, questions]);

  const submitAttempt = useCallback(async (submitReason = null) => {
    if (!attemptId || submitInFlightRef.current) return;

    accumulateActiveQuestionTime();
    submitInFlightRef.current = true;
    try {
      const payload = {
        attempt_id: attemptId,
        question_ids: questions.map((q) => q.id),
        answers: questions.map((_, index) => answers[index] ?? 0),
        question_times: questions.map((q) =>
          Math.max(
            0,
            Math.round((questionTimeSpentRef.current[q.id] || 0) / 1000)
          )
        ),
        submit_reason: submitReason,
      };
      return await assessmentService.submitAssessment(payload);
    } catch {
      void 0;
    } finally {
      submitInFlightRef.current = false;
    }
  }, [accumulateActiveQuestionTime, answers, attemptId, questions]);

  const handleSubmit = async (submitReason = "manual") => {
    submitTriggeredRef.current = true;
    const result = await submitAttempt(submitReason);
    cleanupExamSession();

    if (!result) {
      navigate("/dashboard", { replace: true });
      return;
    }

    goToResultPage(result, submitReason);
  };

  useEffect(() => {
    if (!examTerminated) return;
    if (submitTriggeredRef.current) return;
    if (!attemptId || !questions.length) return;

    submitTriggeredRef.current = true;
    setAutoSubmitting(true);
    setAutoSubmitError("");
    setAutoSubmitPendingExit(false);

    let cancelled = false;
    const run = async () => {
      const result = await Promise.race([
        submitAttempt("violation"),
        new Promise((resolve) => {
          setTimeout(() => resolve("__AUTO_SUBMIT_TIMEOUT__"), AUTO_SUBMIT_WAIT_MS);
        }),
      ]);

      if (!cancelled) {
        setAutoSubmitting(false);
        if (result === "__AUTO_SUBMIT_TIMEOUT__") {
          setAutoSubmitPendingExit(true);
          setAutoSubmitError("Auto-submit is taking longer than expected. You can press OK and leave this page.");
        } else if (!result) {
          setAutoSubmitError("We could not confirm the auto-submit. You can still press OK to exit safely.");
        }
      }
    };
    void run();

    return () => {
      cancelled = true;
    };
  }, [examTerminated, attemptId, questions.length, submitAttempt]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-lg font-medium bg-slate-50">
        Loading Assessment...
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="h-screen flex items-center justify-center text-lg font-medium bg-slate-50">
        No Questions Found
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50/60 relative">
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
            {!autoSubmitting && !autoSubmitError && (
              <p className="mb-4 text-sm text-slate-600">
                Your exam has been submitted because of a rule violation.
              </p>
            )}
            {autoSubmitPendingExit && (
              <p className="mb-4 text-sm text-slate-600">
                The submission may still finish in the background.
              </p>
            )}
            {autoSubmitError && (
              <p className="mb-4 text-sm text-amber-700">
                {autoSubmitError}
              </p>
            )}
            <button
              onClick={() => {
                if (!autoSubmitting) finishExam();
              }}
              disabled={autoSubmitting}
              className={`px-6 py-2 rounded-md text-white ${autoSubmitting ? "bg-red-300 cursor-not-allowed" : "bg-red-600"}`}
            >
              {autoSubmitting ? "Please wait..." : "OK"}
            </button>
          </div>
        </div>
      )}

      {warningMessage && !examTerminated && (
        <div className="fixed top-20 right-4 z-50 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 shadow-lg">
          Warning {warnings}/3: {warningMessage}
        </div>
      )}

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

      <Timer
        totalSeconds={Math.max(0, (Number(assessmentMeta.durationMinutes) || 0) * 60)}
        remainingSeconds={assessmentMeta.remainingSeconds}
        title={assessmentMeta.title || "Assessment"}
        onTimeout={() => {
          if (!submitTriggeredRef.current) {
            void handleSubmit("timeout");
          }
        }}
      />

      <div className="flex flex-1 overflow-hidden pb-24">
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
