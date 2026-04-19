import { Link, useLocation } from "react-router-dom";
import { getStoredAuthUser } from "../utils/storage";

export default function AccessDenied() {
  const location = useLocation();
  const fromPath = location.state?.from?.pathname || null;
  const authUser = getStoredAuthUser();
  const homePath = authUser?.role === "admin" ? "/admin/dashboard" : "/dashboard";

  return (
    <section className="min-h-screen flex items-center justify-center px-6 bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
          403
        </p>
        <h1 className="mt-2 text-3xl font-bold">Access denied</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          You do not have permission to open this page.
        </p>
        {fromPath && (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Requested path: <span className="font-mono">{fromPath}</span>
          </p>
        )}
        <div className="mt-6 flex items-center gap-3">
          <Link
            to={homePath}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Go to Home
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Go Back
          </button>
        </div>
      </div>
    </section>
  );
}
