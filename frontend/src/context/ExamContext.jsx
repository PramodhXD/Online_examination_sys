import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { verifyMonitor } from "../services/authService";
import { ExamContext } from "./exam-context";
import {
  drawVideoFrameCover,
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

export default function ExamProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [warnings, setWarnings] = useState(0);
  const [warningMessage, setWarningMessage] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [examTerminated, setExamTerminated] = useState(false);

  const MAX_WARNINGS = 3;

  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const stopMonitoring = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  /* ================= WARNING HANDLER ================= */
  const handleWarning = (reason) => {
    setWarningMessage(reason);

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
  };

  /* ================= FULLSCREEN + TAB MONITOR ================= */
  useEffect(() => {
    const isAssessmentRoute = location.pathname === "/assessment/start";
    const isAssessmentStarted =
      sessionStorage.getItem("faceVerified") === "true";
    const shouldEnforceFullscreen =
      isAssessmentRoute && isAssessmentStarted && !examTerminated;

    if (!shouldEnforceFullscreen) {
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
        handleWarning("Tab switching detected");
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        handleWarning("Exited fullscreen mode");
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
  }, [examTerminated, location.pathname]);

  /* ================= CONTINUOUS FACE MONITORING ================= */
  useEffect(() => {
    const isAssessmentStarted =
      sessionStorage.getItem("faceVerified") === "true";
    const isAssessmentRoute = location.pathname === "/assessment/start";
    if (examTerminated || !isAssessmentStarted || !isAssessmentRoute) return;

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

        const video = document.createElement("video");
        video.srcObject = stream;
        await video.play();

        const canvas = document.createElement("canvas");

        const email = getMonitoringEmail();

        if (!email) {
          return;
        }

        intervalRef.current = setInterval(async () => {
          if (isVerifying) return;
          if (!video.videoWidth || !video.videoHeight) return;
          isVerifying = true;

          const drawn = drawVideoFrameCover(video, canvas);
          if (!drawn) {
            isVerifying = false;
            return;
          }

          const imageData = canvas.toDataURL("image/jpeg", 0.8);

          try {
            const data = await verifyMonitor({
              email,
              image: imageData,
            });

            /* ===== MULTI FACE DETECTION ===== */
            if (data.error === "multiple_faces") {
              noFaceSince = null;
              noFaceWarningSent = false;
              handleWarning("Multiple faces detected");
              return;
            }

            /* ===== NO FACE DETECTED ===== */
            if (data.error === "face_not_detected") {
              if (!noFaceSince) {
                noFaceSince = Date.now();
              }

              const noFaceDurationMs = Date.now() - noFaceSince;
              if (noFaceDurationMs >= 5000 && !noFaceWarningSent) {
                handleWarning("No face detected for more than 5 seconds");
                noFaceWarningSent = true;
              }
              return;
            }

            noFaceSince = null;
            noFaceWarningSent = false;

            /* ===== FACE MISMATCH ===== */
            if (!data.verified && data.similarity < 0.60) {
              mismatchCount++;

              if (mismatchCount >= 2) {
                handleWarning("Face mismatch detected");
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
        handleWarning("Camera access denied");
      }
    };

    startMonitoring();

    return () => {
      stopMonitoring();
    };
  }, [examTerminated, location.pathname]);

  /* ================= FINISH EXAM ================= */
  const finishExam = () => {
    stopMonitoring();
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => { void 0; });
    }

    sessionStorage.removeItem("faceVerified");
    navigate("/dashboard", { replace: true });
  };

  return (
    <ExamContext.Provider
      value={{
        warnings,
        warningMessage,
        isFullscreen,
        MAX_WARNINGS,
        examTerminated,
        stopMonitoring,
        finishExam,
      }}
    >
      {children}
    </ExamContext.Provider>
  );
}



