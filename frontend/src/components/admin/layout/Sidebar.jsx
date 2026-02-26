import React from "react";
import {
  LayoutDashboard,
  Users,
  FileText,
  Database,
  MonitorPlay,
  BarChart3,
  History,
  Settings,
  Award,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const menuItems = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
  { id: "students", icon: Users, label: "Student Management", path: "/admin/students" },
  { id: "exams", icon: FileText, label: "Exam Management", path: "/admin/exams" },
  { id: "questions", icon: Database, label: "Question Bank", path: "/admin/questions" },
  { id: "live", icon: MonitorPlay, label: "Live Monitoring", path: "/admin/live" },
  { id: "analytics", icon: BarChart3, label: "Results & Analytics", path: "/admin/analytics" },
  { id: "reports", icon: History, label: "Reports & Logs", path: "/admin/reports" },
  { id: "certificates", icon: Award, label: "Certificate Issuance", path: "/admin/certificates" },
  { id: "settings", icon: Settings, label: "Settings", path: "/admin/settings" },
];

export default function Sidebar({ isOpen }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-slate-900 text-slate-300 
      dark:bg-slate-950 dark:text-slate-200 
      border-r border-slate-800 dark:border-slate-700 
      transition-all duration-300 z-50
      ${isOpen ? "w-64" : "w-20"}
      hidden lg:flex flex-col`}
    >
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <MonitorPlay className="text-white w-5 h-5" />
          </div>

          {isOpen && (
            <span className="text-xl font-bold text-white tracking-tight transition-opacity duration-200">
              ExamSecure
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center 
              ${isOpen ? "justify-between px-4" : "justify-center px-2"}
              py-3 rounded-xl transition-all duration-200 group
              ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                  : "hover:bg-slate-800/50 hover:text-white text-slate-400"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? "text-white" : "group-hover:text-blue-400"
                  }`}
                />

                {isOpen && (
                  <span className="font-medium text-sm">
                    {item.label}
                  </span>
                )}
              </div>

              {isActive && isOpen && (
                <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* System Status */}
      {isOpen && (
        <div className="p-4 mt-auto border-t border-slate-800">
          <div className="bg-slate-800/50 rounded-2xl p-4">
            <p className="text-xs text-slate-500 mb-1">
              System Status
            </p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium text-slate-300">
                Servers Healthy
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
