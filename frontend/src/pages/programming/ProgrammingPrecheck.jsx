import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock3,
  Code2,
  RefreshCw,
  ShieldCheck,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import programmingExamService from "../../services/programmingExamService";

const allowedLanguages = ["C", "C++", "Java", "Python"];

function formatSpeedLabel(speedMbps) {
  if (!Number.isFinite(speedMbps) || speedMbps <= 0) return "Unavailable";
  if (speedMbps >= 10) return `${speedMbps.toFixed(1)} Mbps • Strong`;
  if (speedMbps >= 3) return `${speedMbps.toFixed(1)} Mbps • Good`;
  if (speedMbps >= 1) return `${speedMbps.toFixed(1)} Mbps • Fair`;
  return `${speedMbps.toFixed(1)} Mbps • Weak`;
}

export default function ProgrammingPrecheck() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [cameraStatus, setCameraStatus] = useState("checking");
  const [cameraMessage, setCameraMessage] = useState("Checking camera access...");
  const [networkStatus, setNetworkStatus] = useState("checking");
  const [networkMessage, setNetworkMessage] = useState("Checking connection speed...");
  const [networkSpeedMbps, setNetworkSpeedMbps] = useState(null);
  const [starting, setStarting] = useState(false);

  const checksPassing = cameraStatus === "passed" && networkStatus === "passed";
  const rules = useMemo(() => ([
    "Keep your camera on and remain visible throughout the exam.",
    "Do not switch tabs or exit fullscreen once the exam begins.",
    "Submit before time expires. Active attempts resume automatically.",
  ]), []);

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
        setExam(detail);
      } catch (error) {
        const message =
          error?.response?.data?.detail ||
          error?.response?.data?.message ||
          error?.message ||
          "Unable to load programming exam details.";
        setLoadError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadExam();
  }, [examId]);

  useEffect(() => {
    let active = true;

    const runCameraCheck = async () => {
      if (!navigator?.mediaDevices?.getUserMedia) {
        if (!active) return;
        setCameraStatus("failed");
        setCameraMessage("Camera API is not available in this browser.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((track) => track.stop());
        if (!active) return;
        setCameraStatus("passed");
        setCameraMessage("Camera access is available.");
      } catch {
        if (!active) return;
        setCameraStatus("failed");
        setCameraMessage("Camera access is blocked. Please allow camera permission.");
      }
    };

    void runCameraCheck();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const runNetworkCheck = async () => {
      setNetworkStatus("checking");
      setNetworkMessage("Checking connection speed...");

      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setNetworkStatus("failed");
        setNetworkMessage("You appear to be offline.");
        setNetworkSpeedMbps(0);
        return;
      }

      try {
        const startTime = performance.now();
        const response = await fetch(`/favicon.ico?precheck=${Date.now()}`, {
          cache: "no-store",
        });
        const blob = await response.blob();
        const elapsedSeconds = Math.max((performance.now() - startTime) / 1000, 0.001);
        const bitsLoaded = Math.max(blob.size, 1) * 8;
        const speedMbps = bitsLoaded / elapsedSeconds / 1_000_000;

        if (cancelled) return;

        setNetworkSpeedMbps(speedMbps);
        if (speedMbps > 0) {
          setNetworkStatus("passed");
          setNetworkMessage(formatSpeedLabel(speedMbps));
          return;
        }
      } catch {
        void 0;
      }

      const estimatedDownlink = Number(navigator?.connection?.downlink || 0);
      if (cancelled) return;

      if (estimatedDownlink > 0) {
        setNetworkSpeedMbps(estimatedDownlink);
        setNetworkStatus("passed");
        setNetworkMessage(`${estimatedDownlink.toFixed(1)} Mbps • Estimated from browser connection`);
      } else {
        setNetworkStatus("passed");
        setNetworkMessage("Connected online. Speed estimate is unavailable right now.");
      }
    };

    void runNetworkCheck();

    return () => {
      cancelled = true;
    };
  }, []);

  const rerunChecks = async () => {
    setCameraStatus("checking");
    setCameraMessage("Checking camera access...");
    setNetworkStatus("checking");
    setNetworkMessage("Checking connection speed...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      setCameraStatus("passed");
      setCameraMessage("Camera access is available.");
    } catch {
      setCameraStatus("failed");
      setCameraMessage("Camera access is blocked. Please allow camera permission.");
    }

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setNetworkStatus("failed");
      setNetworkMessage("You appear to be offline.");
      setNetworkSpeedMbps(0);
      return;
    }

    try {
      const startTime = performance.now();
      const response = await fetch(`/favicon.ico?precheck=${Date.now()}`, {
        cache: "no-store",
      });
      const blob = await response.blob();
      const elapsedSeconds = Math.max((performance.now() - startTime) / 1000, 0.001);
      const bitsLoaded = Math.max(blob.size, 1) * 8;
      const speedMbps = bitsLoaded / elapsedSeconds / 1_000_000;
      setNetworkSpeedMbps(speedMbps);
      setNetworkStatus(speedMbps > 0 ? "passed" : "failed");
      setNetworkMessage(speedMbps > 0 ? formatSpeedLabel(speedMbps) : "Unable to measure internet speed right now.");
    } catch {
      const estimatedDownlink = Number(navigator?.connection?.downlink || 0);
      if (estimatedDownlink > 0) {
        setNetworkSpeedMbps(estimatedDownlink);
        setNetworkStatus("passed");
        setNetworkMessage(`${estimatedDownlink.toFixed(1)} Mbps • Estimated from browser connection`);
      } else {
        setNetworkStatus("passed");
        setNetworkMessage("Connected online. Speed estimate is unavailable right now.");
      }
    }
  };

  const handleStart = async () => {
    try {
      setStarting(true);
      const start = await programmingExamService.startExam(examId);
      const suffix = start?.resumed ? "?resume=1" : "";
      navigate(`/programming-exam/${examId}/start${suffix}`, { replace: true });
    } catch (error) {
      const message =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        "Unable to start programming exam.";
      setLoadError(message);
    } finally {
      setStarting(false);
    }
  };

  const renderCheckBadge = (status) => {
    if (status === "passed") {
      return <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Passed</span>;
    }
    if (status === "failed") {
      return <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">Needs Attention</span>;
    }
    return <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Checking</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-600">
        Loading pre-exam checks...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        <div className="w-full max-w-xl rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-10 w-10 text-rose-600" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">Unable to prepare the exam</h1>
          <p className="mt-3 text-sm text-rose-700">{loadError}</p>
          <button
            type="button"
            onClick={() => navigate("/programming", { replace: true })}
            className="mt-6 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Back to Programming
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_32%),linear-gradient(180deg,_#f8fbff_0%,_#f1f5f9_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">Programming Exam</p>
                <h1 className="mt-3 text-3xl font-bold text-slate-900">{exam?.title || "Pre-Exam Check"}</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                  Review the exam instructions, confirm your device is ready, and begin only when you are prepared.
                </p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
                Active attempts resume automatically
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <Clock3 className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Duration</span>
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-900">{exam?.duration_minutes || 0} min</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                <div className="flex items-center gap-2 text-slate-500">
                  <Code2 className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Allowed Languages</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {allowedLanguages.map((language) => (
                    <span
                      key={language}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700"
                    >
                      {language}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-slate-700" />
                <h2 className="text-lg font-semibold text-slate-900">Rules</h2>
              </div>
              <div className="mt-4 space-y-3">
                {rules.map((rule) => (
                  <div
                    key={rule}
                    className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">System Check</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Ready to Start</h2>
              </div>
              <button
                type="button"
                onClick={() => { void rerunChecks(); }}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Recheck
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-white p-3 text-slate-700">
                      <Camera className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Camera Access</h3>
                      <p className="mt-1 text-sm text-slate-600">{cameraMessage}</p>
                    </div>
                  </div>
                  {renderCheckBadge(cameraStatus)}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-white p-3 text-slate-700">
                      {networkStatus === "failed" ? <WifiOff className="h-5 w-5" /> : <Wifi className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Internet Speed</h3>
                      <p className="mt-1 text-sm text-slate-600">{networkMessage}</p>
                      {Number.isFinite(networkSpeedMbps) && networkSpeedMbps > 0 ? (
                        <p className="mt-2 text-xs font-medium text-slate-500">
                          Estimated speed: {networkSpeedMbps.toFixed(1)} Mbps
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {renderCheckBadge(networkStatus)}
                </div>
              </div>
            </div>

            <div className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
              checksPassing
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}>
              {checksPassing
                ? "Your device checks look good. You can start the exam now."
                : "Please complete the checks before starting the exam."}
            </div>

            <button
              type="button"
              onClick={() => { void handleStart(); }}
              disabled={!checksPassing || starting}
              className="mt-6 w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {starting ? "Preparing Exam..." : "Start Exam"}
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}
