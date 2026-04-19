import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import {
  AlertTriangle,
  Clock,
  Play,
  ShieldCheck,
  UploadCloud,
  UserCircle,
  Video,
  Wifi,
  WifiOff,
} from "lucide-react";
import codeExecutionService from "../../services/codeExecutionService";
import programmingExamService from "../../services/programmingExamService";
import { useExam } from "../../hooks/useExam";
import { getStoredAuthUser } from "../../utils/storage";
import { useNavigate, useParams } from "react-router-dom";

const SESSION_SYNC_INTERVAL_MS = 10000;
const DRAFT_SAVE_DEBOUNCE_MS = 1500;

const languageOptions = [
  { value: "c", label: "C", monaco: "c" },
  { value: "cpp", label: "C++", monaco: "cpp" },
  { value: "java", label: "Java", monaco: "java" },
  { value: "python", label: "Python", monaco: "python" },
];

const starterCode = {
  c: `#include <stdio.h>

int main() {
    // Write your code here
    return 0;
}`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    // Write your code here
    return 0;
}`,
  java: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        // Write your code here
    }
}`,
  python: `# Write your code here
`,
};

function formatTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function ProgrammingExam() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const authUser = getStoredAuthUser();
  const displayName = authUser?.name || authUser?.email || "Student";
  const previewVideoRef = useRef(null);
  const violationSubmitTriggeredRef = useRef(false);
  const submitTriggeredRef = useRef(false);
  const [language, setLanguage] = useState(languageOptions[3].value);
  const [code, setCode] = useState(starterCode[languageOptions[3].value]);
  const [activeTab, setActiveTab] = useState("output");
  const [output, setOutput] = useState("");
  const [testCaseOutput, setTestCaseOutput] = useState("");
  const [errorOutput, setErrorOutput] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showSubmitResult, setShowSubmitResult] = useState(false);
  const [submitSummary, setSubmitSummary] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [exam, setExam] = useState(null);
  const [problems, setProblems] = useState([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [attemptId, setAttemptId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editorLocked, setEditorLocked] = useState(false);
  const [attemptStatus, setAttemptStatus] = useState("IN_PROGRESS");
  const [isOnline, setIsOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [solutionsByProblem, setSolutionsByProblem] = useState({});
  const {
    isFullscreen,
    warnings,
    warningMessage,
    MAX_WARNINGS,
    examTerminated,
    liveAlerts,
    cameraStream,
    cameraError,
    cameraReady,
    monitorVerified,
    finishExam,
  } = useExam();

  const selectedLanguage = useMemo(
    () => languageOptions.find((option) => option.value === language) || languageOptions[0],
    [language]
  );
  const currentProblem = problems[currentProblemIndex] || null;

  const visibleAlerts = useMemo(() => liveAlerts.slice(0, 3), [liveAlerts]);
  const verificationLabel = cameraError
    ? "Camera unavailable"
    : monitorVerified
      ? "Face verified"
      : cameraReady
        ? "Verification monitor active"
        : "Starting camera";

  const buildSolutionPayload = useCallback(() => {
    const currentProblemId = currentProblem?.problem_id;
    return problems.map((item) => ({
      problem_id: item.problem_id,
      code:
        item.problem_id === currentProblemId
          ? code
          : (solutionsByProblem[item.problem_id] ?? item.starter_code ?? ""),
    }));
  }, [code, currentProblem?.problem_id, problems, solutionsByProblem]);

  useEffect(() => {
    const loadExam = async () => {
      try {
        setLoading(true);
        setLoadError("");

        if (!examId) {
          setLoadError("No programming exam selected.");
          return;
        }

        const detail = await programmingExamService.getExamDetail(examId);
        const examDetail = detail?.exam || null;
        const examProblems = Array.isArray(detail?.problems) ? detail.problems : [];
        setExam(examDetail);
        setProblems(examProblems);

        if (!examProblems.length) {
          setLoadError("No programming problems configured for this exam.");
          return;
        }

        const start = await programmingExamService.startExam(examDetail.id);
        setAttemptId(start.attempt_id || null);
        setAttemptStatus(start.status || "IN_PROGRESS");
        setEditorLocked(!["IN_PROGRESS", "LIVE", "FLAGGED"].includes(start.status || "IN_PROGRESS"));
        setLanguage(start.language || languageOptions[3].value);
        setTimeLeft(Math.max(0, Number(start.remaining_seconds) || 0));
        const startSolutions = Array.isArray(start?.solutions) ? start.solutions : [];
        const nextSolutions = {};
        examProblems.forEach((item) => {
          const saved = startSolutions.find((solution) => Number(solution?.problem_id) === Number(item.problem_id));
          nextSolutions[item.problem_id] =
            typeof saved?.code === "string" && saved.code.length
              ? saved.code
              : (item.starter_code || starterCode[start.language || languageOptions[3].value] || "");
        });
        setSolutionsByProblem(nextSolutions);

        const initialProblemId = Number(start?.problem_id || examProblems[0]?.problem_id || 0);
        const initialIndex = examProblems.findIndex((item) => Number(item.problem_id) === initialProblemId);
        const resolvedIndex = initialIndex >= 0 ? initialIndex : 0;
        setCurrentProblemIndex(resolvedIndex);

        const firstProblem = examProblems[resolvedIndex];
        setCode(
          nextSolutions[firstProblem?.problem_id]
          ?? firstProblem?.starter_code
          ?? starterCode[start.language || languageOptions[3].value]
          ?? ""
        );
      } catch (error) {
        const message =
          error?.response?.data?.detail ||
          error?.response?.data?.message ||
          error?.message ||
          "Unable to load programming exam.";
        setLoadError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadExam();
  }, [examId]);

  useEffect(() => {
    if (!previewVideoRef.current) return;
    if (!cameraStream) {
      previewVideoRef.current.srcObject = null;
      return;
    }

    previewVideoRef.current.srcObject = cameraStream;
    previewVideoRef.current.play().catch(() => { void 0; });
  }, [cameraStream]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (editorLocked) return undefined;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [editorLocked]);

  useEffect(() => {
    if (!attemptId) return;

    let cancelled = false;

    const syncSession = async () => {
      try {
        const session = await programmingExamService.getAttemptSession(attemptId);
        if (cancelled) return;

        setAttemptStatus(session.status || "IN_PROGRESS");
        setTimeLeft(Math.max(0, Number(session.remaining_seconds) || 0));

        const isOpen = ["IN_PROGRESS", "LIVE", "FLAGGED"].includes(session.status || "");
        if (!isOpen) {
          setEditorLocked(true);
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
  }, [attemptId]);

  useEffect(() => {
    if (!currentProblem) return;
    setCode(
      solutionsByProblem[currentProblem.problem_id]
      ?? currentProblem.starter_code
      ?? starterCode[language]
      ?? ""
    );
  }, [currentProblem, language, solutionsByProblem]);

  useEffect(() => {
    if (!currentProblem) return;
    setSolutionsByProblem((prev) => {
      if (prev[currentProblem.problem_id] === code) {
        return prev;
      }
      return {
        ...prev,
        [currentProblem.problem_id]: code,
      };
    });
  }, [code, currentProblem]);

  useEffect(() => {
    if (!attemptId || loading || editorLocked || isSubmitting) return undefined;

    const timeoutId = setTimeout(() => {
      const nextSolutionPayload = buildSolutionPayload();
      void programmingExamService.saveDraft({
        attempt_id: attemptId,
        language,
        source_code: code,
        solutions: nextSolutionPayload,
      }).catch((error) => {
        if (error?.response?.status === 409) {
          setAttemptStatus("COMPLETED");
          setEditorLocked(true);
          setTimeLeft(0);
        }
      });
    }, DRAFT_SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [attemptId, buildSolutionPayload, code, editorLocked, isSubmitting, language, loading]);

  const handleRun = () => {
    void (async () => {
      setIsRunning(true);
      setOutput("Running...");
      setErrorOutput("Checking for errors...");

      try {
        const result = await codeExecutionService.execute({
          language,
          source_code: code,
          stdin: customInput,
        });

        const nextOutput =
          [result.stdout?.trimEnd(), result.stderr?.trimEnd()]
            .filter(Boolean)
            .join("\n") ||
          "No output produced.";

        setOutput(nextOutput);
        setErrorOutput(result.stderr ? result.stderr.trimEnd() : "No errors detected.");
      } catch (error) {
        const message =
          error?.response?.data?.detail ||
          error?.response?.data?.message ||
          error?.message ||
          "Execution request failed.";

        setOutput("No output produced.");
        setErrorOutput(message);
      } finally {
        setIsRunning(false);
      }
    })();
  };

  const ensureAttemptId = useCallback(async () => attemptId, [attemptId]);

  const handleSubmit = useCallback((submitReason = "manual") => {
    void (async () => {
      try {
        if (submitTriggeredRef.current) return;
        const resolvedAttemptId = await ensureAttemptId();
        if (!resolvedAttemptId) {
          setErrorOutput("Unable to submit: attempt not initialized.");
          setActiveTab("errors");
          return;
        }

        submitTriggeredRef.current = true;
        setIsSubmitting(true);
        setEditorLocked(true);
        setTestCaseOutput("Submitting...\nRunning hidden test cases across all problems.");
        setActiveTab("tests");
        const nextSolutionPayload = buildSolutionPayload();
        const sourceCodeToSubmit =
          code || currentProblem?.starter_code || starterCode[language] || "#";

        const result = await programmingExamService.submitExam({
          attempt_id: resolvedAttemptId,
          language,
          source_code: sourceCodeToSubmit,
          solutions: nextSolutionPayload,
          submit_reason: submitReason,
        });

        const summary = `Problems: ${problems.length}\nPassed: ${result.passed}/${result.total}\nScore: ${result.score}\nStatus: ${result.status}`;
        setTestCaseOutput(`Submission evaluated.\n\n${summary}`);
        setSubmitSummary(summary);
        setAttemptStatus(result.status || "COMPLETED");
        setTimeLeft(0);
        setShowSubmitResult(true);
      } catch (error) {
        submitTriggeredRef.current = false;
        if (submitReason === "manual") {
          setEditorLocked(false);
        }
        const message =
          error?.response?.data?.detail ||
          error?.response?.data?.message ||
          error?.message ||
          "Submission failed.";
        setErrorOutput(message);
        setActiveTab("errors");
      } finally {
        setIsSubmitting(false);
      }
    })();
  }, [buildSolutionPayload, code, currentProblem?.starter_code, ensureAttemptId, language, problems.length]);

  useEffect(() => {
    if (!attemptId || editorLocked || submitTriggeredRef.current) return;
    if (timeLeft > 0) return;

    handleSubmit("timeout");
  }, [attemptId, editorLocked, handleSubmit, timeLeft]);

  useEffect(() => {
    if (!examTerminated) return;
    if (violationSubmitTriggeredRef.current) return;

    violationSubmitTriggeredRef.current = true;
    submitTriggeredRef.current = true;
    setEditorLocked(true);

    void (async () => {
      try {
        const resolvedAttemptId = await ensureAttemptId();
        if (resolvedAttemptId) {
          const nextSolutionPayload = buildSolutionPayload();
          await programmingExamService.submitExam({
            attempt_id: resolvedAttemptId,
            language,
            source_code: code,
            solutions: nextSolutionPayload,
            submit_reason: "violation",
          });
        }
      } catch {
        void 0;
      } finally {
        finishExam();
      }
    })();
  }, [buildSolutionPayload, code, ensureAttemptId, examTerminated, finishExam, language]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-700 flex items-center justify-center">
        Loading programming exam...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-700 flex items-center justify-center px-6 text-center">
        {loadError}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {examTerminated && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-red-600">Exam Locked</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              The programming exam was stopped after reaching the maximum proctoring warnings.
            </p>
            <button
              type="button"
              onClick={finishExam}
              className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      )}

      {warningMessage && !examTerminated && (
        <div className="fixed right-4 top-20 z-50 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 shadow-lg">
          Warning {warnings}/{MAX_WARNINGS}: {warningMessage}
        </div>
      )}

      {!isFullscreen && !examTerminated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-2xl">
            <h2 className="text-xl font-bold text-red-600">Fullscreen Required</h2>
            <p className="mt-2 text-sm text-slate-600">
              Re-enter fullscreen to continue your programming exam.
            </p>
            <button
              type="button"
              onClick={() => document.documentElement.requestFullscreen().catch(() => { void 0; })}
              className="mt-5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Re-enter Fullscreen
            </button>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-white">
              Exam
            </div>
            <div>
              <p className="text-sm text-slate-500">{exam?.title || "Programming Exam"}</p>
              <h1 className="text-lg font-semibold text-slate-900">Online Programming Test</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
              <Clock className="h-4 w-4 text-slate-500" />
              {formatTime(timeLeft)}
            </div>
            {editorLocked && (
              <div className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
                {attemptStatus === "COMPLETED" && timeLeft === 0 ? "Time Expired" : "Editor Locked"}
              </div>
            )}
            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 sm:flex">
              <UserCircle className="h-4 w-4 text-slate-500" />
              {displayName}
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              onClick={() => setShowSubmitConfirm(true)}
              disabled={isSubmitting || editorLocked}
            >
              <UploadCloud className="h-4 w-4" />
              {isSubmitting ? "Submitting..." : editorLocked ? "Exam Submitted" : "Submit Exam"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-72px)] max-w-[1800px] flex-col gap-4 px-4 pb-6 pt-4 sm:px-6">
        <div className="grid flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)_minmax(240px,300px)]">
          <section className="flex max-h-[calc(100vh-132px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Problems</p>
              <div className="mt-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">{currentProblem?.title || "-"}</h2>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {currentProblem?.difficulty || "-"}
                </span>
              </div>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4 pt-3 text-sm text-slate-700">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Problem Navigator</h3>
                <div className="mt-3 space-y-2">
                  {problems.map((item, index) => {
                    const isSelected = index === currentProblemIndex;
                    const currentSolution = solutionsByProblem[item.problem_id] ?? "";
                    const touched = currentSolution.trim().length > 0 && currentSolution !== (item.starter_code || "");
                    return (
                      <button
                        key={item.problem_id}
                        type="button"
                        onClick={() => setCurrentProblemIndex(index)}
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                          isSelected
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">Problem {index + 1}</p>
                          <p className="mt-1 text-sm font-semibold">{item.title}</p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                          isSelected
                            ? "bg-white/15 text-white"
                            : touched
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600"
                        }`}>
                          {touched ? "Edited" : "Unchanged"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Problem Statement</h3>
                <p className="mt-2 leading-6 text-slate-700">{currentProblem?.description || currentProblem?.statement || "-"}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Input Format</h3>
                <p className="mt-2 leading-6 text-slate-700">{currentProblem?.input_format || "-"}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Output Format</h3>
                <p className="mt-2 leading-6 text-slate-700">{currentProblem?.output_format || "-"}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Constraints</h3>
                <p className="mt-2 font-mono text-sm text-slate-700">{currentProblem?.constraints || "-"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sample Input</p>
                <pre className="mt-2 whitespace-pre-wrap font-mono text-sm text-slate-800">
                  {currentProblem?.sample_input || "-"}
                </pre>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sample Output</p>
                <pre className="mt-2 whitespace-pre-wrap font-mono text-sm text-slate-800">
                  {currentProblem?.sample_output || "-"}
                </pre>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sample Tests</p>
                <div className="mt-2 space-y-2">
                  {(currentProblem?.sample_tests || []).map((sample, index) => (
                    <div key={sample.id || index} className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Case {index + 1}</p>
                      <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-slate-800">{sample.input_data || "(no input)"}</pre>
                      <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-emerald-700">{sample.expected_output || "(no output)"}</pre>
                    </div>
                  ))}
                  {!(currentProblem?.sample_tests || []).length && (
                    <p className="text-xs text-slate-500">No sample tests provided.</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="flex min-h-0 flex-col gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Editor</p>
                  <h3 className="text-base font-semibold text-slate-900">Write your solution</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {currentProblem ? `Problem ${currentProblemIndex + 1}: ${currentProblem.title}` : "Select a problem"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={language}
                    onChange={(event) => setLanguage(event.target.value)}
                    disabled={editorLocked}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400"
                  >
                    {languageOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleRun}
                    disabled={isRunning || editorLocked}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-wait disabled:opacity-70"
                  >
                    <Play className="h-4 w-4" />
                    {isRunning ? "Running" : "Run"}
                  </button>
                </div>
              </div>
              <div className="h-[520px] overflow-hidden rounded-b-2xl bg-[#111827]">
                <Editor
                  height="100%"
                  theme="vs-dark"
                  language={selectedLanguage.monaco}
                  value={code}
                  onChange={(value) => setCode(value ?? "")}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 15,
                    lineNumbers: "on",
                    wordWrap: "on",
                    padding: { top: 16, bottom: 16 },
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    readOnly: editorLocked || isSubmitting,
                  }}
                />
              </div>
            </div>

            <div className="flex min-h-[260px] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Output Console
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "output", label: "Output" },
                    { key: "tests", label: "Test Cases" },
                    { key: "errors", label: "Error messages" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        activeTab === tab.key
                          ? "bg-slate-900 text-white"
                          : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex-1 rounded-xl bg-slate-950 p-4 text-sm text-slate-100">
                  <pre className="whitespace-pre-wrap font-mono">
                    {activeTab === "output"
                      ? output
                      : activeTab === "tests"
                        ? testCaseOutput
                        : errorOutput}
                  </pre>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Custom Input
                  </label>
                  <textarea
                    value={customInput}
                    onChange={(event) => setCustomInput(event.target.value)}
                    rows={3}
                    disabled={editorLocked}
                    className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                    placeholder="Enter custom input for running code"
                  />
                </div>
              </div>
            </div>
          </section>

          <aside className="flex flex-col gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Proctoring</p>
                  <h3 className="text-sm font-semibold text-slate-900">Webcam Preview</h3>
                </div>
                <Video className="h-5 w-5 text-slate-500" />
              </div>
              <div className="mt-4 overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-950">
                {cameraStream ? (
                  <video
                    ref={previewVideoRef}
                    muted
                    playsInline
                    autoPlay
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center px-4 text-center text-xs text-slate-400">
                    {cameraError || "Starting webcam preview..."}
                  </div>
                )}
              </div>
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Verify monitor checks the live camera feed continuously during the exam.
              </div>
              <div className={`mt-3 flex items-center gap-2 text-xs font-semibold ${
                monitorVerified ? "text-emerald-600" : cameraError ? "text-red-600" : "text-sky-600"
              }`}>
                <ShieldCheck className="h-4 w-4" />
                {verificationLabel}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Live Alerts</h3>
              <div className="mt-3 space-y-3">
                {visibleAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-3 rounded-xl p-3 text-xs ${
                      alert.level === "warning"
                        ? "border border-amber-200 bg-amber-50 text-amber-900"
                        : "border border-sky-200 bg-sky-50 text-sky-900"
                    }`}
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4" />
                    <div>
                      <p className="font-semibold">{alert.message}</p>
                      <p className={`mt-1 ${alert.level === "warning" ? "text-amber-700" : "text-sky-700"}`}>
                        {alert.level === "warning"
                          ? `Warning ${warnings} of ${MAX_WARNINGS} issued.`
                          : "Monitoring event recorded."}
                      </p>
                    </div>
                  </div>
                ))}
                {!visibleAlerts.length && (
                  <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                    <ShieldCheck className="mt-0.5 h-4 w-4" />
                    <div>
                      <p className="font-semibold">No violations detected</p>
                      <p className="mt-1 text-emerald-700">Live proctoring is active for this exam.</p>
                    </div>
                  </div>
                )}
                <div className={`flex items-start gap-3 rounded-xl p-3 text-xs ${
                  isOnline
                    ? "border border-slate-200 bg-slate-50 text-slate-700"
                    : "border border-red-200 bg-red-50 text-red-900"
                }`}>
                  {isOnline ? <Wifi className="mt-0.5 h-4 w-4 text-slate-500" /> : <WifiOff className="mt-0.5 h-4 w-4" />}
                  <div>
                    <p className="font-semibold">{isOnline ? "Network stable" : "Network disconnected"}</p>
                    <p className={`mt-1 ${isOnline ? "text-slate-500" : "text-red-700"}`}>
                      {isOnline
                        ? "No connectivity issue detected right now."
                        : "Reconnect to avoid submission or monitoring problems."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Exam Checklist</h3>
              <ul className="mt-3 space-y-2 text-xs text-slate-600">
                <li>{isFullscreen ? "Fullscreen mode active" : "Fullscreen mode needs attention"}</li>
                <li>{cameraReady ? "Webcam monitoring enabled" : "Waiting for webcam access"}</li>
                <li>{monitorVerified ? "Face verification healthy" : "Verification monitor running"}</li>
                <li>{`${problems.length} problem${problems.length === 1 ? "" : "s"} available in this exam`}</li>
              </ul>
            </div>
          </aside>
        </div>
      </main>

      {showSubmitConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Submit Exam?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to submit all solutions? You won't be able to edit after submission.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSubmitConfirm(false);
                  handleSubmit("manual");
                }}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Yes, Submit
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showSubmitResult ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Submission Result</h3>
            <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
              {submitSummary}
            </pre>
            <p className="mt-3 text-sm text-slate-600">Where would you like to go next?</p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => navigate("/programming")}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Programming
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


