import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Camera, CheckCircle, AlertTriangle } from "lucide-react";
import DashboardLayout from "../../components/dashboard/layout/DashboardLayout";
import { verifyFace } from "../../services/authService";
import {
  drawVideoFrameCover,
  USER_FACING_CAMERA_CONSTRAINTS,
} from "../../utils/camera";

export default function FaceVerification() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const categoryId = params.get("category");

  const email =
    localStorage.getItem("userEmail") ||
    (() => {
      try {
        const authUser = localStorage.getItem("auth_user");
        return authUser ? JSON.parse(authUser)?.email : "";
      } catch {
        return "";
      }
    })();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const mapFaceError = (detail) => {
    if (detail === "face_not_detected") {
      return "No face detected. Keep your face centered and try again.";
    }
    if (detail === "multiple_faces") {
      return "Multiple faces detected. Ensure only one person is visible.";
    }
    return detail || "Verification error. Try again.";
  };

  useEffect(() => {
    let mediaStream = null;

    const startCamera = async () => {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: USER_FACING_CAMERA_CONSTRAINTS,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch {
        setError("Camera permission is required");
      }
    };

    startCamera();

    return () => {
      if (mediaStream) mediaStream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleVerify = async () => {
    if (!email) {
      setError("User email not found. Please login again.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const canvas = canvasRef.current;
      const video = videoRef.current;

      if (!video.videoWidth) {
        setError("Camera not ready. Please wait.");
        setLoading(false);
        return;
      }

      const drawn = drawVideoFrameCover(video, canvas);
      if (!drawn) {
        setError("Unable to capture camera frame. Please try again.");
        setLoading(false);
        return;
      }

      const image = canvas.toDataURL("image/jpeg", 0.8);
      const res = await verifyFace({ email, image });

      if (res.verified) {
        sessionStorage.setItem("faceVerified", "true");
        if (categoryId) {
          navigate(`/assessment/start?category=${categoryId}`);
        } else {
          navigate("/dashboard");
        }
      } else {
        const score =
          typeof res?.similarity === "number" ? ` (score: ${res.similarity.toFixed(3)})` : "";
        setError(`Face verification failed${score}. Please try again.`);
      }
    } catch (err) {
      const backendMessage =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "";
      setError(mapFaceError(backendMessage));
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center py-12 px-4">
        <div className="bg-white w-full max-w-xl rounded-2xl shadow-lg p-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Camera className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-semibold text-gray-900">Face Verification</h1>
          </div>

          <p className="text-sm text-gray-500 mb-6">
            Please look straight at the camera to verify your identity.
          </p>

          <div className="relative mx-auto w-full max-w-md aspect-video bg-black rounded-xl overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-52 h-52 border-4 border-dashed border-blue-400 rounded-full opacity-80"></div>
            </div>
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {error && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          <button
            onClick={handleVerify}
            disabled={loading}
            className={`mt-6 w-full py-3 rounded-xl text-white font-semibold transition ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {loading ? "Verifying..." : (categoryId ? "Verify & Start Exam" : "Verify Face")}
          </button>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
            <CheckCircle className="w-4 h-4 text-green-500" />
            {categoryId
              ? "Face verification is mandatory before starting the exam"
              : "Face verification completed for your account"}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
