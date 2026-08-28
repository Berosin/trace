import { Link } from "react-router-dom";
import { GitMerge } from "lucide-react";
import { useStore } from "../hooks/StoreContext";
import { SectionLabel, EmptyState, StatusBadge } from "../components/Atoms";

export function Incidents() {
  const { incidents, tickets } = useStore();

  return (
    <div className="px-10 py-8 max-w-5xl">
      <SectionLabel>Correlation</SectionLabel>
      <h1 className="font-display text-2xl text-ink mb-2">Root incidents</h1>
      <p className="text-sm text-ink/55 mb-6 max-w-xl">
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
              <div key={incident.id} className="rounded-2xl border border-door-light bg-white shadow-panel overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 bg-linen/50 border-b border-door-light">
                  <div className="flex items-center gap-2.5">
                    <GitMerge size={17} className="text-door-deep" />
                    <div>
                      <p className="font-mono text-xs text-delft">{incident.shortId}</p>
                      <p className="font-display text-base text-ink">{incident.title}</p>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium rounded-full px-3 py-1 border ${
                      incident.status === "resolved" ? "bg-leaf/10 text-leaf border-leaf/30" : "bg-amber/10 text-amber border-amber/30"
                    }`}
                  >
                    {incident.status === "resolved" ? "Resolved" : "Open"}
                  </span>
                </div>

                {incident.rootCause && (
                  <div className="px-5 pt-4 text-sm text-leaf leading-relaxed">
                    <span className="uppercase text-[11px] tracking-wide text-ink/40 block mb-1">Confirmed root cause</span>
                    {incident.rootCause}
                  </div>
                )}

                <div className="px-5 py-4 space-y-2">
                  <span className="uppercase text-[11px] tracking-wide text-ink/40 block mb-1">
                    {members.length} linked ticket{members.length === 1 ? "" : "s"} — investigated once, not {members.length} times
                  </span>
                  {members.map((t) => (
                    <Link
                      key={t.id}
                      to={`/tickets/${t.id}`}
                      className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-linen/50 transition-colors"
                    >
                      <p className="text-sm text-ink">
                        <span className="font-mono text-delft mr-2">{t.shortId}</span>
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
