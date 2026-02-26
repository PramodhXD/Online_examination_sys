import React, { useState } from "react";
import {
  User,
  Hash,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { loginUser, registerUser } from "../../services/authService";
import PasswordStrength from "./PasswordStrength";
import TermsCheckbox from "./TermsCheckbox";

function RegisterForm() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    rollNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
    agree: false,
  });

  const passwordRules = {
    length: formData.password.length >= 8,
    number: /\d/.test(formData.password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
  };

  const isPasswordValid =
    passwordRules.length && passwordRules.number && passwordRules.special;

  const isConfirmPasswordValid =
    Boolean(formData.password) &&
    Boolean(formData.confirmPassword) &&
    formData.password === formData.confirmPassword;

  const canSubmit =
    Boolean(formData.name.trim()) &&
    Boolean(formData.rollNumber.trim()) &&
    Boolean(formData.email.trim()) &&
    isPasswordValid &&
    isConfirmPasswordValid &&
    formData.agree;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        roll_number: formData.rollNumber.trim(),
        password: formData.password,
      };

      await registerUser(payload);
      const loginRes = await loginUser({
        email: payload.email,
        password: formData.password,
      });

      const { access_token, role, user } = loginRes;
      login(user || { email: payload.email, role }, access_token);

      setSuccess("Account created successfully");

      setTimeout(() => {
        navigate(`/face-capture?email=${encodeURIComponent(payload.email)}`);
      }, 1200);

      setFormData({
        name: "",
        rollNumber: "",
        email: "",
        password: "",
        confirmPassword: "",
        agree: false,
      });
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
      <div className="flex justify-center mb-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl">
          S
        </div>
      </div>

      <h2 className="text-2xl font-bold text-center text-slate-900">
        Create your account
      </h2>
      <p className="text-center text-slate-500 text-sm mt-1 mb-6">
        Register to start secure online exams
      </p>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <InputField
          id="register-name"
          label="Full Name"
          icon={User}
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="John Doe"
          autoComplete="name"
          required
        />

        <InputField
          id="register-roll-number"
          label="Roll Number"
          icon={Hash}
          name="rollNumber"
          value={formData.rollNumber}
          onChange={handleChange}
          placeholder="CS2025A102"
          autoComplete="off"
          required
        />

        <InputField
          id="register-email"
          label="Email Address"
          icon={Mail}
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />

        <PasswordField
          id="register-password"
          label="Password"
          name="password"
          value={formData.password}
          show={showPassword}
          toggle={() => setShowPassword((prev) => !prev)}
          onChange={handleChange}
          autoComplete="new-password"
          required
        />

        <PasswordStrength password={formData.password} />

        <PasswordField
          id="register-confirm-password"
          label="Confirm Password"
          name="confirmPassword"
          value={formData.confirmPassword}
          show={showConfirmPassword}
          toggle={() => setShowConfirmPassword((prev) => !prev)}
          onChange={handleChange}
          autoComplete="new-password"
          required
        />

        {formData.confirmPassword && (
          <div className="flex items-center gap-2 text-xs mt-1" aria-live="polite">
            {isConfirmPasswordValid ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-green-600">Passwords match</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-red-500">Passwords do not match</span>
              </>
            )}
          </div>
        )}

        <TermsCheckbox
          id="register-agree"
          name="agree"
          checked={formData.agree}
          onChange={(checked) => {
            setFormData((prev) => ({ ...prev, agree: checked }));
          }}
          disabled={loading || Boolean(success)}
          required
        />

        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg" role="alert" aria-live="polite">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-green-600 bg-green-50 p-2 rounded-lg" role="status" aria-live="polite">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit || loading || Boolean(success)}
          className={`w-full mt-4 py-3 rounded-xl font-semibold transition ${
            canSubmit && !loading
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "bg-slate-300 text-slate-500 cursor-not-allowed"
          }`}
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        Already have an account?{" "}
        <Link to="/login" className="text-indigo-600 font-medium hover:underline">
          Login
        </Link>
      </p>
    </div>
  );
}

export { RegisterForm };
export default RegisterForm;

function InputField({ id, label, icon, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative mt-1">
        {icon
          ? React.createElement(icon, {
              className:
                "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400",
            })
          : null}
        <input
          id={id}
          {...props}
          className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </div>
    </div>
  );
}

function PasswordField({ id, label, show, toggle, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative mt-1">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          id={id}
          type={show ? "text" : "password"}
          {...props}
          className="w-full pl-10 pr-10 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
        />
        <button
          type="button"
          onClick={toggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          title={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
