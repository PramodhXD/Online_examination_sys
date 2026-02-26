import React from "react";
import { Shield } from "lucide-react";
import { Link } from "react-router-dom";
import ThemeToggle from "../common/ThemeToggle";

export const Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/90 backdrop-blur">
      <div className="container mx-auto px-4 sm:px-6 lg:px-12">
        <div className="flex h-20 items-center justify-between">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Shield className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold text-slate-900 hidden sm:block">
              SecureExam
            </span>
          </Link>

          {/* Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-sm text-slate-600 hover:text-indigo-600">
              Features
            </a>
            <a href="#pricing" className="text-sm text-slate-600 hover:text-indigo-600">
              Pricing
            </a>
            <a href="#contact" className="text-sm text-slate-600 hover:text-indigo-600">
              Contact
            </a>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-4">
            <ThemeToggle />

            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-50"
            >
              Login
            </Link>

            <Link
              to="/register"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              Sign Up
            </Link>
          </div>

        </div>
      </div>
    </nav>
  );
};
