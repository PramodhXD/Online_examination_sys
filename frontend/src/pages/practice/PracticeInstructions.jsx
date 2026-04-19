import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ClipboardList,
  Navigation,
  Info,
} from "lucide-react";
import DashboardLayout from "../../components/dashboard/layout/DashboardLayout";

export default function PracticeInstructions() {
  const [agreed, setAgreed] = useState(false);
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get("category");

  const handleStart = () => {
    if (!categoryId) return;

    navigate(`/practice/questions?category=${categoryId}`);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto py-10">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Header */}
          <div className="px-8 py-6 border-b">
            <h1 className="text-2xl font-semibold text-gray-900">
              Practice Test Instructions
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Please review these instructions carefully before you begin your practice attempt.
            </p>
          </div>

          {/* Content */}
          <div className="px-8 py-6 space-y-10 text-sm text-gray-700 leading-relaxed">
            {/* General Guidelines */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-gray-900">
                  General Guidelines
                </h2>
              </div>
              <ul className="list-decimal pl-6 space-y-2">
                <li>This practice test is meant to simulate a real exam experience and help you evaluate your readiness.</li>
                <li>Read each question carefully and choose the most appropriate answer from the available options.</li>
                <li>The timer starts as soon as you begin the practice test and continues until you submit your attempt.</li>
                <li>You may change your answer to any question before final submission.</li>
                <li>After submission, you will be able to review your score, accuracy, and explanations for learning purposes.</li>
              </ul>
            </section>

            {/* Navigation */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Navigation className="w-5 h-5 text-green-600" />
                <h2 className="font-semibold text-gray-900">
                  Navigation
                </h2>
              </div>
              <ul className="list-disc pl-6 space-y-2">
                <li>Use the <b>Next</b> and <b>Previous</b> buttons to move between questions.</li>
                <li>You can track your progress and performance summary from the analytics panel during the attempt.</li>
                <li>Unanswered questions remain unattempted until you return and select an option.</li>
                <li>The header shows your current question number, progress bar, and elapsed time during the attempt.</li>
                <li>Click <b>Submit Practice</b> only after reviewing your responses, because the attempt will then be finalized.</li>
              </ul>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-5 h-5 text-amber-600" />
                <h2 className="font-semibold text-gray-900">
                  Before You Start
                </h2>
              </div>
              <ul className="list-disc pl-6 space-y-2">
                <li>Find a quiet place where you can complete the practice test without interruption.</li>
                <li>Make sure your internet connection is stable before starting the attempt.</li>
                <li>Avoid refreshing or closing the page while the practice test is in progress unless it is absolutely necessary.</li>
                <li>Use this practice attempt to identify weak topics and improve speed, accuracy, and confidence.</li>
              </ul>
            </section>

            {/* Info Box */}
            <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-blue-800">
              <Info className="w-5 h-5 mt-0.5 text-blue-600" />
              <p>
                This practice test is only for preparation. It does not affect your official exam result, ranking, or academic record.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-5 border-t bg-gray-50 flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={agreed}
                onChange={() => setAgreed(!agreed)}
                className="w-4 h-4"
              />
              I have read and understood the practice instructions.
            </label>

            <button
              disabled={!agreed}
              onClick={handleStart}
              className={`px-6 py-2 rounded-md text-sm font-semibold text-white transition
                ${
                  agreed
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
            >
              Start Practice Test
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
