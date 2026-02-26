import React, { useEffect, useState } from "react";

const CAPTCHA_LENGTH = 5;

function generateCaptcha() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let text = "";
  for (let i = 0; i < CAPTCHA_LENGTH; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

export default function Captcha({ onValidate }) {
  const [captcha, setCaptcha] = useState(() => generateCaptcha());
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    onValidate(false);
  }, [captcha, onValidate]);

  const refreshCaptcha = () => {
    setCaptcha(generateCaptcha());
    setInput("");
    setError("");
    onValidate(false);
  };

  const handleChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/\s/g, "").slice(0, CAPTCHA_LENGTH);
    setInput(value);

    if (value.length < CAPTCHA_LENGTH) {
      setError("");
      onValidate(false);
      return;
    }

    if (value === captcha) {
      setError("");
      onValidate(true);
    } else {
      setError("Captcha does not match");
      onValidate(false);
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor="captcha-input" className="text-sm font-medium text-slate-700">
        CAPTCHA Verification
      </label>

      <div className="flex items-center gap-3">
        <div
          className="px-4 py-2 bg-slate-100 font-mono tracking-widest rounded-lg text-indigo-600 text-lg select-none"
          aria-label="Generated captcha"
        >
          {captcha}
        </div>
        <button
          type="button"
          onClick={refreshCaptcha}
          className="text-sm text-indigo-600 hover:underline"
        >
          Refresh
        </button>
      </div>

      <input
        id="captcha-input"
        type="text"
        placeholder="Enter captcha"
        value={input}
        onChange={handleChange}
        autoCapitalize="characters"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        maxLength={CAPTCHA_LENGTH}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "captcha-error" : undefined}
        className="w-full mt-2 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
      />

      {error && (
        <p id="captcha-error" className="text-xs text-red-500" role="alert" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}
