import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { verifyMonitor } from "../services/authService";
import assessmentService from "../services/assessmentService";
import { ExamContext } from "./exam-context";
import {
  drawVideoFrameCover,
  MONITOR_FRAME_HEIGHT,
  MONITOR_FRAME_WIDTH,
  USER_FACING_CAMERA_CONSTRAINTS,
} from "../utils/camera";


function getMonitoringEmail() {
  const directEmail = localStorage.getItem("userEmail");
  if (directEmail) return directEmail;

  try {
    const authUserRaw = localStorage.getItem("auth_user");
    const authUser = authUserRaw ? JSON.parse(authUserRaw) : null;
    return authUser?.email || "";
  } catch {
    return "";
  }
}

function isProgrammingExamRoute(pathname) {
  return /^\/programming-exam\/[^/]+\/start$/.test(pathname || "");
}

function isAssessmentExamRoute(pathname) {
  return pathname === "/assessment/start";
}

export default function ExamProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [warnings, setWarnings] = useState(0);
  const [warningMessage, setWarningMessage] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [examTerminated, setExamTerminated] = useState(false);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [monitorVerified, setMonitorVerified] = useState(false);

  const MAX_WARNINGS = 3;

  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const monitoringPathRef = useRef("");
  const monitoringSessionRef = useRef(null);
  const shouldMonitor =
    !examTerminated &&
    (
      (isAssessmentExamRoute(location.pathname) && sessionStorage.getItem("faceVerified") === "true")
      || isProgrammingExamRoute(location.pathname)
    );

  const addAlert = useCallback((message, level = "warning") => {
    setLiveAlerts((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        message,
        level,
        timestamp: Date.now(),
      },
      ...prev,
    ].slice(0, 6));
  }, []);

  const reportProctorEvent = useCallback(async (eventType, message) => {
    const session = monitoringSessionRef.current;
    if (!session?.attemptId || session.type !== "assessment") return;

    try {
      await assessmentService.reportProctoringEvent(session.attemptId, {
        event_type: eventType,
        message,
      });
    } catch {
      void 0;
    }
  }, []);

  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraStream(null);
    setCameraReady(false);
    setMonitorVerified(false);
  }, []);

  /* ================= WARNING HANDLER ================= */
  const handleWarning = useCallback((reason, eventType = "monitor_warning") => {
    setWarningMessage(reason);
    addAlert(reason, "warning");
    void reportProctorEvent(eventType, reason);

    setWarnings((prev) => {
      const newCount = prev + 1;
      if (newCount >= MAX_WARNINGS) {
        setExamTerminated(true);
      }
      return newCount;
    });

    setTimeout(() => {
      setWarningMessage("");
    }, 2000);
  }, [MAX_WARNINGS, addAlert, reportProctorEvent]);

  /* ================= FULLSCREEN + TAB MONITOR ================= */
  useEffect(() => {
    if (!shouldMonitor) {
      setIsFullscreen(true);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => { void 0; });
      }
      return;
    }

    const enterFullscreen = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        }
      } catch { void 0; }
    };

    enterFullscreen();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleWarning("Tab switching detected", "tab_switch");
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        handleWarning("Exited fullscreen mode", "fullscreen_exit");
      } else {
        setIsFullscreen(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [handleWarning, shouldMonitor]);

  /* ================= CONTINUOUS FACE MONITORING ================= */
  useEffect(() => {
    if (!shouldMonitor) return;

    if (monitoringPathRef.current !== location.pathname) {
      setWarnings(0);
      setWarningMessage("");
      setLiveAlerts([]);
      setCameraError("");
      monitoringPathRef.current = location.pathname;
    }

    let mismatchCount = 0;
    let noFaceSince = null;
    let noFaceWarningSent = false;
    let isVerifying = false;

    const startMonitoring = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: USER_FACING_CAMERA_CONSTRAINTS,
        });

        streamRef.current = stream;
        setCameraStream(stream);
        setCameraReady(true);
        setCameraError("");
        addAlert("Proctoring camera connected", "info");

        const video = document.createElement("video");
        video.srcObject = stream;
        await video.play();

        const canvas = document.createElement("canvas");

        const email = getMonitoringEmail();

        if (!email) {
          setCameraError("Unable to identify the logged-in student for face monitoring.");
          stream.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          setCameraStream(null);
          setCameraReady(false);
          return;
        }

        intervalRef.current = setInterval(async () => {
          if (isVerifying) return;
          if (!video.videoWidth || !video.videoHeight) return;
          isVerifying = true;

          const drawn = drawVideoFrameCover(video, canvas, {
            width: MONITOR_FRAME_WIDTH,
            height: MONITOR_FRAME_HEIGHT,
          });
          if (!drawn) {
            isVerifying = false;
            return;
          }

          const imageData = canvas.toDataURL("image/jpeg", 0.6);

          try {
            const data = await verifyMonitor({
              email,
              image: imageData,
            });

            /* ===== MULTI FACE DETECTION ===== */
            if (data.error === "multiple_faces") {
              noFaceSince = null;
              noFaceWarningSent = false;
              setMonitorVerified(false);
              handleWarning("Multiple faces detected", "multiple_faces");
              return;
            }

            /* ===== NO FACE DETECTED ===== */
            if (data.error === "face_not_detected") {
              setMonitorVerified(false);
              if (!noFaceSince) {
                noFaceSince = Date.now();
              }

              const noFaceDurationMs = Date.now() - noFaceSince;
              if (noFaceDurationMs >= 5000 && !noFaceWarningSent) {
                handleWarning("No face detected for more than 5 seconds", "no_face_detected");
                noFaceWarningSent = true;
              }
              return;
            }

            noFaceSince = null;
            noFaceWarningSent = false;
            setMonitorVerified(Boolean(data.verified));

            /* ===== FACE MISMATCH ===== */
            if (!data.verified && data.similarity < 0.60) {
              mismatchCount++;

              if (mismatchCount >= 2) {
                handleWarning("Face mismatch detected", "face_mismatch");
                mismatchCount = 0;
              }
            } else {
              mismatchCount = 0;
            }

          } catch { void 0; }
          finally {
            isVerifying = false;
          }
        }, 1000); // every 1 second

      } catch {
        setCameraError("Camera access denied");
        setCameraReady(false);
        setMonitorVerified(false);
        handleWarning("Camera access denied", "camera_access_denied");
      }
    };

    startMonitoring();

    return () => {
      stopMonitoring();
    };
  }, [addAlert, handleWarning, location.pathname, shouldMonitor, stopMonitoring]);

  useEffect(() => {
    if (!isProgrammingExamRoute(location.pathname) && !isAssessmentExamRoute(location.pathname)) {
      setWarnings(0);
      setWarningMessage("");
      setLiveAlerts([]);
      setExamTerminated(false);
      setCameraError("");
      monitoringPathRef.current = "";
      monitoringSessionRef.current = null;
      stopMonitoring();
    }
  }, [location.pathname, stopMonitoring]);

  /* ================= FINISH EXAM ================= */
  const finishExam = useCallback(() => {
    stopMonitoring();
    monitoringSessionRef.current = null;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => { void 0; });
    }

    sessionStorage.removeItem("faceVerified");
    navigate("/dashboard", { replace: true });
  }, [navigate, stopMonitoring]);

  return (
    <ExamContext.Provider
      value={{
        warnings,
        warningMessage,
        isFullscreen,
        MAX_WARNINGS,
        examTerminated,
        liveAlerts,
        cameraStream,
        cameraError,
        cameraReady,
        monitorVerified,
        registerMonitoringSession: (session) => {
          monitoringSessionRef.current = session;
        },
        clearMonitoringSession: () => {
          monitoringSessionRef.current = null;
        },
        stopMonitoring,
        finishExam,
      }}
    >
      {children}
    </ExamContext.Provider>
  );
}



