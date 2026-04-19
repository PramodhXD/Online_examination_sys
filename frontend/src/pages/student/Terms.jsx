import { Link, useLocation } from "react-router-dom";

export default function Terms() {
  const location = useLocation();
  const fromPath = location.state?.from || "/login";
  const backLabel = fromPath === "/register" ? "Back to Register" : "Back to Login";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Terms of Service</h1>
        <p className="text-slate-600">Last updated: March 15, 2026</p>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">1. Platform Use</h2>
          <p className="mt-2 text-slate-700">
            This platform is intended for registered students and authorized administrators. You must use your own account and keep credentials secure.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">2. Academic Integrity</h2>
          <p className="mt-2 text-slate-700">
            Any form of impersonation, cheating, or unauthorized assistance may lead to attempt cancellation, account suspension, and institutional action.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">3. Service Availability</h2>
          <p className="mt-2 text-slate-700">
            While availability is monitored continuously, exam sessions can be affected by network failures, device constraints, or scheduled maintenance.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">4. Account Actions</h2>
          <p className="mt-2 text-slate-700">
            The institution may reset credentials, revoke access, or audit activity logs when policy violations or security concerns are detected.
          </p>
        </section>
        <div className="pt-2 text-sm">
          <Link to={fromPath} className="text-blue-600 hover:underline">{backLabel}</Link>
        </div>
      </div>
    </main>
  );
}
