import { AgentRole, TicketStatus } from "../types";

const STATUS_META: Record<TicketStatus, { label: string; className: string }> = {
  new: { label: "New", className: "bg-linen text-ink border-ink/15" },
  l1_investigating: { label: "L1 investigating", className: "bg-door-light/60 text-delft border-door-deep/30" },
  escalated: { label: "Escalated", className: "bg-amber/15 text-amber border-amber/30" },
  l2_investigating: { label: "L2 investigating", className: "bg-door/40 text-delft border-door-deep/40" },
  agent_crashed: { label: "Agent crashed", className: "bg-rust/15 text-rust border-rust/40" },
  recovering: { label: "Recovering", className: "bg-amber/15 text-amber border-amber/30" },
  needs_human: { label: "Needs human", className: "bg-peony/15 text-peony border-peony/30" },
  resolved: { label: "Resolved", className: "bg-leaf/15 text-leaf border-leaf/30" },
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.className}`}>
      {meta.label}
    </span>
  );
}

const AGENT_LABEL: Record<AgentRole, string> = {
  l1_triage: "L1 Triage",
  correlation: "Correlation",
  l2_specialist: "L2 Specialist",
  recovery: "Recovery",
  human: "Human",
};

export function AgentPill({ role }: { role: AgentRole | null }) {
  if (!role) return <span className="text-xs text-ink/40 font-mono">unassigned</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-delft">
      <span className="h-1.5 w-1.5 rounded-full bg-door-deep" />
      {AGENT_LABEL[role]}
    </span>
  );
}

export function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 75 ? "#4F7A55" : pct >= 45 ? "#C4883A" : "#B5522F";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 rounded-full bg-linen overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="font-mono text-xs text-ink/60">{pct}%</span>
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <h3 className="font-display text-sm tracking-wide text-delft uppercase">{children}</h3>
      <div className="floral-rule mt-1.5 w-full" />
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-door-deep/30 bg-linen/60 p-8 text-center">
      <p className="font-display text-lg text-delft">{title}</p>
      <p className="mt-1.5 text-sm text-ink/60 max-w-sm mx-auto">{body}</p>
    </div>
  );
}
