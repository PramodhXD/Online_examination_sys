import { Link } from "react-router-dom";

export default function NotFound() {
  const hasToken = Boolean(localStorage.getItem("token"));
  const homePath = hasToken ? "/dashboard" : "/login";

  return (
    <section className="min-h-screen flex items-center justify-center px-6 bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
          404
        </p>
        <h1 className="mt-2 text-3xl font-bold">Page not found</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          The page you requested does not exist or the link is outdated.
        </p>
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
