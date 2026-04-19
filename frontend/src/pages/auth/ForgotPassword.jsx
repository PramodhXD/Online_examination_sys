import React, { useState } from "react";
import { Mail, ShieldCheck } from "lucide-react";
import { forgotPassword } from "../../services/authService";
import { useNavigate } from "react-router-dom";
import PolicyLinks from "../../components/common/PolicyLinks";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await forgotPassword(email);
      navigate("/verify-otp", { state: { email } });
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-indigo-100 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 relative">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
            <ShieldCheck className="text-white" size={34} />
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-bold text-center text-slate-900">
            Forgot Password
          </h2>

          <p className="text-center text-slate-500 mt-2 mb-6 text-sm">
            Enter your registered email and we'll send you a secure OTP
          </p>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4" role="alert" aria-live="polite">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <label htmlFor="forgot-password-email" className="sr-only">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 text-slate-400" size={20} />
              <input
                id="forgot-password-email"
                type="email"
                name="email"
                required
                placeholder="you@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 disabled:opacity-60 transition"
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>

          <p className="text-xs text-center text-slate-400 mt-4">
            Your account is protected with OTP verification
          </p>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full mt-5 text-sm text-indigo-600 hover:underline"
          >
            Back to login
          </button>
        </div>
      </div>
      <PolicyLinks className="mt-6" />
    </div>
  );
}
