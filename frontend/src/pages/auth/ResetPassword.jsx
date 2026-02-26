import React, { useEffect, useState } from "react";
import { CheckCircle, Lock, ShieldCheck, XCircle } from "lucide-react";
import { resetPassword } from "../../services/authService";
import { useLocation, useNavigate } from "react-router-dom";
import PasswordStrength from "../../components/auth/PasswordStrength";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const email = location.state?.email;
  const otp = location.state?.otp;
  const passwordRules = {
    length: password.length >= 8,
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
  const isPasswordValid =
    passwordRules.length &&
    passwordRules.number &&
    passwordRules.special;
  const isConfirmPasswordValid =
    password &&
    confirmPassword &&
    password === confirmPassword;

  useEffect(() => {
    if (!email || !otp) {
      navigate("/forgot-password");
    }
  }, [email, otp, navigate]);

  if (!email || !otp) return null;

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    if (!isPasswordValid) {
      setError("Please satisfy all password rules");
      return;
    }
    if (!isConfirmPasswordValid) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);

    try {
      await resetPassword({
        email,
        otp,
        new_password: password,
      });
      navigate("/login");
    } catch (err) { void err;
      setError(
        err.response?.data?.detail || "Reset failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-cyan-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl relative">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-cyan-600 shadow-lg">
            <ShieldCheck className="text-white" size={34} />
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-center text-2xl font-bold text-slate-900">Reset Password</h2>
          <p className="mt-2 text-center text-sm text-slate-500">
            Create a new secure password for your account
          </p>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600" role="alert" aria-live="polite">
              {error}
            </p>
          )}

          <form onSubmit={handleReset} className="mt-6 space-y-4">
            <label htmlFor="reset-password-new" className="sr-only">
              New password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-slate-400" size={20} />
              <input
                id="reset-password-new"
                type="password"
                name="newPassword"
                required
                minLength={8}
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-xl border py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
              />
            </div>

            <PasswordStrength password={password} />

            <label htmlFor="reset-password-confirm" className="sr-only">
              Confirm new password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-slate-400" size={20} />
              <input
                id="reset-password-confirm"
                type="password"
                name="confirmPassword"
                required
                minLength={8}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-xl border py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
              />
            </div>

            {confirmPassword && (
              <div className="flex items-center gap-2 text-xs" aria-live="polite">
                {isConfirmPasswordValid ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">Passwords match</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-red-500">Passwords do not match</span>
                  </>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !isPasswordValid || !isConfirmPasswordValid}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="mt-5 w-full text-sm text-emerald-700 hover:underline"
          >
            Back to login
          </button>
        </div>
      </div>
    </div>
  );
}

