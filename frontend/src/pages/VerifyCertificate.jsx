import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BadgeCheck, QrCode, Search, ShieldAlert } from "lucide-react";

import certificateService from "../services/certificateService";

function extractToken(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    const tokenFromQuery =
      parsed.searchParams.get("token") ||
      parsed.searchParams.get("id") ||
      parsed.searchParams.get("certificate");
    if (tokenFromQuery) return tokenFromQuery.trim();

    const segments = parsed.pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] || "";
  } catch {
    return raw;
  }
}

function formatDate(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function VerifyCertificate() {
  const [params] = useSearchParams();
  const [inputValue, setInputValue] = useState(
    params.get("token") || params.get("id") || ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [scannerMessage, setScannerMessage] = useState("");

  const verifyToken = async (token) => {
    const cleanToken = extractToken(token);
    if (!cleanToken) {
      setError("Enter a certificate ID or paste a QR verification link.");
      setResult(null);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const data = await certificateService.verifyCertificate(cleanToken);
      setResult(data);
      setInputValue(cleanToken);
    } catch (err) {
      setResult(null);
      setError(err?.response?.data?.detail || "Certificate could not be verified.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const queryToken = params.get("token") || params.get("id");
    if (queryToken) {
      void verifyToken(queryToken);
    }
  }, [params]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await verifyToken(inputValue);
  };

  const handleQrFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (typeof window === "undefined" || !("BarcodeDetector" in window)) {
      setScannerMessage("QR image scan is not supported in this browser. Paste the QR link instead.");
      return;
    }

    try {
      setScannerMessage("Scanning QR image...");
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const bitmap = await createImageBitmap(file);
      const codes = await detector.detect(bitmap);
      const rawValue = codes?.[0]?.rawValue || "";
      if (!rawValue) {
        setScannerMessage("No QR code was found in that image.");
        return;
      }
      const token = extractToken(rawValue);
      setInputValue(token);
      setScannerMessage("QR code detected.");
      await verifyToken(token);
    } catch {
      setScannerMessage("Unable to read that QR image. Paste the QR link or certificate ID instead.");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_42%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">
            Public Verification
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Verify a certificate
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
            Enter a certificate ID, paste a QR verification link, or scan a QR image to validate the credential.
          </p>
        </div>

        <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_20px_70px_-36px_rgba(15,23,42,0.35)] backdrop-blur sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-800">
                Certificate ID or QR link
              </span>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  placeholder="Paste certificate token or full QR verification URL"
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
            </label>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                <BadgeCheck className="h-4 w-4" />
                {loading ? "Verifying..." : "Verify Certificate"}
              </button>

              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                <QrCode className="h-4 w-4" />
                Scan QR Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQrFile}
                  className="hidden"
                />
              </label>
            </div>
          </form>

          {scannerMessage ? (
            <p className="mt-4 text-sm text-slate-600">{scannerMessage}</p>
          ) : null}

          {error ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="mt-8 rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Verification Result
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">
                  {result ? "Certificate verified" : "Awaiting verification"}
                </h2>
              </div>
              <div
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${
                  result
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {result ? <BadgeCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                {result ? "Valid" : "Not verified"}
              </div>
            </div>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-white px-4 py-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Candidate Name
                </dt>
                <dd className="mt-2 text-base font-semibold text-slate-900">
                  {result?.student_name || "-"}
                </dd>
              </div>
              <div className="rounded-2xl bg-white px-4 py-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Score
                </dt>
                <dd className="mt-2 text-base font-semibold text-slate-900">
                  {result ? `${Number(result.percentage || 0).toFixed(2)}%` : "-"}
                </dd>
              </div>
              <div className="rounded-2xl bg-white px-4 py-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Date
                </dt>
                <dd className="mt-2 text-base font-semibold text-slate-900">
                  {result ? formatDate(result.completed_at) : "-"}
                </dd>
              </div>
              <div className="rounded-2xl bg-white px-4 py-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Certificate Status
                </dt>
                <dd className={`mt-2 text-base font-semibold ${result ? "text-emerald-700" : "text-slate-900"}`}>
                  {result ? "Valid" : "Invalid or not checked"}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <div className="mt-6 text-center text-sm text-slate-600">
          <Link to="/" className="font-semibold text-blue-700 hover:text-blue-800">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
