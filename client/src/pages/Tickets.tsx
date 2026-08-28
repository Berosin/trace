import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useStore } from "../hooks/StoreContext";
import { StatusBadge, AgentPill, ConfidenceMeter, EmptyState, SectionLabel } from "../components/Atoms";
import { NewTicketModal } from "../components/NewTicketModal";

export function Tickets() {
  const { tickets, incidents } = useStore();
  const [showNew, setShowNew] = useState(false);

  const incidentTitle = (id: string | null) => (id ? incidents.find((i) => i.id === id)?.shortId ?? "—" : "—");

  return (
    <div className="px-10 py-8 max-w-5xl">
      <SectionLabel>Tickets</SectionLabel>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-ink">All tickets</h1>
          <p className="text-sm text-ink/50 mt-1">
            Every ticket here is investigated live by an LLM reasoning over its actual text — nothing is scripted.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-delft text-porcelain px-4 py-2 text-sm font-medium hover:bg-ink transition-colors shrink-0"
        >
          <Plus size={15} /> New ticket
        </button>
      </div>

      {tickets.length === 0 ? (
        <EmptyState title="No tickets yet" body="Create one above with a real problem description, then open it to walk the investigation forward step by step." />
      ) : (
        <div className="rounded-2xl border border-door-light bg-white shadow-panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ink/45 border-b border-door-light bg-linen/50">
                <th className="px-5 py-3 font-medium">Ticket</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Agent</th>
                <th className="px-5 py-3 font-medium">Confidence</th>
                <th className="px-5 py-3 font-medium">Incident</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-door-light/70">
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-linen/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link to={`/tickets/${t.id}`} className="block">
                      <p className="font-medium text-ink">
                        <span className="font-mono text-delft mr-2">{t.shortId}</span>
                        {t.subject}
                      </p>
                      <p className="text-xs text-ink/45 mt-0.5">{t.customer}</p>
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <AgentPill role={t.assignedAgent} />
                  </td>
                  <td className="px-5 py-3.5">
                    <ConfidenceMeter value={t.diagnosticState.confidence} />
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-ink/60">{incidentTitle(t.incidentId)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && <NewTicketModal onClose={() => setShowNew(false)} />}
    </div>
  );
}
