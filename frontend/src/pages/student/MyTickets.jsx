import { useEffect, useState } from "react";
import DashboardLayout from "../../components/dashboard/layout/DashboardLayout";
import { getMyTickets } from "../../services/userService";

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

export default function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTickets = async () => {
      try {
        const data = await getMyTickets();
        setTickets(Array.isArray(data) ? data : []);
      } catch {
        setTickets([]);
      } finally {
        setLoading(false);
      }
    };

    void loadTickets();
  }, []);

  return (
    <DashboardLayout title="My Tickets">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">My Tickets</h2>
          <p className="text-slate-500">Track ticket status, latest updates, and every admin reply.</p>
        </div>

        {loading ? (
          <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
            Loading tickets...
          </div>
        ) : tickets.length === 0 ? (
          <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
            No tickets found.
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{ticket.subject}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {ticket.ticket_id} • Created {new Date(ticket.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClasses(ticket.status)}`}>
                    {formatStatus(ticket.status)}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">{ticket.category}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">{ticket.priority}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                    Updated {new Date(ticket.updated_at).toLocaleString()}
                  </span>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your message</p>
                  <p className="mt-2 text-sm text-slate-700">{ticket.message}</p>
                </div>

                <div className="mt-5 border-t pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-slate-800">Conversation</h4>
                    <span className="text-xs text-slate-500">
                      {ticket.replies?.length ? `${ticket.replies.length} reply${ticket.replies.length > 1 ? "ies" : ""}` : "Awaiting admin reply"}
                    </span>
                  </div>

                  {ticket.replies?.length ? (
                    <div className="mt-3 space-y-3">
                      {ticket.replies.map((reply) => {
                        const isAdmin = String(reply.author_role || "").toLowerCase() === "admin";
                        return (
                          <div
                            key={reply.id}
                            className={`rounded-xl p-3 ${isAdmin ? "bg-blue-50" : "bg-slate-50"}`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${isAdmin ? "bg-blue-600 text-white" : "bg-slate-800 text-white"}`}>
                                  {isAdmin ? "Admin" : "Student"}
                                </span>
                                <span className="text-xs font-semibold uppercase text-slate-500">
                                  {reply.author_name}
                                </span>
                              </div>
                              <span className="text-xs text-slate-400">
                                {new Date(reply.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-700">{reply.message}</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      No admin reply yet. We&apos;ll update this page as soon as the support team responds.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
