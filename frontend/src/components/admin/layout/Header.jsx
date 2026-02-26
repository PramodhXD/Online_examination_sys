import { 
  Bell, 
  Search, 
  LogOut, 
  ChevronDown, 
  Menu 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../../common/ThemeToggle";
import { useAuth } from "../../../hooks/useAuth";

export default function Header({ 
  adminImage, 
  activeTab, 
  toggleSidebar,
  onLogout
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const hasAdminImage = Boolean(adminImage);
  const displayName = user?.name || user?.email || "Administrator";
  const roleLabel = user?.role === "admin" ? "System Administrator" : "Administrator";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AD";

  const getTitle = (id) => {
    switch (id) {
      case "dashboard": return "Admin Dashboard";
      case "students": return "Student Management";
      case "exams": return "Exam Management";
      case "questions": return "Question Bank";
      case "live": return "Live Monitoring";
      case "analytics": return "Results & Analytics";
      case "reports": return "Reports & Logs";
      case "certificates": return "Certificate Issuance";
      case "settings": return "System Settings";
      default: return "Admin Dashboard";
    }
  };

  const handleLogout = () => {
    if (typeof onLogout === "function") {
      onLogout();
      return;
    }
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 overflow-hidden">

      {/* LEFT SECTION */}
      <div className="flex items-center gap-4 lg:gap-8 min-w-0 flex-1">

        {/* 🔥 Sidebar Toggle Button */}
        <button
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Menu className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </button>

        {/* Page Title */}
        <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
          {getTitle(activeTab)}
        </h1>

        {/* Top Navigation */}
        <nav className="hidden xl:flex items-center gap-6">
          {["Dashboard", "Students", "Exams", "Results", "Reports"].map((item) => (
            <span
              key={item}
              className={`text-sm font-medium transition-colors cursor-pointer ${
                activeTab?.toLowerCase().includes(item.toLowerCase().substring(0, 4))
                  ? "text-blue-600"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              {item}
            </span>
          ))}
        </nav>
      </div>

      {/* RIGHT SECTION */}
      <div className="flex items-center gap-3 sm:gap-4 lg:gap-6 min-w-0 shrink-0">

        {/* Search */}
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search students, exams..."
            className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-full text-sm w-52 xl:w-64 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
          />
        </div>

        {/* Notifications */}
        <button
          aria-label="Notifications"
          title="Notifications"
          className="relative p-2 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
        </button>

        <ThemeToggle />

        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />

        {/* Profile */}
        <div className="flex items-center gap-3 pl-2">
          <div className="text-right hidden xl:block">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-none">
              {displayName}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {roleLabel}
            </p>
          </div>

          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-100 group-hover:border-blue-500 transition-colors bg-slate-100 flex items-center justify-center">
              {hasAdminImage ? (
                <img
                  src={adminImage}
                  alt="Admin Profile"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span className="text-xs font-semibold text-slate-600">
                  {initials}
                </span>
              )}
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          </div>

          <button
            onClick={handleLogout}
            className="ml-2 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all rounded-lg"
            title="Logout"
            aria-label="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

      </div>
    </header>
  );
}
