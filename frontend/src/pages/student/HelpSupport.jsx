import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, CircleHelp, Headset, LifeBuoy } from "lucide-react";
import DashboardLayout from "../../components/dashboard/layout/DashboardLayout";
import { submitSupportTicket } from "../../services/userService";

const FAQ_ITEMS = [
  {
    question: "Why did my exam auto-submit?",
    answer:
      "Assessments can auto-submit on timeout, repeated proctoring violations, or severe connectivity interruptions.",
  },
  {
    question: "Can I resume an unfinished attempt?",
    answer:
      "Yes. If an attempt is still open, the system prompts you to resume instead of creating a new attempt.",
  },
  {
    question: "I cannot access an assigned exam. What should I do?",
    answer:
      "Confirm the exam is assigned to your account and that your subscription/attempt limits are not exhausted. Then raise a support ticket.",
  },
  {
    question: "Where can I download certificates?",
    answer:
      "Use the Certificates page. Eligibility depends on your result and plan policies configured by your admin.",
  },
];

export default function HelpSupport() {
  const [openIndex, setOpenIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    subject: "",
    category: "technical",
    priority: "medium",
    message: "",
  });

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setSuccess("");
    setError("");

    try {
      const response = await submitSupportTicket(form);
      setSuccess(`Ticket submitted successfully. Ticket ID: ${response.ticket_id}`);
      setForm({
        subject: "",
        category: "technical",
        priority: "medium",
        message: "",
      });
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Unable to submit ticket right now.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Help & Support">
      <div className="max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-5 gap-8">
        <section className="xl:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <CircleHelp className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-slate-900">Frequently Asked Questions</h2>
            </div>

            <div className="space-y-3">
              {FAQ_ITEMS.map((item, index) => {
                const isOpen = index === openIndex;
                return (
                  <div key={item.question} className="rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setOpenIndex(isOpen ? -1 : index)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left"
                    >
                      <span className="font-medium text-slate-800">{item.question}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-500 transition ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 text-sm text-slate-600">{item.answer}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="xl:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Headset className="w-5 h-5 text-emerald-600" />
              <h2 className="text-xl font-semibold text-slate-900">Report an Issue</h2>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <label className="block text-sm">
                <span className="text-slate-700 font-medium">Subject</span>
                <input
                  required
                  minLength={5}
                  value={form.subject}
                  onChange={(e) => onChange("subject", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="Short issue title"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="text-slate-700 font-medium">Category</span>
                  <select
                    value={form.category}
                    onChange={(e) => onChange("category", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    <option value="technical">Technical</option>
                    <option value="exam">Exam</option>
                    <option value="account">Account</option>
                    <option value="billing">Billing</option>
                  </select>
                </label>

                <label className="block text-sm">
                  <span className="text-slate-700 font-medium">Priority</span>
                  <select
                    value={form.priority}
                    onChange={(e) => onChange("priority", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
              </div>

              <label className="block text-sm">
                <span className="text-slate-700 font-medium">Message</span>
                <textarea
                  required
                  minLength={10}
                  rows={5}
                  value={form.message}
                  onChange={(e) => onChange("message", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 resize-none"
                  placeholder="Describe the issue in detail"
                />
              </label>

              {success && <p className="text-sm text-emerald-700">{success}</p>}
              {error && <p className="text-sm text-rose-700">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className={`w-full rounded-lg py-2.5 text-sm font-semibold text-white ${
                  submitting ? "bg-slate-400" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {submitting ? "Submitting..." : "Submit Ticket"}
              </button>
            </form>

            <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm">
              <div className="flex items-center gap-2 text-slate-800 font-medium">
                <LifeBuoy className="w-4 h-4" />
                Policies
              </div>
              <div className="mt-3">
                <Link to="/my-tickets" className="text-blue-600 hover:underline">
                  View My Tickets
                </Link>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-blue-600">
                <Link to="/terms" className="hover:underline">Terms</Link>
                <Link to="/privacy" className="hover:underline">Privacy</Link>
                <Link to="/exam-rules" className="hover:underline">Exam Rules</Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
