import { FileText, BarChart3, Trophy, Medal } from "lucide-react";
import StatCard from "./StatCard";

export default function StatsSection({ dashboardData, onRankClick }) {
  if (!dashboardData) return null;

  const totalExams = dashboardData.total_exams ?? 0;
  const averageScore = dashboardData.average_score ?? 0;
  const highestScore = dashboardData.highest_score ?? 0;
  const rank = dashboardData.rank;

  const stats = [
    {
      title: "Total Exams",
      value: totalExams,
      subtitle: "Completed exams",
      icon: <FileText className="h-4 w-4 text-blue-600" />,
      color: "bg-blue-100",
    },
    {
      title: "Avg Score",
      value: `${Number(averageScore).toFixed(1)}%`,
      subtitle: "Across all exams",
      icon: <BarChart3 className="h-4 w-4 text-purple-600" />,
      color: "bg-purple-100",
    },
    {
      title: "High Score",
      value: `${Number(highestScore).toFixed(1)}%`,
      subtitle: "Best performance",
      icon: <Trophy className="h-4 w-4 text-green-600" />,
      color: "bg-green-100",
    },
    {
      title: "Rank",
      value: rank ? `#${rank}` : "-",
      subtitle: "Batch standing",
      icon: <Medal className="h-4 w-4 text-yellow-600" />,
      color: "bg-yellow-100",
      onClick: onRankClick,
      clickable: true,
      action: onRankClick ? (
        <span
          role="button"
          tabIndex={0}
          onClick={(event) => {
            event.stopPropagation();
            onRankClick();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.stopPropagation();
              onRankClick();
            }
          }}
          className="inline-flex items-center whitespace-nowrap text-[11px] font-semibold text-blue-600 transition hover:text-blue-700"
        >
          Leaderboard <span className="ml-1" aria-hidden="true">-&gt;</span>
        </span>
      ) : null,
    },
  ];

  return (
    <div className="contents">
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
          action={stat.action}
        />
      ))}
    </div>
  );
}
