import React from "react";
import {
  Users,
  FileText,
  Activity,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  ShieldAlert,
} from "lucide-react";
import StatCard from "./StatCard";

const StatsSection = ({ statsData }) => {
  const stats = [
    {
      label: "Total Students",
      value: statsData?.total_students ?? 0,
      icon: Users,
      color: "bg-blue-500",
      trend: { isUp: true, value: "0%" },
    },
    {
      label: "Active Exams",
      value: statsData?.published_exams ?? 0,
      icon: FileText,
      color: "bg-purple-500",
      trend: { isUp: true, value: "0%" },
    },
    {
      label: "Published Exams",
      value: statsData?.published_exams ?? 0,
      icon: FileText,
      color: "bg-emerald-500",
      trend: { isUp: true, value: "0%" },
    },
    {
      label: "Draft Exams",
      value: statsData?.draft_exams ?? 0,
      icon: FileText,
      color: "bg-amber-500",
      trend: { isUp: true, value: "0%" },
    },
    {
      label: "Ongoing Exams",
      value: statsData?.ongoing_sessions ?? 0,
      icon: Activity,
      color: "bg-green-500",
      trend: { isUp: true, value: "0%" },
    },
    {
      label: "Completed",
      value: statsData?.completed_attempts ?? 0,
      icon: CheckCircle,
      color: "bg-slate-500",
      trend: { isUp: true, value: "0%" },
    },
    {
      label: "Violation Submitted",
      value: statsData?.violation_submitted_attempts ?? 0,
      icon: ShieldAlert,
      color: "bg-rose-500",
      trend: { isUp: true, value: "0%" },
    },
    {
      label: "Cheating Alerts",
      value: statsData?.cheating_alerts ?? 0,
      icon: AlertTriangle,
      color: "bg-red-500",
      trend: { isUp: false, value: "0%" },
    },
    {
      label: "Average Score",
      value: `${Math.round(statsData?.average_score ?? 0)}%`,
      icon: TrendingUp,
      color: "bg-orange-500",
      trend: { isUp: true, value: "0%" },
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
};

export default StatsSection;
