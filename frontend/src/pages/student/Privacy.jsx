import { Link, useLocation } from "react-router-dom";

export default function Privacy() {
  const location = useLocation();
  const fromPath = location.state?.from || "/login";
  const backLabel = fromPath === "/register" ? "Back to Register" : "Back to Login";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
        <p className="text-slate-600">Last updated: March 15, 2026</p>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">1. Data Collected</h2>
          <p className="mt-2 text-slate-700">
            The platform stores account details, exam attempts, and proctoring signals necessary for identity verification and exam security.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">2. Purpose of Processing</h2>
          <p className="mt-2 text-slate-700">
            Data is used for authentication, access control, exam delivery, result generation, analytics, and support operations.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">3. Retention and Access</h2>
          <p className="mt-2 text-slate-700">
            Records are retained according to institutional policy. Access is limited to authorized personnel with role-based controls.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">4. Student Rights</h2>
          <p className="mt-2 text-slate-700">
            Students may request profile corrections and account actions through the support channel, subject to academic and legal obligations.
          </p>
        </section>
        <div className="pt-2 text-sm">
          <Link to={fromPath} className="text-blue-600 hover:underline">{backLabel}</Link>
        </div>
      </div>
    </main>
  );
}
