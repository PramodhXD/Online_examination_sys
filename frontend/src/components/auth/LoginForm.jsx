import React, { useState } from "react";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Captcha from "./Captcha";
import { loginUser } from "../../services/authService";
import { useAuth } from "../../hooks/useAuth";

export default function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [captchaValid, setCaptchaValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getErrorMessage = (err, fallback) => {
    const detail = err?.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return detail[0]?.msg;
    return fallback;
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!captchaValid) {
      setError("Please complete captcha correctly");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await loginUser({ email, password });
      const { access_token, role, user } = res;

      login(user || { email, role }, access_token);
      navigate(role === "admin" ? "/admin/dashboard" : "/dashboard");
    } catch (err) {
      setError(getErrorMessage(err, "Invalid email or password"));
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = Boolean(email && password && captchaValid && !loading);

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
      <h2 className="text-2xl font-bold text-center mb-2">Welcome Back</h2>
      <p className="text-center text-slate-500 mb-6">Login to your account</p>

      {error && (
        <p
          className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <label htmlFor="login-email" className="sr-only">
          Email address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-3.5 text-gray-400" size={18} />
          <input
            id="login-email"
            type="email"
            name="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="w-full pl-10 p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
            required
          />
        </div>

        <label htmlFor="login-password" className="sr-only">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full pl-10 pr-10 p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-3 text-gray-400 hover:text-indigo-600"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </button>
        </div>

        <div className="text-left">
          <button
            type="button"
            onClick={() => navigate("/forgot-password")}
            className="text-sm text-indigo-600 hover:underline"
          >
            Forgot password?
          </button>
        </div>

        <Captcha onValidate={setCaptchaValid} />

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="text-center text-sm mt-4">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="text-indigo-600 font-medium hover:underline">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}
