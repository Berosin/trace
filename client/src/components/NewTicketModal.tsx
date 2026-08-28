import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { api } from "../services/api";

// These are just editable starting points to save typing during a live demo —
// the reasoning engine doesn't key off any of this text specifically. Type
// your own real problem and it's investigated exactly the same way.
const EXAMPLES = [
  {
    label: "Billing example",
    subject: "Discount code SUMMER20 not applying — charged full price",
    customer: "Jamie T.",
    channel: "web_form",
    rawMessage: "My SUMMER20 code didn't apply on order #48213, I was charged full price at checkout and I've already tried twice.",
  },
  {
    label: "Auth example",
    subject: "Password reset email never arrives",
    customer: "Sam K.",
    channel: "email",
    rawMessage: "I requested a password reset three times and the email never shows up in my inbox.",
  },
  {
    label: "API example",
    subject: "Webhook deliveries failing intermittently since yesterday",
    customer: "Priya D.",
    channel: "email",
    rawMessage: "Around 1 in 5 of our webhook events are timing out since yesterday afternoon. Nothing changed on our side — this started right after we saw a deploy notice from you.",
  },
  { label: "Start blank", subject: "", customer: "", channel: "web_form", rawMessage: "" },
];

export function NewTicketModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [subject, setSubject] = useState("");
  const [customer, setCustomer] = useState("");
  const [channel, setChannel] = useState("web_form");
  const [rawMessage, setRawMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyPreset(p: (typeof EXAMPLES)[number]) {
    setSubject(p.subject);
    setCustomer(p.customer);
    setChannel(p.channel);
    setRawMessage(p.rawMessage);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const ticket = await api.createTicket({ subject, customer, channel, rawMessage });
      onClose();
      navigate(`/tickets/${ticket.id}`);
    } catch (err: any) {
      setError(err.message ?? "Could not create ticket");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-2xl border border-door-light bg-white shadow-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl text-ink">New ticket</h2>
          <button onClick={onClose} className="text-ink/40 hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-ink/45 mb-2">
          Optional starting points — edit freely, or write your own problem from scratch:
        </p>
        <div className="flex flex-wrap gap-2 mb-5">
          {EXAMPLES.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p)}
              className="text-xs rounded-full border border-door-deep/30 text-delft px-3 py-1.5 hover:bg-door-light/40"
            >
              {p.label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-wide text-ink/45 block mb-1">Subject</label>
            <input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-door-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-door-deep/40"
              placeholder="Short summary of the problem"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wide text-ink/45 block mb-1">Customer name</label>
              <input
                required
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                className="w-full rounded-lg border border-door-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-door-deep/40"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wide text-ink/45 block mb-1">Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full rounded-lg border border-door-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-door-deep/40"
              >
                <option value="web_form">Web form</option>
                <option value="chat">Chat</option>
                <option value="email">Email</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wide text-ink/45 block mb-1">Customer's message</label>
            <textarea
              required
              value={rawMessage}
              onChange={(e) => setRawMessage(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-door-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-door-deep/40"
              placeholder="What the customer actually said"
            />
            <p className="text-[11px] text-ink/40 mt-1">
              Describe a real problem in your own words — the L1 agent reads this text directly and reasons about it,
              it isn't matched against any preset category.
            </p>
          </div>

          {error && <p className="text-xs text-rust">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm text-ink/60 hover:bg-linen">
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-delft text-porcelain px-5 py-2 text-sm font-medium hover:bg-ink disabled:opacity-40"
            >
              {busy ? "Creating…" : "Create ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
