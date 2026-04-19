import { PlayCircle, CheckCircle, AlertTriangle, UserMinus } from "lucide-react";
import { useNavigate } from "react-router-dom";

function formatTime(d) {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function iconFor(type) {
  if (type === "Security") return { icon: AlertTriangle, color: "text-red-500 bg-red-50 dark:bg-red-500/20" };
  if (type === "System") return { icon: CheckCircle, color: "text-green-500 bg-green-50 dark:bg-green-500/20" };
  if (type === "Admin") return { icon: UserMinus, color: "text-slate-500 bg-slate-50 dark:bg-slate-800" };
  return { icon: PlayCircle, color: "text-blue-500 bg-blue-50 dark:bg-blue-500/20" };
}

export default function RecentActivity({ logs = [], loading = false }) {
  const navigate = useNavigate();
  const items = logs.slice(0, 6).map((l) => {
    const meta = iconFor(l.event_type);
    return {
      id: l.id,
      title: `${l.event_type} Event`,
      desc: l.message,
      time: formatTime(l.created_at),
      icon: meta.icon,
      color: meta.color,
    };
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col h-full">
      <div className="p-6 border-b border-slate-100 dark:border-slate-700">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Recent Activities</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Latest system logs and notifications</p>
      </div>

      <div className="p-6 flex-1 space-y-6 overflow-y-auto">
        {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading activities...</p>}
        {!loading && items.map((activity) => {
          const Icon = activity.icon;
          return (
            <div key={activity.id} className="flex gap-4 relative last:after:hidden after:absolute after:left-[19px] after:top-10 after:bottom-[-24px] after:w-px after:bg-slate-100 dark:after:bg-slate-800">
              <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${activity.color} z-10`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-4">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{activity.title}</h4>
                  <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap">{activity.time}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{activity.desc}</p>
              </div>
            </div>
          );
        })}
        {!loading && items.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No recent logs.</p>}
      </div>

      <div className="p-4 border-t border-slate-100 dark:border-slate-700 mt-auto">
        <button onClick={() => navigate("/admin/reports")} className="w-full py-2 text-sm font-semibold text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
          View All Logs
        </button>
      </div>
    </div>
  );
}
