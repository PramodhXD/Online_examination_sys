import React from "react";
import LoginForm from "../../components/auth/LoginForm";
import PolicyLinks from "../../components/common/PolicyLinks";

export default function Login() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 px-4 py-8">
      <LoginForm />
      <PolicyLinks className="mt-6" />
    </div>
  );
}
