import { FileText, BarChart3, Trophy, Medal } from "lucide-react";
import StatCard from "./StatCard";

export default function StatsSection({ dashboardData, onRankClick }) {
  if (!dashboardData) return null;

  // Safe fallback values
  const totalExams = dashboardData.total_exams ?? 0;
  const averageScore = dashboardData.average_score ?? 0;
  const highestScore = dashboardData.highest_score ?? 0;
  const rank = dashboardData.rank;

  const stats = [
    {
      title: "Total Exams",
      value: totalExams,
      subtitle: "Completed exams",
      icon: <FileText className="w-5 h-5 text-white" />,
      color: "bg-blue-500",
    },
    {
      title: "Average Score",
      value: `${Number(averageScore).toFixed(1)}%`,
      subtitle: "Across all exams",
      icon: <BarChart3 className="w-5 h-5 text-white" />,
      color: "bg-purple-500",
    },
    {
      title: "Highest Score",
      value: `${Number(highestScore).toFixed(1)}%`,
      subtitle: "Best performance",
      icon: <Trophy className="w-5 h-5 text-white" />,
      color: "bg-green-500",
    },
    {
      title: "Rank",
      value: rank ? `#${rank}` : "-",
      subtitle: "In your batch (click to view leaderboard)",
      icon: <Medal className="w-5 h-5 text-white" />,
      color: "bg-yellow-500",
      onClick: onRankClick,
      clickable: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <StatCard
          key={index}
          title={stat.title}
          value={stat.value}
          subtitle={stat.subtitle}
          icon={stat.icon}
          color={stat.color}
          onClick={stat.onClick}
          clickable={stat.clickable}
        />
      ))}
    </div>
  );
}
