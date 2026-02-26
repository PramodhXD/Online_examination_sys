import React from "react";

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
        <span className="text-indigo-600 font-medium">
          Terms & Conditions
        </span>{" "}
        and{" "}
        <span className="text-indigo-600 font-medium">
          Privacy Policy
        </span>
      </label>
    </div>
  );
}
