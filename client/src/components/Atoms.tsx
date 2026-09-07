import { AgentRole, TicketStatus } from "../types";

const STATUS_META: Record<TicketStatus, { label: string; className: string }> = {
  new: { label: "NEW", className: "bg-panel text-ink border-ink" },
  l1_investigating: { label: "L1_INVESTIGATING", className: "bg-panel text-ink border-ink" },
  escalated: { label: "ESCALATED", className: "bg-warning/15 text-warning border-warning" },
  l2_investigating: { label: "L2_INVESTIGATING", className: "bg-accent/10 text-accent border-accent" },
  agent_crashed: { label: "AGENT_CRASHED", className: "bg-danger/10 text-danger border-danger" },
  recovering: { label: "RECOVERING", className: "bg-warning/15 text-warning border-warning" },
  needs_human: { label: "NEEDS_HUMAN", className: "bg-danger/10 text-danger border-danger" },
  resolved: { label: "RESOLVED", className: "bg-success/10 text-success border-success" },
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex items-center border px-2 py-0.5 text-[10px] font-mono tracking-[0.1em] font-bold ${meta.className}`}>
      {meta.label}
    </span>
  );
}

export const AGENT_LABEL: Record<AgentRole, string> = {
  l1_triage: "L1 Triage",
  correlation: "Correlation",
  l2_specialist: "L2 Specialist",
  recovery: "Recovery",
  human: "Human",
};

export function AgentPill({ role }: { role: AgentRole | null }) {
  if (!role) return <span className="text-[11px] text-muted font-mono">unassigned</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium text-ink">
      <span className="h-1.5 w-1.5 bg-accent" />
      {AGENT_LABEL[role]}
    </span>
  );
}

export function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 75 ? "#3F7D4A" : pct >= 45 ? "#B8860B" : "#DC2626";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 border border-ink bg-panel overflow-hidden">
        <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="font-mono text-[11px] text-ink tabular-nums">{pct}%</span>
    </div>
  );
}

export function SectionLabel({ children, index }: { children: React.ReactNode; index?: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="text-[10px] tracking-[0.2em] uppercase text-muted whitespace-nowrap">{`// ${children}`}</span>
      <div className="flex-1 section-rule opacity-15" />
      {index && <span className="text-[10px] tracking-[0.2em] uppercase text-muted">{index}</span>}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-2 border-dashed border-ink/30 bg-panel p-8 text-center">
      <p className="font-mono text-base font-bold uppercase tracking-wide text-ink">{title}</p>
      <p className="mt-1.5 text-sm text-muted max-w-sm mx-auto">{body}</p>
    </div>
  );
}