import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/admin/layout/Sidebar";
import Header from "../../components/admin/layout/Header";
import adminService from "../../services/adminService";

const STATUS_FILTERS = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Resolved", value: "resolved" },
];

function formatStatus(status) {
  return String(status || "open").replaceAll("_", " ");
}

function statusClasses(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "resolved") return "bg-emerald-100 text-emerald-700";
  if (normalized === "closed") return "bg-slate-200 text-slate-700";
  if (normalized === "in_progress") return "bg-amber-100 text-amber-700";
  return "bg-blue-100 text-blue-700";
}

export default function AdminTickets() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getTickets({ search: query, status });
      setTickets(Array.isArray(data) ? data : []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [query, status]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadTickets();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadTickets]);

  const stats = useMemo(() => {
    const counts = { open: 0, in_progress: 0, resolved: 0 };
    tickets.forEach((ticket) => {
      const normalized = String(ticket.status || "").toLowerCase();
      if (normalized in counts) counts[normalized] += 1;
    });
    return counts;
  }, [tickets]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#0f172a] to-[#1e293b]">
      <Sidebar activeTab="support" isOpen={isSidebarOpen} />
      <div className={`min-h-screen min-w-0 flex flex-col transition-all duration-300 ${isSidebarOpen ? "lg:pl-64" : "lg:pl-20"}`}>
        <Header activeTab="support" toggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />

        <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
          <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">Support Ticket Inbox</h2>
              <p className="text-slate-300">Review student issues, track status, and open the full conversation.</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white backdrop-blur">
                <p className="text-xs uppercase tracking-wide text-slate-300">Open</p>
                <p className="mt-1 text-2xl font-semibold">{stats.open}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white backdrop-blur">
                <p className="text-xs uppercase tracking-wide text-slate-300">In Progress</p>
                <p className="mt-1 text-2xl font-semibold">{stats.in_progress}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white backdrop-blur">
                <p className="text-xs uppercase tracking-wide text-slate-300">Resolved</p>
                <p className="mt-1 text-2xl font-semibold">{stats.resolved}</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row">
              <label className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by ticket id, student, subject, or message"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
              >
                {STATUS_FILTERS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Ticket</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Student</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Latest Reply</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Updated</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">
                        Loading tickets...
                      </td>
                    </tr>
                  ) : tickets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">
                        No tickets match the current filters.
                      </td>
                    </tr>
                  ) : (
                    tickets.map((ticket) => (
                      <tr
                        key={ticket.id}
                        className="cursor-pointer transition hover:bg-slate-50"
                        onClick={() => navigate(`/admin/tickets/${ticket.id}`)}
                      >
                        <td className="px-6 py-5">
                          <p className="text-sm font-semibold text-slate-900">{ticket.subject}</p>
                          <p className="mt-1 text-xs text-slate-500">{ticket.ticket_id}</p>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-sm font-medium text-slate-800">{ticket.student_name}</p>
                          <p className="mt-1 text-xs text-slate-500">{ticket.student_email}</p>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClasses(ticket.status)}`}>
                            {formatStatus(ticket.status)}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <p className="max-w-sm truncate text-sm text-slate-600">
                            {ticket.admin_reply || "Awaiting admin response"}
                          </p>
                        </td>
                        <td className="px-6 py-5 text-sm text-slate-500">
                          {new Date(ticket.updated_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-5">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate(`/admin/tickets/${ticket.id}`);
                            }}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          >
                            Open
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
