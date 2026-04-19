import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function ChartsSection({ analytics = [] }) {
  const cleaned = analytics
    .map((item) => ({
      ...item,
      attempts: Number(item?.attempts || 0),
      average: Number(item?.average || 0),
    }));

  const topParticipation = cleaned
    .filter((item) => item.attempts > 0)
    .sort((a, b) => b.attempts - a.attempts)
    .slice(0, 5);

  const topPerformance = cleaned
    .filter((item) => item.attempts > 0)
    .sort((a, b) => b.average - a.average)
    .slice(0, 5);

  const normalizeExamLabel = (raw, idx) => {
    const value = String(raw || "").trim();
    if (!value) return `Exam ${idx + 1}`;
    return value
      .replace(/^Practice:\s*/i, "")
      .replace(/\bAssessment\b/gi, "")
      .replace(/\bPractice\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  };
  const shortTick = (value) => (String(value).length > 14 ? `${String(value).slice(0, 14)}...` : value);

  const participationSource = topParticipation.length > 0 ? topParticipation : cleaned.slice(0, 5);
  const performanceSource = topPerformance.length > 0 ? topPerformance : cleaned.slice(0, 5);

  const participationData = participationSource.map((x, i) => ({
    name: normalizeExamLabel(x.exam, i),
    value: x.attempts || 0,
  }));
  const performanceData = performanceSource.map((x, i) => ({
    name: normalizeExamLabel(x.exam, i),
    avg: x.average || 0,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Exam Participation</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Number of students attempting exams</p>
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={participationData} margin={{ top: 8, right: 8, left: 0, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                interval={0}
                height={70}
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                tickFormatter={shortTick}
                angle={-8}
                textAnchor="end"
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <Tooltip
                cursor={{ fill: "#0b1220" }}
                formatter={(value) => [value, "Attempts"]}
                labelFormatter={(label) => `Exam: ${label}`}
                contentStyle={{ borderRadius: "12px", border: "1px solid #1f2937", background: "#0f172a", color: "#e2e8f0", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.35)" }}
              />
              <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Average Scores by Exam</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Performance comparison across exams</p>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 rounded-lg text-xs font-bold">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              Average Score
            </div>
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={performanceData} margin={{ top: 8, right: 8, left: 0, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                interval={0}
                height={70}
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                tickFormatter={shortTick}
                angle={-8}
                textAnchor="end"
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} domain={[0, 100]} />
              <Tooltip
                formatter={(value) => [`${Number(value).toFixed(2)}%`, "Average Score"]}
                labelFormatter={(label) => `Exam: ${label}`}
                contentStyle={{ borderRadius: "12px", border: "1px solid #1f2937", background: "#0f172a", color: "#e2e8f0", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.35)" }}
              />
              <Bar dataKey="avg" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
