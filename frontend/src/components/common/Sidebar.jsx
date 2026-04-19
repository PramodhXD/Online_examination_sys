import {
  useState,
} from "react";
import {
  LayoutDashboard,
  BarChart2,
  Trophy,
  Award,
  User,
  LogOut,
  CreditCard,
  LifeBuoy,
  MessageSquare,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function Sidebar({ collapsed }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { name: "History", icon: BarChart2, path: "/performance" },
    { name: "Leaderboard", icon: Trophy, path: "/leaderboard" },
    { name: "Certificates", icon: Award, path: "/certificates" },
    { name: "Subscription", icon: CreditCard, path: "/subscription" },
    { name: "Help & Support", icon: LifeBuoy, path: "/support" },
    { name: "My Tickets", icon: MessageSquare, path: "/my-tickets" },
    { name: "Profile", icon: User, path: "/profile" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside
      className={`transition-all duration-300 ease-in-out
      ${collapsed ? "w-20" : "w-64"}
      bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-800
      text-gray-700 dark:text-gray-200
      border-r border-gray-200 dark:border-slate-700
      flex flex-col`}
    >
      <div className="h-16 flex items-center justify-center border-b border-gray-200 dark:border-slate-700 font-semibold text-lg tracking-wide">
        {collapsed ? "SP" : "Student Portal"}
      </div>

      <nav className="flex-1 mt-3 space-y-2 px-2">
        {menuItems.map((item, index) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={index}
              to={item.path}
              className={({ isActive }) =>
                `group flex items-center gap-4 px-4 py-3 rounded-lg transition relative
                ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md"
                    : "hover:bg-gray-100 dark:hover:bg-slate-700"
                }`
              }
            >
              <Icon size={20} />

              {!collapsed && (
                <span className="text-sm font-medium">
                  {item.name}
                </span>
              )}

              {collapsed && (
                <span className="absolute left-20 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                  {item.name}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-200 dark:border-slate-700">
        <button
          onClick={() => setShowLogoutModal(true)}
          className="group flex items-center gap-4 w-full px-4 py-3 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition relative"
        >
          <LogOut size={20} />

          {!collapsed && (
            <span className="text-sm font-medium">
              Logout
            </span>
          )}

          {collapsed && (
            <span className="absolute left-20 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
              Logout
            </span>
          )}
        </button>
      </div>

      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Confirm Logout
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to exit?
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                No
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
