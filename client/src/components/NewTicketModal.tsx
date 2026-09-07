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

  const inputClass =
    "w-full border-2 border-ink bg-paper px-3 py-2 text-sm font-mono focus:outline-none focus:bg-panel";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-4">
      <div className="w-full max-w-lg border-2 border-ink bg-panel shadow-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-mono text-base font-bold uppercase tracking-wide text-ink">New ticket</h2>
          <button onClick={onClose} className="text-ink/50 hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <p className="text-[11px] text-muted mb-2">
          Optional starting points — edit freely, or write your own problem from scratch:
        </p>
        <div className="flex flex-wrap gap-2 mb-5">
          {EXAMPLES.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p)}
              className="text-[11px] font-mono uppercase tracking-wide border border-ink/40 text-ink px-2.5 py-1 hover:bg-ink hover:text-paper transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-[0.15em] text-muted block mb-1">Subject</label>
            <input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={inputClass}
              placeholder="Short summary of the problem"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-[0.15em] text-muted block mb-1">Customer name</label>
              <input required value={customer} onChange={(e) => setCustomer(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.15em] text-muted block mb-1">Channel</label>
              <select value={channel} onChange={(e) => setChannel(e.target.value)} className={inputClass}>
                <option value="web_form">Web form</option>
                <option value="chat">Chat</option>
                <option value="email">Email</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-[0.15em] text-muted block mb-1">Customer's message</label>
            <textarea
              required
              value={rawMessage}
              onChange={(e) => setRawMessage(e.target.value)}
              rows={4}
              className={inputClass}
              placeholder="What the customer actually said"
            />
            <p className="text-[11px] text-muted mt-1">
              Describe a real problem in your own words — the L1 agent reads this text directly and reasons about it,
              it isn't matched against any preset category.
            </p>
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono uppercase tracking-wide text-ink/60 hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="border-2 border-ink bg-ink text-paper px-5 py-2 text-xs font-mono uppercase tracking-wide font-bold hover:bg-accent hover:border-accent disabled:opacity-40 transition-colors"
            >
              {busy ? "Creating…" : "Create ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}