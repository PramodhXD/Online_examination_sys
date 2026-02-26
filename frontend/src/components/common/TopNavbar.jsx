import { Menu, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import ThemeToggle from "./ThemeToggle";

export default function TopNavbar({ toggleSidebar, title }) {
  const navigate = useNavigate();
  const authUserRaw = localStorage.getItem("auth_user");
  const authUser = authUserRaw ? JSON.parse(authUserRaw) : null;
  const displayText = authUser?.name || authUser?.email || "Student";
  const avatarKey = authUser?.email
    ? `user_avatar_${authUser.email.toLowerCase()}`
    : "user_avatar";
  const avatarUrl = localStorage.getItem(avatarKey) || "";
  const avatarInitial = useMemo(
    () => displayText.charAt(0).toUpperCase(),
    [displayText]
  );

  return (
    <header className="bg-white dark:bg-slate-900 border-b dark:border-slate-700 px-6 py-4 flex justify-between items-center transition">

      {/* Left Section */}
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar} aria-label="Toggle sidebar" title="Toggle sidebar">
          <Menu className="w-6 h-6 text-gray-700 dark:text-gray-200" />
        </button>

        <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
          {title}
        </h1>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">

        <ThemeToggle />

        {/* Notification Icon */}
        <button
          type="button"
          aria-label="Notifications"
          title="Notifications"
          className="inline-flex items-center justify-center rounded-md p-1 text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800"
        >
          <Bell className="cursor-pointer" />
        </button>

        {/* Profile Avatar */}
        <button
          type="button"
          onClick={() => navigate("/profile")}
          aria-label="Go to profile"
          title="Profile"
          className="w-9 h-9 bg-blue-600 text-white flex items-center justify-center rounded-full font-semibold cursor-pointer hover:bg-blue-700 transition overflow-hidden"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" loading="lazy" decoding="async" />
          ) : (
            avatarInitial
          )}
        </button>
      </div>
    </header>
  );
}
