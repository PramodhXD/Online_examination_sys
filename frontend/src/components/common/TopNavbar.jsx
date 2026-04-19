import { Menu, Bell } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import { getStoredAuthUser } from "../../utils/storage";
import NotificationPanel from "./NotificationPanel";
import { useNotifications } from "../../hooks/useNotifications";

export default function TopNavbar({ toggleSidebar, title }) {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);
  const topNavItems = [
    { name: "Practice", path: "/practice" },
    { name: "Assessments", path: "/assessments" },
    { name: "Programming", path: "/programming" },
    { name: "Code Lab", path: "/code-editor" },
  ];
  const authUser = getStoredAuthUser();
  const displayText = authUser?.name || authUser?.email || "Student";
  const avatarKey = authUser?.email
    ? `user_avatar_${authUser.email.toLowerCase()}`
    : "user_avatar";
  const avatarUrl = localStorage.getItem(avatarKey) || "";
  const avatarInitial = useMemo(
    () => displayText.charAt(0).toUpperCase(),
    [displayText]
  );
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    removeNotification,
    refreshNotifications,
  } = useNotifications();

  useEffect(() => {
    if (!showNotifications) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      if (!notificationRef.current?.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [showNotifications]);

  const handleNotificationToggle = async () => {
    const nextOpenState = !showNotifications;
    setShowNotifications(nextOpenState);

    if (nextOpenState) {
      try {
        await refreshNotifications({ silent: notifications.length > 0 });
      } catch { void 0; }
    }
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b dark:border-slate-700 px-6 py-4 flex items-center justify-between gap-4 transition">

      {/* Left Section */}
      <div className="flex items-center gap-4 min-w-0">
        <button onClick={toggleSidebar} aria-label="Toggle sidebar" title="Toggle sidebar">
          <Menu className="w-6 h-6 text-gray-700 dark:text-gray-200" />
        </button>

        <h1 className="text-lg font-semibold text-gray-800 dark:text-white truncate">
          {title}
        </h1>
      </div>

      {/* Center Section */}
      <nav className="hidden md:flex items-center gap-2">
        {topNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-md text-sm font-medium transition ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800"
              }`
            }
          >
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* Right Section */}
      <div className="flex items-center gap-4">

        <ThemeToggle />

        {/* Notification Icon */}
        <div className="relative" ref={notificationRef}>
          <button
            type="button"
            onClick={() => {
              void handleNotificationToggle();
            }}
            aria-label="Notifications"
            title="Notifications"
            className="relative inline-flex items-center justify-center rounded-md p-1 text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800"
          >
            <Bell className="cursor-pointer" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </button>

          {showNotifications ? (
            <div className="absolute right-0 z-50 mt-3 w-[24rem] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              <NotificationPanel
                notifications={notifications}
                unreadCount={unreadCount}
                loading={loading}
                onMarkAsRead={markAsRead}
                onDelete={removeNotification}
                compact
                onNavigateAway={() => setShowNotifications(false)}
              />
            </div>
          ) : null}
        </div>

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
