import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Clock, ChevronLeft, ChevronRight, BookOpen, Flag } from "lucide-react";
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

  const [questions, setQuestions] = useState([]);
  const [attemptId, setAttemptId] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [current, setCurrent] = useState(0);
  const [time, setTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loadError, setLoadError] = useState("");

  const question = questions[current];

  /* ================= FETCH QUESTIONS ================= */
  useEffect(() => {
    if (!categoryId) return;

    const initializePractice = async () => {
      try {
        setLoading(true);
        setLoadError("");
        setQuestions([]);

        const attempt = await practiceService.startPractice(categoryId);
        setAttemptId(attempt.attempt_id);
      } catch (err) {
        setLoadError(extractApiError(err, "Unable to start this practice exam."));
        setLoading(false);
        return;
      }

      try {
        const data = await practiceService.getQuestionsByCategory(categoryId, 5);
        setQuestions(data || []);
      } catch (err) {
        setLoadError(extractApiError(err, "Unable to load practice questions."));
      } finally {
        setLoading(false);
      }
    };

    initializePractice();
  }, [categoryId]);

  /* ================= TIMER ================= */
  useEffect(() => {
    setTime(0);
    const interval = setInterval(() => {
      setTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [current]);

  /* ================= SELECT OPTION ================= */
  const handleSelect = (index) => {
    if (!question) return;

    const updatedAnswers = [...selectedAnswers];
    updatedAnswers[current] = index + 1;
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
      const result = await practiceService.submitPractice(
        attemptId,
        questions,
        selectedAnswers
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
  if (!categoryId) return <div className="p-10 text-center text-red-500">Invalid Category</div>;
  if (loading) return <div className="p-10 text-center text-gray-500">Loading questions...</div>;
  if (loadError) return <div className="p-10 text-center text-red-600">{loadError}</div>;
  if (!question) return <div className="p-10 text-center text-gray-500">No questions found.</div>;

  const options = [question.option_1, question.option_2, question.option_3, question.option_4].filter(Boolean);
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
  const correctCount = questions.reduce((acc, q, idx) => {
    if (selectedAnswers[idx] === undefined) return acc;
    return selectedAnswers[idx] === q.correct_option ? acc + 1 : acc;
  }, 0);
  const wrongCount = Math.max(answeredCount - correctCount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100">

      {/* HEADER */}
      <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-4 sm:px-6 lg:px-10 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-lg">Practice Test</h1>
              <p className="text-xs text-slate-500">Question {current + 1} of {questions.length}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-full px-3 py-1.5">
              <Clock size={16} />
              {minute}:{second}
            </div>

            <div className="w-40 sm:w-56 bg-slate-200 rounded-full h-2 overflow-hidden">
              <Motion.motion.div
                className="bg-blue-600 h-2"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>

            <button onClick={handleExit} className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50">
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
                  const isSelected = selectedAnswers[current] === i + 1;
                  const style = isSelected
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-300 hover:border-blue-400 hover:bg-blue-50/40";

                  return (
                    <Motion.motion.div
                      key={i}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelect(i)}
                      className={`border rounded-2xl p-4 sm:p-5 cursor-pointer transition-all duration-200 ${style}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full border border-current/30 flex items-center justify-center text-xs font-semibold shrink-0">
                          {String.fromCharCode(65 + i)}
                        </div>
                        <p className="text-sm sm:text-base">{opt}</p>
                      </div>
                    </Motion.motion.div>
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-[92%] max-w-md text-center border border-slate-200">
            <h2 className="text-lg font-semibold mb-4">Submit Practice?</h2>
            <p className="text-sm text-slate-500 mb-5">You will move to the result page after submission.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setShowConfirm(false)} className="px-5 py-2.5 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={confirmSubmit} className="px-6 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700">Yes, Submit</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}




