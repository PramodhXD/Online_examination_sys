import { useLocation, useNavigate } from "react-router-dom";
import * as Motion from "framer-motion";
import { Trophy, CheckCircle, XCircle, Clock } from "lucide-react";
import certificateService from "../../services/certificateService";

function savePdfBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function AssessmentResult() {
  const { state } = useLocation();
  const navigate = useNavigate();

  if (!state) {
    return (
      <div className="p-10 text-center text-red-500">
        No result data found.
      </div>
    );
  }

  const {
    examName,
    total,
    attempted,
    correct,
    wrong,
    scorePercent,
    timeTaken,
    attemptId,
    certificateEligible,
  } = state;

  const passed = scorePercent >= 50;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-10">

      <Motion.motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-3xl"
      >

        <div className="text-center mb-8">
          <Trophy className="mx-auto text-yellow-500 mb-3" size={40} />
          <h1 className="text-2xl font-bold">{examName} Result</h1>
          <p className="text-gray-500 mt-2">
            Here is your assessment performance summary
          </p>
        </div>

        {/* SCORE BOX */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center mb-8">
          <h2 className="text-lg font-semibold">Final Score</h2>
          <p className="text-4xl font-bold text-blue-600 mt-2">
            {scorePercent}%
          </p>
          <p className={`mt-2 font-semibold ${passed ? "text-green-600" : "text-red-600"}`}>
            {passed ? "PASSED 🎉" : "FAILED"}
          </p>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-2 gap-6">

          <div className="bg-gray-50 rounded-xl p-5 text-center shadow-sm">
            <p className="text-sm text-gray-500">Total Questions</p>
            <p className="text-xl font-semibold">{total}</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-5 text-center shadow-sm">
            <p className="text-sm text-gray-500">Attempted</p>
            <p className="text-xl font-semibold">{attempted}</p>
          </div>

          <div className="bg-green-50 rounded-xl p-5 text-center shadow-sm">
            <div className="flex justify-center items-center gap-2 text-green-600">
              <CheckCircle size={18} />
              <span>Correct</span>
            </div>
            <p className="text-xl font-semibold mt-2">{correct}</p>
          </div>

          <div className="bg-red-50 rounded-xl p-5 text-center shadow-sm">
            <div className="flex justify-center items-center gap-2 text-red-600">
              <XCircle size={18} />
              <span>Wrong</span>
            </div>
            <p className="text-xl font-semibold mt-2">{wrong}</p>
          </div>

        </div>

        {/* TIME TAKEN */}
        <div className="mt-6 bg-gray-50 rounded-xl p-5 text-center shadow-sm">
          <div className="flex justify-center items-center gap-2 text-gray-700">
            <Clock size={18} />
            <span>Time Taken: {timeTaken} seconds</span>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex justify-center gap-4 mt-10">
          <button
            onClick={() => navigate("/assessments")}
            className="px-6 py-2 border rounded-lg"
          >
            Back to Assessments
          </button>

          <button
            onClick={() => navigate("/dashboard")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg"
          >
            Go to Dashboard
          </button>
          {passed && certificateEligible && attemptId && (
            <button
              onClick={async () => {
                try {
                  const blob = await certificateService.downloadAssessmentCertificate(attemptId);
                  savePdfBlob(blob, `assessment_certificate_${attemptId}.pdf`);
                } catch {
                  void 0;
                }
              }}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg"
            >
              Download Certificate
            </button>
          )}
          {passed && !certificateEligible && (
            <div className="px-4 py-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-sm">
              Certificate will be available after admin approval.
            </div>
          )}
          {passed && (
            <button
              onClick={() => navigate("/certificates")}
              className="px-6 py-2 border rounded-lg"
            >
              View Certificates
            </button>
          )}
        </div>

      </Motion.motion.div>
    </div>
  );
}

