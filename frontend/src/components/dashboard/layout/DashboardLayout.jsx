import { useEffect, useState } from "react";
import Sidebar from "../../common/Sidebar";
import TopNavbar from "../../common/TopNavbar";

export default function DashboardLayout({ children, title }) {
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("student_sidebar_collapsed");
    return saved === null ? true : saved === "true";
  });

  useEffect(() => {
    localStorage.setItem("student_sidebar_collapsed", String(collapsed));
  }, [collapsed]);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-slate-950 overflow-hidden transition-colors duration-300">

      <Sidebar collapsed={collapsed} />

      <div className="flex-1 flex flex-col">

        <TopNavbar
          toggleSidebar={() => setCollapsed(!collapsed)}
          title={title}
        />

        <main className="flex-1 p-6 overflow-y-auto text-gray-900 dark:text-slate-100">
          {children}
        </main>

      </div>
    </div>
  );
}
