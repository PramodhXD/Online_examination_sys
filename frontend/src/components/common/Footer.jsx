import React from "react";
import { Link } from "react-router-dom";

export default function Footer({ children }) {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-slate-200 bg-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>(c) {year} Secure Online Examination System. All rights reserved.</p>

        {children ?? (
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:text-indigo-600 transition-colors">
              Home
            </Link>
            <Link to="/login" className="hover:text-indigo-600 transition-colors">
              Login
            </Link>
            <Link to="/register" className="hover:text-indigo-600 transition-colors">
              Register
            </Link>
          </div>
        )}
      </div>
    </footer>
  );
}
