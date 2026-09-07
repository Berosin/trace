import { Link } from "react-router-dom";
import { GitMerge } from "lucide-react";
import { useStore } from "../hooks/StoreContext";
import { SectionLabel, EmptyState, StatusBadge } from "../components/Atoms";

export function Incidents() {
  const { incidents, tickets } = useStore();

  return (
    <div className="px-10 py-8 max-w-5xl">
      <SectionLabel index="002">Correlation</SectionLabel>
      <h1 className="font-mono text-2xl font-bold text-ink mb-2 tracking-tight">Root incidents</h1>
      <p className="text-sm text-muted mb-6 max-w-xl">
        When several tickets share a root cause, the correlation agent links them here instead of letting separate
        agents investigate the same problem twice.
      </p>

      {incidents.length === 0 ? (
        <EmptyState title="No incidents yet" body="Incidents are created automatically the first time a ticket escalates from L1." />
      ) : (
        <div className="space-y-5">
          {incidents.map((incident) => {
            const members = incident.ticketIds
              .map((id) => tickets.find((t) => t.id === id))
              .filter((t): t is NonNullable<typeof t> => Boolean(t));
            return (
              <div key={incident.id} className="border-2 border-ink bg-panel shadow-panel overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 bg-paper border-b-2 border-ink">
                  <div className="flex items-center gap-2.5">
                    <GitMerge size={17} className="text-accent" />
                    <div>
                      <p className="font-mono text-xs text-accent">{incident.shortId}</p>
                      <p className="font-mono text-base font-bold text-ink">{incident.title}</p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono uppercase tracking-wide font-bold px-3 py-1 border ${
                      incident.status === "resolved" ? "bg-success/10 text-success border-success" : "bg-warning/10 text-warning border-warning"
                    }`}
                  >
                    {incident.status === "resolved" ? "Resolved" : "Open"}
                  </span>
                </div>

                {incident.rootCause && (
                  <div className="px-5 pt-4 text-sm text-success leading-relaxed">
                    <span className="uppercase text-[10px] tracking-[0.15em] text-muted block mb-1">Confirmed root cause</span>
                    {incident.rootCause}
                  </div>
                )}

                <div className="px-5 py-4 space-y-2">
                  <span className="uppercase text-[10px] tracking-[0.15em] text-muted block mb-1">
                    {members.length} linked ticket{members.length === 1 ? "" : "s"} — investigated once, not {members.length} times
                  </span>
                  {members.map((t) => (
                    <Link
                      key={t.id}
                      to={`/tickets/${t.id}`}
                      className="flex items-center justify-between px-3 py-2 hover:bg-paper transition-colors border border-transparent hover:border-ink/20"
                    >
                      <p className="text-sm text-ink font-mono">
                        <span className="text-accent mr-2">{t.shortId}</span>
                        {t.subject}
                      </p>
                      <StatusBadge status={t.status} />
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}