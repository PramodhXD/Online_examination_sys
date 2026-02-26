import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/dashboard/layout/DashboardLayout";
import StatsSection from "../../components/dashboard/stats/StatsSection";
import PerformanceSection from "../../components/dashboard/performance/PerformanceSection";
import RecentAssessmentsSection from "../../components/dashboard/assessments/RecentAssessmentsSection";
import ProfileSummaryCard from "../../components/dashboard/ProfileSummaryCard";
import OverallAccuracyCard from "../../components/dashboard/stats/OverallAccuracyCard";
import SkillProficiencyCard from "../../components/dashboard/performance/SkillProficiencyCard";

import dashboardService from "../../services/dashboardService";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingReport, setDownloadingReport] = useState(false);

  // ================= FETCH DASHBOARD =================
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await dashboardService.getDashboard();
        setDashboard(data);
      } catch { void 0; } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  // ================= LOADING STATE =================
  if (loading) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="p-6 text-gray-500">
          Loading dashboard...
        </div>
      </DashboardLayout>
    );
  }

  // ================= ERROR STATE =================
  if (!dashboard) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="p-6 text-red-500">
          Failed to load dashboard
        </div>
      </DashboardLayout>
    );
  }

  const handleDownloadReport = async () => {
    try {
      setDownloadingReport(true);
      const blob = await dashboardService.downloadReportPdf();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const rawName = dashboard?.user?.name || "student";
      const safeName = rawName.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      link.href = url;
      link.download = `${safeName}_performance_report.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Report download is available on Premium plan.");
    } finally {
      setDownloadingReport(false);
    }
  };

  // ================= MAIN DASHBOARD =================
  return (
    <DashboardLayout title="Dashboard">
      <div className="text-gray-700 dark:text-gray-200 transition-colors duration-300">

        {/* ================= PAGE HEADING ================= */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold">
            Welcome back, {dashboard.user?.name || "Student"} 👋
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Here’s your performance overview.
          </p>
        </div>

        {/* ================= PROFILE SUMMARY ================= */}
        <div className="mb-6">
          <ProfileSummaryCard student={dashboard.user} />
        </div>

        {/* ================= STATS + ACCURACY ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">

          {/* Stats Section */}
          <div className="lg:col-span-3">
            <StatsSection
              dashboardData={dashboard}
              onRankClick={() => navigate("/leaderboard")}
            />
          </div>

          {/* Overall Accuracy */}
          <OverallAccuracyCard
            accuracy={dashboard.overall_accuracy || 0}
          />

        </div>

        {/* ================= PERFORMANCE + RECENT + SKILLS ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">

          {/* LEFT SIDE */}
          <div className="lg:col-span-3 space-y-6">

            {/* Performance Chart */}
            <PerformanceSection
              data={dashboard.performance_overview || []}
            />

            {/* Recent Assessments Table */}
            <RecentAssessmentsSection
              assessments={dashboard.recent_assessments || []}
            />

          </div>

          {/* RIGHT SIDE */}
          <div className="lg:col-span-2">

            {/* Skill Proficiency */}
            <SkillProficiencyCard
              skills={dashboard.skill_proficiency || []}
              onDownloadReport={handleDownloadReport}
              downloadingReport={downloadingReport}
            />

          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}



