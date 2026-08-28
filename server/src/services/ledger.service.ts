import { appendLedgerEntry, getLedgerForTicket, getFullLedger, verifyLedgerIntegrity } from "../data/store";
import { AgentRole, LedgerEventType } from "../types/domain";
import { bus } from "./bus";

export function record(input: {
  ticketId: string;
  type: LedgerEventType;
  actor: AgentRole;
  summary: string;
  detail?: Record<string, unknown>;
}) {
  const entry = appendLedgerEntry(input);
  bus.emit("ledger:entry", entry);
  return entry;
}

export const forTicket = getLedgerForTicket;
export const full = getFullLedger;
export const verify = verifyLedgerIntegrity;
