import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/dashboard/layout/DashboardLayout";
import StatsSection from "../../components/dashboard/stats/StatsSection";
import PerformanceSection from "../../components/dashboard/performance/PerformanceSection";
import RecentAssessmentsSection from "../../components/dashboard/assessments/RecentAssessmentsSection";
import ProfileSummaryCard from "../../components/dashboard/ProfileSummaryCard";
import OverallAccuracyCard from "../../components/dashboard/stats/OverallAccuracyCard";
import SkillProficiencyCard from "../../components/dashboard/performance/SkillProficiencyCard";
import WeeklyProgressCard from "../../components/dashboard/stats/WeeklyProgressCard";

import dashboardService from "../../services/dashboardService";

function calculateWeeklyImprovement(performanceOverview = []) {
  if (!Array.isArray(performanceOverview) || performanceOverview.length < 2) {
    return 0;
  }

  const scores = performanceOverview
    .map((item) => Number(item?.score))
    .filter((score) => !Number.isNaN(score));

  if (scores.length < 2) {
    return 0;
  }

  const recentSlice = scores.slice(-3);
  const previousSlice = scores.slice(-6, -3);

  const currentAverage =
    recentSlice.reduce((sum, score) => sum + score, 0) / recentSlice.length;
  const previousAverage =
    previousSlice.length > 0
      ? previousSlice.reduce((sum, score) => sum + score, 0) / previousSlice.length
      : scores[0];

  if (!previousAverage) {
    return currentAverage;
  }

  return currentAverage - previousAverage;
}

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

  const weeklyImprovement = calculateWeeklyImprovement(
    dashboard.performance_overview || []
  );

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
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <StatsSection
            dashboardData={dashboard}
            onRankClick={() => navigate("/leaderboard")}
          />
          <OverallAccuracyCard
            accuracy={dashboard.overall_accuracy || 0}
          />
          <WeeklyProgressCard improvement={weeklyImprovement} />
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



