import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function PerformanceChart({ data = [] }) {
  const chartData = data.map((item, index) => ({
    ...item,
    label: String(item?.label || `Attempt ${index + 1}`),
  }));

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        No performance data available.
      </div>
    );
  }

  const compactLabel = (value) => {
    const text = String(value || "");
    return text.length > 14 ? `${text.slice(0, 14)}...` : text;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />

        <XAxis
          dataKey="label"
          stroke="#8884d8"
          interval={0}
          height={56}
          angle={-12}
          textAnchor="end"
          tick={{ fontSize: 12 }}
          tickFormatter={compactLabel}
        />

        <YAxis
          domain={[0, "dataMax + 5"]}
          stroke="#8884d8"
          tick={{ fontSize: 12 }}
        />

        <Tooltip />

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
