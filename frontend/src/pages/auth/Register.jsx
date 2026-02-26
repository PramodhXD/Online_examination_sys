import React from "react";
import { RegisterForm } from "../../components/auth/RegisterForm";

export default function Register() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 px-4 py-8">
      <RegisterForm />
    </div>
  );
}
