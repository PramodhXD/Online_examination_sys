import React, { useEffect, useState } from "react";
import { ShieldCheck, FileLock, FileText, LifeBuoy } from "lucide-react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../../components/admin/layout/Sidebar";
import Header from "../../components/admin/layout/Header";

import StatsSection from "../../components/admin/dashboard/StatsSection";
import ChartsSection from "../../components/admin/dashboard/ChartsSection";
import LiveStatusTable from "../../components/admin/dashboard/LiveStatusTable";
import QuickActions from "../../components/admin/dashboard/QuickActions";
import RecentActivity from "../../components/admin/dashboard/RecentActivity";
import adminService from "../../services/adminService";
import { useAuth } from "../../hooks/useAuth";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [statsData, setStatsData] = useState(null);
  const [liveRows, setLiveRows] = useState([]);
  const [logs, setLogs] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [loadingLive, setLoadingLive] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [stats, live, recentLogs, analyticsRows] = await Promise.all([
          adminService.getDashboardStats(),
          adminService.getLiveSessions(""),
          adminService.getLogs({ event_type: "all", search: "" }),
          adminService.getAnalytics(),
        ]);
        setStatsData(stats);
        setLiveRows(Array.isArray(live) ? live : []);
        setLogs(Array.isArray(recentLogs) ? recentLogs : []);
        setAnalytics(Array.isArray(analyticsRows) ? analyticsRows : []);
      } catch {
        void 0;
      } finally {
        setLoadingLive(false);
        setLoadingLogs(false);
      }
    };
    load();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#0f172a] to-[#1e293b]">
      <Sidebar activeTab="dashboard" isOpen={isSidebarOpen} />

      <div
        className={`min-h-screen min-w-0 flex flex-col transition-all duration-300 ${
          isSidebarOpen ? "lg:pl-64" : "lg:pl-20"
        }`}
      >
        <Header
          activeTab="dashboard"
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onLogout={handleLogout}
        />

        <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8">
          <StatsSection statsData={statsData} />
          <ChartsSection analytics={analytics} />
          <QuickActions />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <LiveStatusTable rows={liveRows} loading={loadingLive} />
            </div>
            <RecentActivity logs={logs} loading={loadingLogs} />
          </div>
        </div>

        <footer className="px-4 sm:px-6 lg:px-8 py-6 border-t border-white/10 bg-white/5 backdrop-blur-md">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>(c) 2026 ExamSecure Administration System. All rights reserved.</span>
            </div>

            <div className="flex items-center gap-6">
              {[
                { label: "Privacy Policy", icon: FileLock },
                { label: "Terms of Service", icon: FileText },
                { label: "Support Center", icon: LifeBuoy },
              ].map((link) => (
                <button
                  key={link.label}
                  type="button"
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-blue-400 transition-colors"
                >
                  <link.icon className="w-3.5 h-3.5" />
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AdminDashboard;
