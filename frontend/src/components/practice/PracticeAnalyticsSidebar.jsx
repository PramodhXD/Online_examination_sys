import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const GAUGE_COLORS = ["#1d4ed8", "#e5e7eb"]; // blue, light gray

export default function PracticeAnalyticsSidebar({
  totalQuestions = 15,
  correct = 0,
  wrong = 0,
}) {
  const attempted = correct + wrong;
  const accuracy =
    attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

  /* -------- Gauge Data -------- */
  const gaugeData = [
    { name: "Accuracy", value: accuracy },
    { name: "Remaining", value: 100 - accuracy },
  ];

  /* -------- Bar Chart Data -------- */
  const barData = [
    {
      name: "Questions",
      Questions: totalQuestions,
      Correct: correct,
      Wrong: wrong,
    },
  ];

  return (
    <aside className="bg-white w-full h-full p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center">
      {/* Accuracy Gauge */}
      <div className="w-full h-40 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={gaugeData}
              startAngle={180}
              endAngle={0}
              innerRadius={60}
              outerRadius={85}
              cx="50%"
              cy="85%"
              paddingAngle={0}
              dataKey="value"
              stroke="none"
            >
              {gaugeData.map((_, i) => (
                <Cell key={i} fill={GAUGE_COLORS[i]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute bottom-2 w-full text-center">
          <p className="text-2xl font-semibold">{accuracy}%</p>
          <p className="text-blue-600 text-sm font-semibold">Accuracy</p>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="w-full h-48 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData}>
            <XAxis dataKey="name" hide />
            <YAxis />
            <Tooltip />
            <Bar dataKey="Questions" fill="#2563eb" />
            <Bar dataKey="Correct" fill="#22c55e" />
            <Bar dataKey="Wrong" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stats */}
      <div className="text-sm mt-4 space-y-1.5 text-center w-full rounded-2xl bg-slate-50 border border-slate-200 p-4">
        <p>
          <b>Questions:</b> {totalQuestions}
        </p>
        <p className="text-green-600">
          <b>Correct:</b> {correct}
        </p>
        <p className="text-orange-500">
          <b>Wrong:</b> {wrong}
        </p>
        <p className="font-semibold">
          Solving Accuracy: {accuracy}%
        </p>
      </div>
    </aside>
  );
}
