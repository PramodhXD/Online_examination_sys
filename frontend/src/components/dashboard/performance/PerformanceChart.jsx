import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

function formatShortLabel(value) {
  const text = String(value || "");
  return text.length > 12 ? `${text.slice(0, 12)}...` : text;
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0]?.payload;
  if (!item) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        {item.fullLabel || item.label}
      </p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Score: <span className="font-semibold text-slate-900 dark:text-slate-100">{item.score}%</span>
      </p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Date: <span className="font-semibold text-slate-900 dark:text-slate-100">{item.displayDate || "Unknown"}</span>
      </p>
    </div>
  );
}

export default function PerformanceChart({ data = [] }) {
  const chartData = data.map((item, index) => ({
    ...item,
    fullLabel: String(item?.label || `Attempt ${index + 1}`),
    label: formatShortLabel(item?.label || `Attempt ${index + 1}`),
    displayDate: item?.date
      ? new Date(item.date).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "",
  }));

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        No performance data available.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />

        <XAxis
          dataKey="label"
          stroke="#8884d8"
          interval="preserveStartEnd"
          height={56}
          angle={-45}
          textAnchor="end"
          tick={{ fontSize: 12 }}
          minTickGap={18}
        />

        <YAxis
          domain={[0, "dataMax + 5"]}
          stroke="#8884d8"
          tick={{ fontSize: 12 }}
        />

        <Tooltip content={<CustomTooltip />} />

        <Line
          type="monotone"
          dataKey="score"
          stroke="#2563eb"
          strokeWidth={3}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
