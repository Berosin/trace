import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  CircleDot,
  CircleCheck,
  CircleX,
  Zap,
  Skull,
  RotateCw,
  CheckCircle2,
  ArrowRightCircle,
} from "lucide-react";
import { useStore } from "../hooks/StoreContext";
import { api } from "../services/api";
import { StatusBadge, AgentPill, ConfidenceMeter, SectionLabel } from "../components/Atoms";
import { DutchDoor } from "../components/DutchDoor";
import { LedgerEntry } from "../types";

const ACTOR_LABEL: Record<string, string> = {
  l1_triage: "L1",
  correlation: "Correlation",
  l2_specialist: "L2",
  recovery: "Recovery",
  human: "Human",
};

export function TicketDetails() {
  const { id } = useParams<{ id: string }>();
  const { tickets, incidents } = useStore();
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ticket = tickets.find((t) => t.id === id);
  const incident = ticket?.incidentId ? incidents.find((i) => i.id === ticket.incidentId) : undefined;

  useEffect(() => {
    if (!id) return;
    api
      .ticketLedger(id)
      .then(setLedger)
      .catch(() => void 0);
  }, [id, ticket?.updatedAt]);

  if (!ticket) {
    return (
      <div className="px-10 py-8">
        <Link to="/tickets" className="text-sm text-delft inline-flex items-center gap-1.5 mb-4">
          <ArrowLeft size={14} /> Back to tickets
        </Link>
        <p className="text-ink/60">Ticket not found (or still loading).</p>
      </div>
    );
  }

  async function run(label: string, action: () => Promise<unknown>) {
    setBusy(true);
    setBusyLabel(label);
    setError(null);
    try {
      await action();
    } catch (e: any) {
      setError(e.message ?? "Action failed");
    } finally {
      setBusy(false);
      setBusyLabel(null);
    }
  }

  const ds = ticket.diagnosticState;

  return (
    <div className="px-10 py-8 max-w-5xl">
      <Link to="/tickets" className="text-sm text-delft inline-flex items-center gap-1.5 mb-4 hover:underline">
        <ArrowLeft size={14} /> Back to tickets
      </Link>

      <div className="flex items-start justify-between gap-6 mb-6">
        <div>
          <p className="font-mono text-xs text-delft">{ticket.shortId}</p>
          <h1 className="font-display text-2xl text-ink mt-0.5">{ticket.subject}</h1>
          <p className="text-sm text-ink/50 mt-1">
            {ticket.customer} · via {ticket.channel.replace("_", " ")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <StatusBadge status={ticket.status} />
          <AgentPill role={ticket.assignedAgent} />
        </div>
      </div>

      {ticket.status === "agent_crashed" && (
        <div className="mb-6 rounded-xl border border-rust/30 bg-rust/5 px-4 py-3 flex items-center gap-3">
          <Skull size={18} className="text-rust shrink-0" />
          <p className="text-sm text-rust">
            The L2 agent crashed mid-investigation. Diagnostic state below is intact in the ledger — start a
            replacement agent to resume, not restart.
          </p>
        </div>
      )}

      {incident && (
        <div className="mb-6 rounded-xl border border-door-light bg-door-light/20 px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-delft">
            Part of root incident <span className="font-mono">{incident.shortId}</span> — "{incident.title}" (
            {incident.ticketIds.length} linked ticket{incident.ticketIds.length === 1 ? "" : "s"})
          </p>
          <Link to="/incidents" className="text-xs text-delft hover:underline shrink-0">
            View incident
          </Link>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Diagnostic state */}
        <div className="rounded-2xl border border-door-light bg-white shadow-panel p-5">
          <SectionLabel>Diagnostic state</SectionLabel>

          <Field label="Original message">
            <p className="text-sm text-ink/75 italic leading-relaxed">"{ticket.rawMessage}"</p>
          </Field>

          <Field label="Entities">
            {ds.entities.length === 0 ? (
              <Placeholder />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {ds.entities.map((e, i) => (
                  <span key={i} className="font-mono text-xs bg-linen border border-door-light rounded-full px-2.5 py-1 text-ink/70">
                    {e.type}: <span className="text-delft">{e.value}</span>
                  </span>
                ))}
              </div>
            )}
          </Field>

          <Field label="Hypotheses">
            {ds.hypotheses.length === 0 ? (
              <Placeholder />
            ) : (
              <ul className="space-y-1.5">
                {ds.hypotheses.map((h) => (
                  <li key={h.id} className="flex items-start gap-2 text-sm">
                    {h.status === "ruled_out" ? (
                      <CircleX size={15} className="text-rust/70 mt-0.5 shrink-0" />
                    ) : h.status === "confirmed" ? (
                      <CircleCheck size={15} className="text-leaf mt-0.5 shrink-0" />
                    ) : (
                      <CircleDot size={15} className="text-amber mt-0.5 shrink-0" />
                    )}
                    <span
                      className={
                        h.status === "ruled_out" ? "text-ink/40 line-through" : h.status === "confirmed" ? "text-leaf font-medium" : "text-ink/80"
                      }
                    >
                      {h.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Field>

          <Field label="Evidence">
            {ds.evidence.length === 0 ? (
              <Placeholder />
            ) : (
              <ul className="space-y-2">
                {ds.evidence.map((e) => (
                  <li key={e.id} className="text-sm border-l-2 border-door-deep/40 pl-2.5">
                    <p className="text-ink/80">{e.summary}</p>
                    <p className="text-xs text-ink/40 font-mono mt-0.5">
                      {e.source} · {ACTOR_LABEL[e.collectedBy]}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Field>

          <Field label="Actions attempted">
            {ds.actionsAttempted.length === 0 ? (
              <Placeholder />
            ) : (
              <ul className="space-y-2">
                {ds.actionsAttempted.map((a) => (
                  <li key={a.id} className="text-sm">
                    <p className="text-ink/80 font-medium">{a.action}</p>
                    <p className="text-ink/55">{a.result}</p>
                  </li>
                ))}
              </ul>
            )}
          </Field>

          <Field label="Confidence">
            <ConfidenceMeter value={ds.confidence} />
          </Field>

          <Field label="Next recommended action">
            <p className="text-sm text-delft flex items-center gap-1.5">
              <ArrowRightCircle size={15} /> {ds.nextRecommendedAction}
            </p>
          </Field>

          {ticket.resolvedSummary && (
            <Field label="Resolution / root cause">
              <p className="text-sm text-leaf leading-relaxed">{ticket.resolvedSummary}</p>
            </Field>
          )}
        </div>

        {/* Ledger timeline + actions */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-door-light bg-white shadow-panel p-5">
            <SectionLabel>Agent controls</SectionLabel>
            <p className="text-xs text-ink/45 mb-3 leading-relaxed">
              Each button below triggers one real inference call — the agent reasons over this ticket's actual
              diagnostic state and returns a genuine result. Nothing here is pre-scripted, so responses take a
              couple of seconds and will differ every time you run it.
            </p>
            {error && <p className="text-xs text-rust mb-2">{error}</p>}
            {busy && (
              <p className="text-xs text-delft mb-2 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-door-deep animate-pulse" />
                {busyLabel} is thinking…
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <ActionButton disabled={busy || ticket.status !== "new"} onClick={() => run("L1 triage agent", () => api.runL1(ticket.id))}>
                Run L1 triage
              </ActionButton>
              <ActionButton
                disabled={busy || ticket.status !== "l1_investigating"}
                onClick={() => run("Correlation agent", () => api.escalate(ticket.id))}
              >
                Escalate to L2
              </ActionButton>
              <ActionButton
                disabled={busy || ticket.status !== "escalated"}
                onClick={() => run("L2 specialist agent", () => api.startL2(ticket.id))}
              >
                Start L2 investigation
              </ActionButton>
              <ActionButton
                disabled={busy || ticket.status !== "l2_investigating"}
                variant="danger"
                onClick={() => run("Crash simulation", () => api.crash(ticket.id))}
              >
                <Zap size={13} /> Crash L2 agent
              </ActionButton>
              <ActionButton
                disabled={busy || ticket.status !== "agent_crashed"}
                onClick={() => run("Recovery agent", () => api.recover(ticket.id))}
              >
                <RotateCw size={13} /> Start recovery agent
              </ActionButton>
              <ActionButton
                disabled={busy || !["l2_investigating", "l1_investigating"].includes(ticket.status)}
                variant="success"
                onClick={() => run("Resolution synthesis", () => api.resolve(ticket.id))}
              >
                <CheckCircle2 size={13} /> Resolve
              </ActionButton>
            </div>
          </div>

          <div className="rounded-2xl border border-door-light bg-white shadow-panel p-5">
            <SectionLabel>Provenance ledger</SectionLabel>
            <ol className="space-y-3 max-h-[520px] overflow-y-auto pr-1 scrollbar-thin">
              {ledger.map((entry) => (
                <li key={entry.id} className="text-xs border-l-2 border-door-light pl-3 relative">
                  <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-door-deep" />
                  <p className="font-mono text-[10px] text-ink/35">
                    #{entry.seq} · {new Date(entry.at).toLocaleTimeString()} · {ACTOR_LABEL[entry.actor] ?? entry.actor}
                  </p>
                  <p className="text-ink/75 mt-0.5 leading-snug">{entry.summary}</p>
                </li>
              ))}
              {ledger.length === 0 && <p className="text-xs text-ink/40">No ledger entries yet.</p>}
            </ol>
          </div>
        </div>
      </div>

      <div className="mt-10 flex justify-center opacity-30">
        <DutchDoor compact className="h-10 w-10" />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="text-[11px] uppercase tracking-wide text-ink/40 mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function Placeholder() {
  return <p className="text-sm text-ink/35 italic">Not yet determined</p>;
}

function ActionButton({
  children,
  onClick,
  disabled,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "danger" | "success";
}) {
  const base = "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed";
  const variantClass =
    variant === "danger"
      ? "bg-rust/10 text-rust hover:bg-rust/20"
      : variant === "success"
      ? "bg-leaf/10 text-leaf hover:bg-leaf/20"
      : "bg-door-light/50 text-delft hover:bg-door-light";
  return (
    <button className={`${base} ${variantClass}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
