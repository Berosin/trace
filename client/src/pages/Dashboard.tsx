import { useMemo } from "react";
import { Link } from "react-router-dom";
import { GitMerge, RefreshCw, Waypoints } from "lucide-react";
import { BrandMark } from "../components/BrandMark";
import { useStore } from "../hooks/StoreContext";
import { StatusBadge } from "../components/Atoms";

const VALUE_PROPS = [
  {
    icon: Waypoints,
    title: "Conversation history tells you what happened. TRACE tells you why.",
    body: "Every handoff carries structured diagnostic state — entities, evidence, ruled-out hypotheses, confidence, next action — not a transcript to re-read.",
  },
  {
    icon: GitMerge,
    title: "When tickets overlap, TRACE turns duplicate investigations into one shared incident.",
    body: "A correlation agent checks new tickets against open incidents before anyone starts investigating the same root cause twice.",
  },
  {
    icon: RefreshCw,
    title: "When an agent fails, TRACE preserves the investigation and lets another agent continue.",
    body: "A hash-chained ledger means a replacement agent can resume from the last known checkpoint — the customer never repeats themselves.",
  },
];

export function Dashboard() {
  const { tickets, incidents, ledger } = useStore();

  const stats = useMemo(() => {
    const open = tickets.filter((t) => t.status !== "resolved").length;
    const resolved = tickets.filter((t) => t.status === "resolved").length;
    const openIncidents = incidents.filter((i) => i.status === "open").length;
    return { open, resolved, openIncidents, ledgerEntries: ledger.length };
  }, [tickets, incidents, ledger]);

  const recent = tickets.slice(0, 5);

  return (
    <div>
      <header className="relative overflow-hidden border-b-2 border-ink dot-grid-bg px-10 py-12">
        <div className="relative z-10 max-w-3xl">
          <span className="text-[10px] tracking-[0.2em] uppercase text-muted">// ticket_reasoning_engine.boot</span>
          <div className="mt-4 mb-6">
            <BrandMark />
          </div>
          <h1 className="font-mono text-4xl font-bold leading-[1.15] text-ink tracking-tight">
            Don't just pass the ticket.
            <br />
            <span className="text-accent">Pass the reasoning.</span>
          </h1>
          <p className="mt-4 text-muted max-w-md leading-relaxed text-sm">
            When the agent stops, the investigation doesn't. TRACE preserves diagnostic state — not just
            conversation history — across every handoff, correlation, and crash.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              to="/tickets"
              className="border-2 border-ink bg-ink text-paper px-5 py-2.5 text-xs font-mono uppercase tracking-wide font-bold hover:bg-accent hover:border-accent transition-colors"
            >
              File a ticket &amp; investigate it
            </Link>
            <Link
              to="/ledger"
              className="border-2 border-ink text-ink px-5 py-2.5 text-xs font-mono uppercase tracking-wide font-bold hover:bg-panel transition-colors"
            >
              View provenance ledger
            </Link>
          </div>
        </div>
      </header>

      <div className="px-10 py-8 space-y-10 max-w-5xl">
        <section>
          <div className="grid grid-cols-1 md:grid-cols-4 border-2 border-ink">
            <StatCard label="Open tickets" value={stats.open} />
            <StatCard label="Resolved" value={stats.resolved} border />
            <StatCard label="Open incidents" value={stats.openIncidents} border />
            <StatCard label="Ledger entries" value={stats.ledgerEntries} border />
          </div>
        </section>

        <section>
          <div className="grid md:grid-cols-3 border-2 border-ink">
            {VALUE_PROPS.map(({ icon: Icon, title, body }, i) => (
              <div
                key={title}
                className={`p-5 bg-panel ${i > 0 ? "border-t-2 md:border-t-0 md:border-l-2 border-ink" : ""}`}
              >
                <Icon size={20} className="text-accent mb-3" strokeWidth={1.75} />
                <p className="font-mono text-sm font-bold text-ink leading-snug">{title}</p>
                <p className="mt-2 text-xs text-muted leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted">// recent_tickets</span>
            <Link to="/tickets" className="text-xs text-accent hover:underline font-mono uppercase tracking-wide">
              View all →
            </Link>
          </div>
          <div className="border-2 border-ink bg-panel divide-y-2 divide-ink">
            {recent.length === 0 && (
              <p className="p-6 text-sm text-muted font-mono">
                No tickets yet —{" "}
                <Link to="/tickets" className="text-accent hover:underline">
                  file the first one
                </Link>
                .
              </p>
            )}
            {recent.map((t) => (
              <Link key={t.id} to={`/tickets/${t.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-paper transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate font-mono">
                    <span className="text-accent mr-2">{t.shortId}</span>
                    {t.subject}
                  </p>
                  <p className="text-xs text-muted mt-0.5">{t.customer}</p>
                </div>
                <StatusBadge status={t.status} />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, border }: { label: string; value: number; border?: boolean }) {
  return (
    <div className={`p-4 bg-panel ${border ? "border-t-2 md:border-t-0 md:border-l-2 border-ink" : ""}`}>
      <p className="text-3xl font-mono font-bold text-ink tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.15em] text-muted mt-1">{label}</p>
    </div>
  );
}