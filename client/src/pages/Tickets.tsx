import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useStore } from "../hooks/StoreContext";
import { StatusBadge, AgentPill, ConfidenceMeter, EmptyState, SectionLabel, AGENT_LABEL } from "../components/Atoms";
import { NewTicketModal } from "../components/NewTicketModal";

export function Tickets() {
  const { tickets, incidents } = useStore();
  const [showNew, setShowNew] = useState(false);

  const incidentTitle = (id: string | null) => (id ? incidents.find((i) => i.id === id)?.shortId ?? "—" : "—");

  return (
    <div className="px-10 py-8 max-w-5xl">
      <SectionLabel index="001">Tickets</SectionLabel>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-mono text-2xl font-bold text-ink tracking-tight">All tickets</h1>
          <p className="text-xs text-muted mt-1">
            Every ticket here is investigated live by an LLM reasoning over its actual text — nothing is scripted.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-1.5 border-2 border-ink bg-ink text-paper px-4 py-2 text-xs font-mono uppercase tracking-wide font-bold hover:bg-accent hover:border-accent transition-colors shrink-0"
        >
          <Plus size={15} /> New ticket
        </button>
      </div>

      {tickets.length === 0 ? (
        <EmptyState title="No tickets yet" body="Create one above with a real problem description, then open it to walk the investigation forward step by step." />
      ) : (
        <div className="border-2 border-ink bg-panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-muted border-b-2 border-ink bg-paper">
                <th className="px-5 py-3 font-medium">Ticket</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Agent</th>
                <th className="px-5 py-3 font-medium">Confidence</th>
                <th className="px-5 py-3 font-medium">Incident</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/15">
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-paper transition-colors">
                  <td className="px-5 py-3.5">
                    <Link to={`/tickets/${t.id}`} className="block">
                      <p className="font-medium text-ink font-mono">
                        <span className="text-accent mr-2">{t.shortId}</span>
                        {t.subject}
                      </p>
                      <p className="text-xs text-muted mt-0.5">{t.customer}</p>
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    {t.status === "resolved" ? (
                      <span className="text-[11px] text-success font-mono font-medium">
                        Resolved by {AGENT_LABEL[t.resolvedByAgent ?? "l2_specialist"]}
                      </span>
                    ) : (
                      <AgentPill role={t.assignedAgent} />
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <ConfidenceMeter value={t.diagnosticState.confidence} />
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-muted">{incidentTitle(t.incidentId)}</td>
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