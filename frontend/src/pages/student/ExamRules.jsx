import { Link, useLocation } from "react-router-dom";

export default function ExamRules() {
  const location = useLocation();
  const fromPath = location.state?.from || "/login";
  const backLabel = fromPath === "/register" ? "Back to Register" : "Back to Login";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Exam Rules</h1>
        <p className="text-slate-600">Last updated: March 15, 2026</p>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">1. Before Exam</h2>
          <ul className="mt-2 list-disc pl-6 text-slate-700 space-y-1">
            <li>Verify camera and internet connectivity before starting.</li>
            <li>Use a single device and supported browser.</li>
            <li>Complete face verification before assessment start.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">2. During Exam</h2>
          <ul className="mt-2 list-disc pl-6 text-slate-700 space-y-1">
            <li>Remain in fullscreen mode throughout the assessment.</li>
            <li>Do not switch tabs or minimize the exam window.</li>
            <li>Only one face should be visible in the camera frame.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">3. Violations</h2>
          <p className="mt-2 text-slate-700">
            Repeated policy violations can trigger warnings, automatic submission, or administrative review.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">4. Submission and Results</h2>
          <p className="mt-2 text-slate-700">
            Assessments auto-submit on timeout. Final results and eligibility outcomes are shown after successful submission.
          </p>
        </section>
        <div className="pt-2 text-sm">
          <Link to={fromPath} className="text-blue-600 hover:underline">{backLabel}</Link>
        </div>
      </div>
    </main>
  );
}
