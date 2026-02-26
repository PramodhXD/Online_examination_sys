import React from "react";
import { CheckCircle2, Circle } from "lucide-react";

export default function PasswordStrength({ password, className = "" }) {
  const rules = {
    length: password.length >= 8,
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  return (
    <div className={`space-y-1 text-sm mt-2 ${className}`} aria-live="polite">
      <Rule label="Minimum 8 characters" valid={rules.length} />
      <Rule label="At least 1 number" valid={rules.number} />
      <Rule label="At least 1 special character" valid={rules.special} />
    </div>
  );
}

function Rule({ label, valid }) {
  return (
    <div className={`flex items-center gap-2 ${valid ? "text-green-600" : "text-slate-400"}`}>
      {valid ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
      <span>{label}</span>
    </div>
  );
}
