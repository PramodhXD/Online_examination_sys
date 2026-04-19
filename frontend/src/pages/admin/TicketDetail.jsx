import { useEffect, useState } from "react";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../../components/admin/layout/Sidebar";
import Header from "../../components/admin/layout/Header";
import adminService from "../../services/adminService";

const STATUS_OPTIONS = [
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

export default function TicketDetail() {
  const navigate = useNavigate();
  const { ticketId } = useParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("in_progress");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadTicket = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await adminService.getTicketDetail(ticketId);
        setTicket(data);
        setStatus(data?.status || "in_progress");
      } catch (err) {
        setError(err?.response?.data?.detail || "Unable to load ticket.");
      } finally {
        setLoading(false);
      }
    };

    if (ticketId) {
      void loadTicket();
    }
  }, [ticketId]);

  const handleSubmit = async () => {
    const message = reply.trim();
    if (!message) {
      setError("Reply message is required.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      const updated = await adminService.replyAndUpdateTicket(ticketId, { message, status });
      setTicket(updated);
      setReply("");
      setStatus(updated?.status || status);
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to send reply.");
    } finally {
      setSaving(false);
    }
  };

  const timeline = ticket
    ? [
        {
          id: `student-${ticket.id}`,
          author_role: "student",
          author_name: ticket.student_name,
          message: ticket.message,
          created_at: ticket.created_at,
        },
        ...(ticket.replies || []),
      ]
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#0f172a] to-[#1e293b]">
      <Sidebar activeTab="support" isOpen={isSidebarOpen} />
      <div className={`min-h-screen min-w-0 flex flex-col transition-all duration-300 ${isSidebarOpen ? "lg:pl-64" : "lg:pl-20"}`}>
        <Header activeTab="support" toggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />

        <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/admin/tickets")}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/15"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to tickets
            </button>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
              Loading ticket details...
            </div>
          ) : error && !ticket ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-10 text-center text-red-700 shadow-sm">
              {error}
            </div>
          ) : ticket ? (
            <div className="grid gap-6 xl:grid-cols-[1.4fr,0.8fr]">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 border-b border-slate-100 pb-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">{ticket.ticket_id}</p>
                      <h2 className="mt-2 text-2xl font-semibold text-slate-900">{ticket.subject}</h2>
                      <p className="mt-2 text-sm text-slate-500">
                        {ticket.student_name} • {ticket.student_email}
                      </p>
                    </div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClasses(ticket.status)}`}>
                      {formatStatus(ticket.status)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{ticket.category}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{ticket.priority}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                      Created {new Date(ticket.created_at).toLocaleString()}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                      Updated {new Date(ticket.updated_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {timeline.map((entry, index) => {
                    const isAdmin = String(entry.author_role || "").toLowerCase() === "admin";
                    return (
                      <div
                        key={entry.id || `${entry.author_role}-${index}`}
                        className={`rounded-2xl border p-4 ${isAdmin ? "border-blue-100 bg-blue-50/70" : "border-slate-200 bg-slate-50"}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${isAdmin ? "bg-blue-600 text-white" : "bg-slate-900 text-white"}`}>
                              {isAdmin ? "Admin" : "Student"}
                            </span>
                            <span className="text-sm font-semibold text-slate-800">{entry.author_name}</span>
                          </div>
                          <span className="text-xs text-slate-500">{new Date(entry.created_at).toLocaleString()}</span>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{entry.message}</p>
                      </div>
                    );
                  })}
                </div>
              </section>

              <aside className="space-y-6">
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-slate-900">Reply to Student</h3>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">Send an update and move the ticket through its lifecycle.</p>

                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
                      <select
                        value={status}
                        onChange={(event) => setStatus(event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Reply</label>
                      <textarea
                        value={reply}
                        onChange={(event) => setReply(event.target.value)}
                        rows={8}
                        placeholder="Write a helpful reply for the student..."
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                      />
                    </div>

                    {error ? <p className="text-sm text-red-600">{error}</p> : null}

                    <button
                      type="button"
                      onClick={() => void handleSubmit()}
                      disabled={saving}
                      className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                    >
                      {saving ? "Sending..." : "Send Reply"}
                    </button>
                  </div>
                </section>
              </aside>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
