import React, { useEffect, useMemo, useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { verifyOtp } from "../../services/authService";
import { useLocation, useNavigate } from "react-router-dom";

export default function VerifyOtp() {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const email = location.state?.email;
  const maskedEmail = useMemo(() => {
    if (!email || !email.includes("@")) return "";
    const [user, domain] = email.split("@");
    if (user.length <= 2) {
      return `${user[0] || ""}*@${domain}`;
    }
    return `${user[0]}${"*".repeat(Math.max(user.length - 2, 1))}${user[user.length - 1]}@${domain}`;
  }, [email]);

  useEffect(() => {
    if (!email) {
      navigate("/forgot-password");
    }
  }, [email, navigate]);

  if (!email) return null;

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await verifyOtp({ email, otp });
      navigate("/reset-password", { state: { email, otp } });
    } catch (err) { void err;
      setError(
        err.response?.data?.detail || "Invalid OTP"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-indigo-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl relative">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 shadow-lg">
            <ShieldCheck className="text-white" size={34} />
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-center text-2xl font-bold text-slate-900">Verify OTP</h2>
          <p className="mt-2 text-center text-sm text-slate-500">
            Enter the 6-digit code sent to {maskedEmail}
          </p>

          {error && (
            <p id="verify-otp-error" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600" role="alert" aria-live="polite">
              {error}
            </p>
          )}

          <form onSubmit={handleVerify} className="mt-6 space-y-5">
            <label htmlFor="verify-otp-code" className="sr-only">
              One-time password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3.5 text-slate-400" size={20} />
              <input
                id="verify-otp-code"
                type="text"
                name="otp"
                required
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => {
                  const nextOtp = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setOtp(nextOtp);
                }}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "verify-otp-error" : undefined}
                className="w-full rounded-xl border py-3 pl-10 pr-4 text-center text-lg tracking-[0.35em] focus:outline-none focus:ring-2 focus:ring-sky-600 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => navigate("/forgot-password")}
            className="mt-5 w-full text-sm text-sky-700 hover:underline"
          >
            Back to forgot password
          </button>
        </div>
      </div>
    </div>
  );
}

