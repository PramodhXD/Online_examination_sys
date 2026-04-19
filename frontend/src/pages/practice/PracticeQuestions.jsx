import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Clock, ChevronLeft, ChevronRight, BookOpen, Flag, AlertTriangle, CheckCircle2, XCircle, CircleDot } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import * as Motion from "framer-motion";

import PracticeAnalyticsSidebar from "../../components/practice/PracticeAnalyticsSidebar";
import practiceService from "../../services/practiceService";

function extractApiError(error, fallback) {
  const data = error?.response?.data;
  const detail = data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((item) => item?.msg || String(item)).join(", ");
  }
  const message = data?.message;
  if (typeof message === "string" && message.trim()) return message;
  if (typeof error?.message === "string" && error.message.trim()) return error.message;
  const status = error?.response?.status;
  return status ? `${fallback} (HTTP ${status})` : fallback;
}

export default function PracticeQuestions() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const categoryId = params.get("category");
  const attemptFromQuery = params.get("attempt");

  const [questions, setQuestions] = useState([]);
  const [attemptId, setAttemptId] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [current, setCurrent] = useState(0);
  const [time, setTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [shuffledOptionOrders, setShuffledOptionOrders] = useState({});
  const questionTimeSpentRef = useRef({});
  const activeQuestionIdRef = useRef(null);
  const activeQuestionStartedAtRef = useRef(null);

  const question = questions[current];
  const isAttemptLimitError = /attempt limit|cannot retake|retake/i.test(loadError);

  /* ================= FETCH QUESTIONS ================= */
  useEffect(() => {
    if (!categoryId) return;

    const initializePractice = async () => {
      let activeAttemptId = attemptFromQuery ? Number(attemptFromQuery) : null;
      let initialQuestions = null;

      try {
        setLoading(true);
        setLoadError("");
        setQuestions([]);

        if (!activeAttemptId) {
          const attempt = await practiceService.startPractice(categoryId);
          activeAttemptId = Number(attempt?.attempt_id || 0);
          initialQuestions = Array.isArray(attempt?.questions) ? attempt.questions : null;
        }

        setAttemptId(activeAttemptId);
      } catch (err) {
        setLoadError(extractApiError(err, "Unable to start this practice exam."));
        setLoading(false);
        return;
      }

      try {
        if (Array.isArray(initialQuestions) && initialQuestions.length) {
          setQuestions(initialQuestions);
        } else {
          const data = await practiceService.getQuestionsByCategory(categoryId, 5, activeAttemptId);
          setQuestions(data || []);
        }
      } catch (err) {
        setLoadError(extractApiError(err, "Unable to load practice questions."));
      } finally {
        setLoading(false);
      }
    };

    initializePractice();
  }, [attemptFromQuery, categoryId, navigate]);

  useEffect(() => {
    if (!questions.length) {
      setShuffledOptionOrders({});
      return;
    }

    const nextOrders = {};
    questions.forEach((q) => {
      const optionNumbers = [1, 2, 3, 4].filter((n) => {
        const text = q[`option_${n}`];
        return Boolean(text);
      });

      for (let i = optionNumbers.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [optionNumbers[i], optionNumbers[j]] = [optionNumbers[j], optionNumbers[i]];
      }

      nextOrders[q.id] = optionNumbers;
    });

    setShuffledOptionOrders(nextOrders);
  }, [questions]);

  const accumulateActiveQuestionTime = () => {
    const activeQuestionId = activeQuestionIdRef.current;
    const activeStartedAt = activeQuestionStartedAtRef.current;
    if (!activeQuestionId || !activeStartedAt) return;

    const elapsedMs = Math.max(0, Date.now() - activeStartedAt);
    questionTimeSpentRef.current[activeQuestionId] =
      (questionTimeSpentRef.current[activeQuestionId] || 0) + elapsedMs;
    activeQuestionStartedAtRef.current = Date.now();
  };

  /* ================= TIMER ================= */
  useEffect(() => {
    const interval = setInterval(() => {
      setTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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
  }, [current, questions]);

  /* ================= SELECT OPTION ================= */
  const handleSelect = (index) => {
    if (!question) return;
    const activeOrder = shuffledOptionOrders[question.id] || [1, 2, 3, 4];
    const selectedOptionNumber = activeOrder[index];
    if (!selectedOptionNumber) return;

    const updatedAnswers = [...selectedAnswers];
    updatedAnswers[current] = selectedOptionNumber;
    setSelectedAnswers(updatedAnswers);
  };

  /* ================= NAVIGATION ================= */
  const nextQuestion = () => {
    if (current < questions.length - 1) {
      setCurrent(prev => prev + 1);
    }
  };

  const prevQuestion = () => {
    if (current > 0) {
      setCurrent(prev => prev - 1);
    }
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = () => setShowConfirm(true);

  const confirmSubmit = async () => {
    try {
      accumulateActiveQuestionTime();
      const result = await practiceService.submitPractice(
        attemptId,
        questions,
        selectedAnswers,
        questions.map((q) =>
          Math.max(0, Math.round((questionTimeSpentRef.current[q.id] || 0) / 1000))
        ),
        "manual"
      );

      const total = result?.total_questions ?? questions.length;
      const attempted = selectedAnswers.filter(a => a !== undefined).length;
      const correct = result?.correct_answers ?? 0;
      const wrong = result?.wrong_answers ?? Math.max(total - correct, 0);
      const accuracyPercent = Number(result?.accuracy ?? 0).toFixed(1);
      const scorePercent = accuracyPercent;

      navigate("/practice/result", {
        replace: true,
        state: {
          attemptId: result?.attempt_id,
          total,
          attempted,
          correct,
          wrong,
          scorePercent,
          accuracyPercent,
        },
      });

    } catch { void 0; }
  };

  /* ================= EXIT ================= */
  const handleExit = () => navigate("/practice", { replace: true });

  /* ================= GUARDS ================= */
  if (!categoryId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100 flex items-center justify-center px-4">
        <div className="w-full max-w-xl rounded-2xl border border-red-200 bg-white p-6 sm:p-8 text-center shadow-sm">
          <AlertTriangle className="w-10 h-10 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900">Invalid category</h2>
          <p className="mt-2 text-sm text-slate-600">This practice test link is missing category details.</p>
          <button
            type="button"
            onClick={() => navigate("/practice", { replace: true })}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Back to Practice
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="animate-pulse rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="h-5 w-40 rounded bg-slate-200" />
              <div className="h-2 flex-1 rounded-full bg-slate-200" />
              <div className="flex gap-3">
                <div className="h-9 w-24 rounded-full bg-slate-200" />
                <div className="h-9 w-20 rounded-xl bg-slate-200" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="xl:col-span-8">
              <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 lg:p-8">
                <div className="mb-6 flex items-center justify-between gap-3">
                  <div className="h-7 w-28 rounded-full bg-slate-200" />
                  <div className="h-4 w-24 rounded bg-slate-200" />
                </div>
                <div className="space-y-3">
                  <div className="h-6 w-2/3 rounded bg-slate-200" />
                  <div className="h-6 w-1/2 rounded bg-slate-200" />
                </div>
                <div className="mt-8 space-y-4">
                  <div className="h-16 rounded-2xl bg-slate-200" />
                  <div className="h-16 rounded-2xl bg-slate-200" />
                  <div className="h-16 rounded-2xl bg-slate-200" />
                  <div className="h-16 rounded-2xl bg-slate-200" />
                </div>
              </div>
            </div>

            <div className="hidden xl:col-span-4 xl:block">
              <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="h-5 w-32 rounded bg-slate-200" />
                <div className="mt-6 space-y-4">
                  <div className="h-16 rounded-2xl bg-slate-200" />
                  <div className="h-16 rounded-2xl bg-slate-200" />
                  <div className="h-16 rounded-2xl bg-slate-200" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100 flex items-center justify-center px-4">
        <div className="w-full max-w-2xl rounded-2xl border border-red-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">Unable to start this practice test</h2>
              <p className="mt-2 text-sm sm:text-base text-red-700">{loadError}</p>
              {isAttemptLimitError ? (
                <p className="mt-2 text-sm text-slate-600">
                  You have reached the allowed number of attempts for this category.
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate("/practice", { replace: true })}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Back to Practice
            </button>
            <button
              type="button"
              onClick={() => navigate("/support")}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Help & Support
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100 flex items-center justify-center px-4">
        <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-center shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">No questions found</h2>
          <p className="mt-2 text-sm text-slate-600">Try another category or come back later.</p>
          <button
            type="button"
            onClick={() => navigate("/practice", { replace: true })}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Back to Practice
          </button>
        </div>
      </div>
    );
  }

  const activeOrder = shuffledOptionOrders[question.id] || [1, 2, 3, 4];
  const options = activeOrder
    .map((optionNumber) => ({
      optionNumber,
      text: question[`option_${optionNumber}`],
    }))
    .filter((opt) => Boolean(opt.text));
  const selectedForCurrent = selectedAnswers[current];
  const currentCorrectOption = question.correct_option;
  const isCurrentCorrect =
    selectedForCurrent !== undefined &&
    currentCorrectOption !== undefined &&
    selectedForCurrent === currentCorrectOption;
  const progressPercent = ((current + 1) / questions.length) * 100;
  const minute = String(Math.floor(time / 60)).padStart(2, "0");
  const second = String(time % 60).padStart(2, "0");
  const answeredCount = selectedAnswers.filter((a) => a !== undefined).length;
  const unansweredCount = Math.max(questions.length - answeredCount, 0);
  const correctCount = questions.reduce((acc, q, idx) => {
    if (selectedAnswers[idx] === undefined) return acc;
    return selectedAnswers[idx] === q.correct_option ? acc + 1 : acc;
  }, 0);
  const wrongCount = Math.max(answeredCount - correctCount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100">

      {/* HEADER */}
      <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 px-4 py-4 backdrop-blur-md sm:px-6 lg:px-10">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:gap-6">
          <div className="flex items-center gap-3 xl:min-w-[220px]">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-lg">Practice Test</h1>
              <p className="text-xs text-slate-500">Question {current + 1} of {questions.length}</p>
            </div>
          </div>

          <div className="min-w-0 flex-1 xl:px-2">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Progress</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
              <Motion.motion.div
                className="h-2.5 bg-blue-600"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 xl:min-w-[220px] xl:justify-end">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">
              <Clock size={16} />
              {minute}:{second}
            </div>

            <button
              onClick={handleExit}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Exit
            </button>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 px-4 sm:px-6 lg:px-8 py-6 lg:py-8">

        <div className="xl:col-span-8">
          <AnimatePresence mode="wait">
            <Motion.motion.div
              key={current}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 sm:p-7 lg:p-8"
            >
              <div className="flex items-center justify-between gap-3 mb-6">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-xs font-semibold">
                  <Flag className="w-3.5 h-3.5" />
                  Question {current + 1}
                </span>
                <span className="text-xs text-slate-500">{questions.length - current - 1} remaining</span>
              </div>

              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-6 leading-relaxed">{question.question_text}</h2>

              <div className="space-y-4">
                {options.map((opt, i) => {
                  const optionNumber = opt.optionNumber;
                  const isSelected = selectedAnswers[current] === optionNumber;
                  const isCorrectOption = currentCorrectOption === optionNumber;
                  const hasAnsweredCurrent = selectedForCurrent !== undefined;

                  let style = "border-slate-300 hover:border-blue-400 hover:bg-blue-50/40";
                  if (!hasAnsweredCurrent && isSelected) {
                    style = "border-blue-500 bg-blue-50 text-blue-700";
                  } else if (hasAnsweredCurrent) {
                    if (isSelected && isCorrectOption) {
                      style = "border-green-300 bg-green-50 text-green-800";
                    } else if (isSelected && !isCorrectOption) {
                      style = "border-red-300 bg-red-50 text-red-700";
                    } else if (isCorrectOption) {
                      style = "border-green-200 bg-green-50/70 text-green-800";
                    }
                  }

                  return (
                    <Motion.motion.button
                      type="button"
                      key={i}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelect(i)}
                      className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:p-5 ${style}`}
                      aria-pressed={isSelected}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-full border border-current/30 flex items-center justify-center text-xs font-semibold shrink-0">
                            {String.fromCharCode(65 + i)}
                          </div>
                          <p className="text-sm sm:text-base">{opt.text}</p>
                        </div>

                        <div className="flex shrink-0 items-center">
                          {!hasAnsweredCurrent && isSelected ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 sm:text-sm">
                              <CircleDot className="h-4 w-4" />
                              Selected
                            </span>
                          ) : null}
                          {hasAnsweredCurrent && isSelected && isCorrectOption ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 sm:text-sm">
                              <CheckCircle2 className="h-4 w-4" />
                              Correct
                            </span>
                          ) : null}
                          {hasAnsweredCurrent && isSelected && !isCorrectOption ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 sm:text-sm">
                              <XCircle className="h-4 w-4" />
                              Incorrect
                            </span>
                          ) : null}
                          {hasAnsweredCurrent && !isSelected && isCorrectOption ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 sm:text-sm">
                              <CheckCircle2 className="h-4 w-4" />
                              Correct
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Motion.motion.button>
                  );
                })}
              </div>

              {selectedForCurrent !== undefined && (
                <div
                  className={`mt-6 rounded-2xl border p-4 ${
                    isCurrentCorrect
                      ? "border-green-200 bg-green-50 text-green-800"
                      : "border-red-200 bg-red-50 text-red-800"
                  }`}
                >
                  <p className="text-sm font-semibold">
                    {isCurrentCorrect ? "Correct answer" : "Wrong answer"}
                  </p>
                  {!isCurrentCorrect && currentCorrectOption && (
                    <p className="mt-1 text-sm">
                      Correct option: {String.fromCharCode(64 + currentCorrectOption)}
                    </p>
                  )}
                  <p className="mt-2 text-sm">
                    Explanation: {question.explanation || "No explanation available."}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap justify-between gap-3 mt-8">
                <button onClick={prevQuestion} disabled={current === 0} className="inline-flex items-center gap-1.5 px-5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50">
                  <ChevronLeft size={16} /> Previous
                </button>

                {current < questions.length - 1 ? (
                  <button onClick={nextQuestion} className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">
                    Next <ChevronRight size={16} />
                  </button>
                ) : (
                  <button onClick={handleSubmit} className="px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700">
                    Submit Practice
                  </button>
                )}
              </div>

            </Motion.motion.div>
          </AnimatePresence>
        </div>

        <div className="xl:col-span-4">
          <PracticeAnalyticsSidebar
            totalQuestions={questions.length}
            correct={correctCount}
            wrong={wrongCount}
          />
        </div>

      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-2xl">
            <h2 className="text-lg font-semibold mb-4">Submit Practice?</h2>
            <p className="mb-2 text-sm text-slate-600">You will move to the result page after submission.</p>
            <p className="text-sm text-slate-600">
              You answered {answeredCount} out of {questions.length} questions.
            </p>
            {unansweredCount > 0 ? (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
                {unansweredCount} question{unansweredCount === 1 ? "" : "s"} {unansweredCount === 1 ? "is" : "are"} unanswered.
              </p>
            ) : (
              <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                All questions have been answered.
              </p>
            )}
            <div className="mt-5 flex justify-center gap-3">
              <button onClick={() => setShowConfirm(false)} className="px-5 py-2.5 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={confirmSubmit} className="px-6 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700">Yes, Submit</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}




