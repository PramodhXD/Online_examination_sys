import React from "react";
import { Link } from "react-router-dom";

export default function TermsCheckbox({
  id = "agree",
  name = "agree",
  checked,
  onChange,
  disabled = false,
  required = false,
}) {
  return (
    <div className="flex items-start gap-3 mt-4">
      <input
        id={id}
        name={name}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        required={required}
        className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      />

      <label htmlFor={id} className="text-sm text-slate-600 leading-relaxed">
        I agree to the{" "}
        <Link
          to="/terms"
          onClick={(e) => e.stopPropagation()}
          className="text-indigo-600 font-medium hover:underline"
          state={{ from: "/register" }}
        >
          Terms & Conditions
        </Link>{" "}
        and{" "}
        <Link
          to="/privacy"
          onClick={(e) => e.stopPropagation()}
          className="text-indigo-600 font-medium hover:underline"
          state={{ from: "/register" }}
        >
          Privacy Policy
        </Link>
        {" "}and{" "}
        <Link
          to="/exam-rules"
          onClick={(e) => e.stopPropagation()}
          className="text-indigo-600 font-medium hover:underline"
          state={{ from: "/register" }}
        >
          Exam Rules
        </Link>
      </label>
    </div>
  );
}
