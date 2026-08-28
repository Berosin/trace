import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { useStore } from "../hooks/StoreContext";
import { SectionLabel, EmptyState } from "../components/Atoms";
import { api } from "../services/api";

const ACTOR_LABEL: Record<string, string> = {
  l1_triage: "L1",
  correlation: "Correlation",
  l2_specialist: "L2",
  recovery: "Recovery",
  human: "Human",
};

export function Ledger() {
  const { ledger, tickets } = useStore();
  const [integrity, setIntegrity] = useState<{ valid: boolean; brokenAt: number | null } | null>(null);

  useEffect(() => {
    api.verifyLedger().then(setIntegrity).catch(() => void 0);
  }, [ledger.length]);

  const shortIdFor = (ticketId: string) => tickets.find((t) => t.id === ticketId)?.shortId ?? ticketId.slice(0, 8);

  return (
    <div className="px-10 py-8 max-w-4xl">
      <SectionLabel>Provenance</SectionLabel>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-ink">Global ledger</h1>
        {integrity && (
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1.5 border ${
              integrity.valid ? "bg-leaf/10 text-leaf border-leaf/30" : "bg-rust/10 text-rust border-rust/30"
            }`}
          >
            {integrity.valid ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
            {integrity.valid ? "Hash chain intact" : `Chain broken at #${integrity.brokenAt}`}
          </span>
        )}
      </div>

      {ledger.length === 0 ? (
        <EmptyState title="Ledger is empty" body="Every ticket, agent action, evidence item, and decision will append here, hash-chained to the previous entry." />
      ) : (
        <div className="rounded-2xl border border-door-light bg-white shadow-panel">
          <ol className="divide-y divide-door-light/70 max-h-[70vh] overflow-y-auto scrollbar-thin">
            {[...ledger].reverse().map((entry) => (
              <li key={entry.id} className="px-5 py-3.5">
                <div className="flex items-center gap-2 text-[11px] font-mono text-ink/40 mb-1">
                  <span>#{entry.seq}</span>
                  <span>·</span>
                  <span>{new Date(entry.at).toLocaleString()}</span>
                  <span>·</span>
                  <span className="text-delft">{shortIdFor(entry.ticketId)}</span>
                  <span>·</span>
                  <span>{ACTOR_LABEL[entry.actor] ?? entry.actor}</span>
                </div>
                <p className="text-sm text-ink/80 leading-snug">{entry.summary}</p>
                <p className="text-[10px] font-mono text-ink/25 mt-1 truncate">hash {entry.hash.slice(0, 24)}…</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
