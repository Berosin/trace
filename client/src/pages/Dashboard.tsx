import { useMemo } from "react";
import { Link } from "react-router-dom";
import { GitMerge, RefreshCw, Waypoints } from "lucide-react";
import { DutchDoor } from "../components/DutchDoor";
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
      <header className="relative overflow-hidden border-b border-door-light bg-gradient-to-b from-sky/40 to-porcelain px-10 py-10">
        <div className="relative z-10 flex items-center gap-10 max-w-5xl">
          <DutchDoor className="h-56 w-auto shrink-0 hidden md:block" />
          <div>
            <p className="font-display italic text-delft/70 text-sm mb-2">Ticket Reasoning &amp; Agent Continuity Engine</p>
            <h1 className="font-display text-4xl leading-tight text-ink max-w-lg">
              Don't just pass the ticket.
              <br />
              <span className="text-delft">Pass the reasoning.</span>
            </h1>
            <p className="mt-4 text-ink/65 max-w-md leading-relaxed">
              When the agent stops, the investigation doesn't. TRACE preserves diagnostic state — not just
              conversation history — across every handoff, correlation, and crash.
            </p>
            <div className="mt-6 flex gap-3">
              <Link to="/tickets" className="rounded-full bg-delft text-porcelain px-5 py-2.5 text-sm font-medium hover:bg-ink transition-colors">
                File a ticket &amp; investigate it
              </Link>
              <Link to="/ledger" className="rounded-full border border-door-deep/40 text-delft px-5 py-2.5 text-sm font-medium hover:bg-door-light/40 transition-colors">
                View provenance ledger
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="px-10 py-8 space-y-10 max-w-5xl">
        <section>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Open tickets" value={stats.open} />
            <StatCard label="Resolved" value={stats.resolved} />
            <StatCard label="Open incidents" value={stats.openIncidents} />
            <StatCard label="Ledger entries" value={stats.ledgerEntries} mono />
          </div>
        </section>

        <section>
          <div className="grid md:grid-cols-3 gap-5">
            {VALUE_PROPS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-door-light bg-white p-5 shadow-panel">
                <Icon size={20} className="text-door-deep mb-3" strokeWidth={1.75} />
                <p className="font-display text-base text-ink leading-snug">{title}</p>
                <p className="mt-2 text-sm text-ink/60 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl text-ink">Recent tickets</h2>
            <Link to="/tickets" className="text-sm text-delft hover:underline">
              View all
            </Link>
          </div>
          <div className="rounded-2xl border border-door-light bg-white shadow-panel divide-y divide-door-light/70">
            {recent.length === 0 && (
              <p className="p-6 text-sm text-ink/50">
                No tickets yet —{" "}
                <Link to="/tickets" className="text-delft hover:underline">
                  file the first one
                </Link>
                .
              </p>
            )}
            {recent.map((t) => (
              <Link key={t.id} to={`/tickets/${t.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-linen/50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">
                    <span className="font-mono text-delft mr-2">{t.shortId}</span>
                    {t.subject}
                  </p>
                  <p className="text-xs text-ink/45 mt-0.5">{t.customer}</p>
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

function StatCard({ label, value, mono }: { label: string; value: number; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-door-light bg-white p-4 shadow-panel">
      <p className={`text-2xl text-ink ${mono ? "font-mono" : "font-display"}`}>{value}</p>
      <p className="text-xs text-ink/55 mt-1">{label}</p>
    </div>
  );
}
