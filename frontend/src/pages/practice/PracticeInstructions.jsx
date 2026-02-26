import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ClipboardList,
  ListChecks,
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

    // ✅ Navigate using category ID
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
            <p className="text-sm text-gray-500 mt-1">
              Please read the instructions carefully before starting.
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
              <ul className="list-decimal pl-6 space-y-1">
                <li>You may attempt the practice test multiple times.</li>
                <li>No negative marking is applicable.</li>
                <li>Answers can be changed before finishing.</li>
              </ul>
            </section>

            {/* Question Status */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <ListChecks className="w-5 h-5 text-purple-600" />
                <h2 className="font-semibold text-gray-900">
                  Question Status
                </h2>
              </div>
              <ul className="space-y-1">
                <li><b>Not Visited:</b> Question not opened.</li>
                <li><b>Not Answered:</b> Opened but not answered.</li>
                <li><b>Answered:</b> Option selected.</li>
                <li><b>Marked for Review:</b> Review later.</li>
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
              <ul className="list-disc pl-6 space-y-1">
                <li>Use Next and Previous buttons to move.</li>
                <li>Jump directly using the question palette.</li>
                <li>Marked questions are evaluated if answered.</li>
              </ul>
            </section>

            {/* Info Box */}
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-blue-800">
              <Info className="w-5 h-5 mt-0.5 text-blue-600" />
              <p>
                This practice test does not impact your final results.
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
