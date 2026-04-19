import { Link, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { getStoredAuthUser } from "../utils/storage";

export default function ServerError() {
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const authUser = getStoredAuthUser();
  const homePath = authUser?.role === "admin" ? "/admin/dashboard" : "/dashboard";
  const searchParams = new URLSearchParams(location.search);
  const reason = searchParams.get("reason");
  const returnPath = sessionStorage.getItem("server_error_return_to");

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const statusTitle = useMemo(() => {
    if (!isOnline || reason === "offline") return "You are offline";
    if (reason === "network") return "Cannot reach the server";
    return "Server error";
  }, [isOnline, reason]);

  const statusMessage = useMemo(() => {
    if (!isOnline || reason === "offline") {
      return "Your internet connection appears to be down. Reconnect and retry.";
    }
    if (reason === "network") {
      return "The API endpoint is unreachable right now. Please try again in a moment.";
    }
    return "The server returned an unexpected error. Please try again.";
  }, [isOnline, reason]);

  const handleRetry = () => {
    if (returnPath) {
      window.location.href = returnPath;
      return;
    }
    window.location.reload();
  };

  return (
    <section className="min-h-screen flex items-center justify-center px-6 bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">
          Service issue
        </p>
        <h1 className="mt-2 text-3xl font-bold">{statusTitle}</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">{statusMessage}</p>
        {returnPath && (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Last page: <span className="font-mono">{returnPath}</span>
          </p>
        )}
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Retry
          </button>
          <Link
            to={homePath}
            className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </section>
  );
}
