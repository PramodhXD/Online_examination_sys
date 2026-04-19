import React, { useEffect, useRef, useState } from "react";
import { CheckCircle, RefreshCcw } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { createFaceTemplate, uploadFaceImages } from "../../services/authService";
import {
  drawVideoFrameCover,
  USER_FACING_CAMERA_CONSTRAINTS,
} from "../../utils/camera";

const CAPTURE_COUNT = 3;
const CAPTURE_INTERVAL = 1500; // ms

export default function FaceCapture() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const queryEmail = params.get("email");
  const mode = (params.get("mode") || "").toLowerCase();
  const isUpdateMode = mode === "update";
  const storedEmail =
    localStorage.getItem("userEmail") ||
    (() => {
      try {
        const authUser = localStorage.getItem("auth_user");
        return authUser ? JSON.parse(authUser)?.email || "" : "";
      } catch {
        return "";
      }
    })();
  const email = queryEmail || storedEmail;

  const [images, setImages] = useState([]);
  const [capturing, setCapturing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const mapFaceError = (detail) => {
    if (Array.isArray(detail)) {
      const firstMessage =
        detail.find((item) => typeof item === "string") ||
        detail.find((item) => typeof item?.msg === "string")?.msg;
      if (firstMessage) return mapFaceError(firstMessage);
      return "Failed to process face capture";
    }
    if (typeof detail === "object" && detail !== null) {
      if (typeof detail.detail === "string") return mapFaceError(detail.detail);
      if (typeof detail.message === "string") return mapFaceError(detail.message);
      if (typeof detail.msg === "string") return mapFaceError(detail.msg);
      return "Failed to process face capture";
    }
    if (detail === "face_not_detected") {
      return "No face detected. Keep your face centered and retry.";
    }
    if (detail === "multiple_faces") {
      return "Multiple faces detected. Make sure only one person is visible.";
    }
    return typeof detail === "string"
      ? detail
      : "Failed to process face capture";
  };

  /* 🎥 Start camera */
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
        setError("Camera permission is required to continue");
      }
    };

    startCamera();

    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  /* 📸 Auto capture logic */
  useEffect(() => {
    if (!capturing) return;

    let count = 0;
    const interval = setInterval(() => {
      captureFrame();
      count++;

      if (count >= CAPTURE_COUNT) {
        clearInterval(interval);
        setCapturing(false);
      }
    }, CAPTURE_INTERVAL);

    return () => clearInterval(interval);
  }, [capturing]);

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const drawn = drawVideoFrameCover(video, canvas);
    if (!drawn) return;

    const img = canvas.toDataURL("image/png");
    setImages((prev) => [...prev, img]);
  };

  const startCapture = () => {
    setImages([]);
    setError("");
    setCapturing(true);
  };

  const retake = () => {
    setImages([]);
    setCapturing(false);
  };

  /* 🚀 Send images to backend */
  const continueNext = async () => {
    if (!email) {
      setError("User email missing");
      return;
    }

    try {
      setUploading(true);

      const res = await uploadFaceImages({
        email,
        images,
      });

      if (!res?.template_created) {
        await createFaceTemplate(email);
      }

      navigate(isUpdateMode ? "/dashboard" : "/login");
    } catch (err) { void err;
      const detail = err?.response?.data?.detail ?? err?.response?.data;
      setError(mapFaceError(detail));
    } finally {
      setUploading(false);
    }
  };

  const completed = images.length === CAPTURE_COUNT;

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl p-8">
        <h2 className="text-2xl font-bold text-center">
          Face Verification
        </h2>
        <p className="text-center text-slate-500 text-sm mt-1">
          Please look straight at the camera. Photos will be captured automatically.
        </p>

          {email && (
          <p className="text-center text-xs text-slate-400 mt-2">
            User: <span className="font-medium">{email}</span>
          </p>
        )}

        {isUpdateMode && (
          <p className="text-center text-xs text-blue-600 mt-1">
            Updating your registered face will replace old saved face images.
          </p>
        )}

        {/* Camera */}
        <div className="relative mt-6 mx-auto w-full max-w-md aspect-video bg-black rounded-xl overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Face guide */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-52 h-52 border-4 border-dashed border-indigo-400 rounded-full opacity-80"></div>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {/* Status */}
        <div className="mt-4 text-center text-sm text-slate-600">
          {capturing && (
            <p>
              Capturing image {images.length + 1} of {CAPTURE_COUNT}…
            </p>
          )}

          {!capturing && !completed && (
            <p>Click start and hold still</p>
          )}

          {completed && (
            <div className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle />
              Face capture completed
            </div>
          )}
        </div>

        {/* Previews */}
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-4">
            {images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`face-${i}`}
                className="rounded-lg object-cover"
              />
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex gap-4">
          {!completed ? (
            <button
              onClick={startCapture}
              disabled={capturing}
              className={`flex-1 py-3 rounded-xl font-semibold ${
                capturing
                  ? "bg-slate-300 text-slate-500"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              {capturing ? "Capturing..." : "Start Auto Capture"}
            </button>
          ) : (
            <>
              <button
                onClick={retake}
                disabled={uploading}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-300 py-3 rounded-xl font-semibold"
              >
                <RefreshCcw size={18} />
                Retake
              </button>

              <button
                onClick={continueNext}
                disabled={uploading}
                className="flex-1 bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700"
              >
                {uploading ? "Uploading..." : "Continue"}
              </button>
            </>
          )}
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 p-2 rounded-lg">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

