import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ClipboardList,
  Clock,
  AlertTriangle,
  ListChecks,
  Info,
} from "lucide-react";
import DashboardLayout from "../../components/dashboard/layout/DashboardLayout";

export default function AssessmentInstructions() {
  const [agreed, setAgreed] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // 🔥 Use category instead of type (backend compatible)
  const categoryId = params.get("category");

  const handleStart = () => {
    if (!categoryId) return;

    sessionStorage.removeItem("faceVerified");

    // ✅ Pass category to face verification
    navigate(`/student/face-verification?category=${categoryId}`);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto py-10">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">

          {/* ================= HEADER ================= */}
          <div className="px-8 py-6 border-b">
            <h1 className="text-2xl font-semibold text-gray-900">
              Assessment Instructions
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Read carefully before starting the assessment.
            </p>
          </div>

          {/* ================= CONTENT ================= */}
          <div className="px-8 py-6 space-y-10 text-sm text-gray-700 leading-relaxed">

            {/* GENERAL RULES */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-gray-900">
                  General Instructions
                </h2>
              </div>
              <ul className="list-decimal pl-6 space-y-2">
                <li>This is an <b>official assessment</b>.</li>
                <li>The test is <b>time-bound</b> and auto-submits on timeout.</li>
                <li>You cannot restart once submitted.</li>
                <li>Do not refresh or close the browser.</li>
                <li><b>Face verification is mandatory</b> before starting.</li>
              </ul>
            </section>

            {/* TIME & QUESTIONS */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-purple-600" />
                <h2 className="font-semibold text-gray-900">
                  Time & Questions
                </h2>
              </div>
              <ul className="list-disc pl-6 space-y-2">
                <li>Total Time: <b>60 Minutes</b></li>
                <li>Total Questions: <b>60</b></li>
                <li>Each question carries equal marks.</li>
              </ul>
            </section>

            {/* QUESTION STATUS */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <ListChecks className="w-5 h-5 text-green-600" />
                <h2 className="font-semibold text-gray-900">
                  Question Status
                </h2>
              </div>
              <ul className="space-y-1">
                <li><b>Not Visited</b> – Question not opened</li>
                <li><b>Not Answered</b> – Opened but not answered</li>
                <li><b>Answered</b> – Answer selected</li>
                <li><b>Marked for Review</b> – Answered but flagged</li>
              </ul>
            </section>

            {/* WARNING BOX */}
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700">
              <AlertTriangle className="w-5 h-5 mt-0.5 text-red-600" />
              <p>
                Switching tabs, minimizing the browser, or exiting may lead to
                <b> auto-submission</b>.
              </p>
            </div>

            {/* INFO BOX */}
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-blue-800">
              <Info className="w-5 h-5 mt-0.5 text-blue-600" />
              <p>
                Your final score will be calculated based on correct answers only.
              </p>
            </div>

          </div>

          {/* ================= FOOTER ================= */}
          <div className="px-8 py-5 border-t bg-gray-50 flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={agreed}
                onChange={() => setAgreed(!agreed)}
                className="w-4 h-4"
              />
              I have read and understood the instructions.
            </label>

            <button
              disabled={!agreed || !categoryId}
              onClick={handleStart}
              className={`px-6 py-2 rounded-md text-sm font-semibold text-white transition
                ${
                  agreed && categoryId
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
            >
              Proceed to Face Verification
            </button>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
