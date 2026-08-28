import crypto from "crypto";
import { v4 as uuid } from "uuid";
import {
  Ticket,
  Incident,
  LedgerEntry,
  LedgerEventType,
  AgentRole,
} from "../types/domain";

// ---------------------------------------------------------------------------
// This module is the swappable persistence boundary. In production this is
// where a MongoDB (Mongoose) implementation would live instead. The rest of
// the app only talks to the functions exported here, so swapping the backing
// store is a one-file change.
// ---------------------------------------------------------------------------

const tickets = new Map<string, Ticket>();
const incidents = new Map<string, Incident>();
const ledger: LedgerEntry[] = [];

let ticketCounter = 100;
let incidentCounter = 0;

export function nextTicketShortId(): string {
  ticketCounter += 1;
  return `TICK-${ticketCounter}`;
}

export function nextIncidentShortId(): string {
  incidentCounter += 1;
  return `INC-${String(incidentCounter).padStart(3, "0")}`;
}

// --- Ledger --------------------------------------------------------------

function hashEntry(prevHash: string, payload: object): string {
  return crypto.createHash("sha256").update(prevHash + JSON.stringify(payload)).digest("hex");
}

export function appendLedgerEntry(input: {
  ticketId: string;
  type: LedgerEventType;
  actor: AgentRole;
  summary: string;
  detail?: Record<string, unknown>;
}): LedgerEntry {
  const prevHash = ledger.length > 0 ? ledger[ledger.length - 1].hash : "GENESIS";
  const seq = ledger.length + 1;
  const at = new Date().toISOString();
  const payload = { ...input, seq, at };
  const hash = hashEntry(prevHash, payload);

  const entry: LedgerEntry = {
    seq,
    id: uuid(),
    ticketId: input.ticketId,
    type: input.type,
    actor: input.actor,
    summary: input.summary,
    detail: input.detail,
    at,
    prevHash,
    hash,
  };
  ledger.push(entry);
  return entry;
}

export function getLedgerForTicket(ticketId: string): LedgerEntry[] {
  return ledger.filter((e) => e.ticketId === ticketId);
}

export function getFullLedger(): LedgerEntry[] {
  return [...ledger];
}

/** Verifies the hash chain is unbroken end to end (tamper evidence). */
export function verifyLedgerIntegrity(): { valid: boolean; brokenAt: number | null } {
  let prevHash = "GENESIS";
  for (const entry of ledger) {
    const { seq, id, ticketId, type, actor, summary, detail, at } = entry;
    const payload = { ticketId, type, actor, summary, detail, seq, at };
    const expected = hashEntry(prevHash, payload);
    if (expected !== entry.hash) {
      return { valid: false, brokenAt: entry.seq };
    }
    prevHash = entry.hash;
  }
  return { valid: true, brokenAt: null };
}

// --- Tickets ---------------------------------------------------------------

export function saveTicket(ticket: Ticket): Ticket {
  tickets.set(ticket.id, ticket);
  return ticket;
}

export function getTicket(id: string): Ticket | undefined {
  return tickets.get(id);
}

export function listTickets(): Ticket[] {
  return [...tickets.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// --- Incidents ---------------------------------------------------------------

export function saveIncident(incident: Incident): Incident {
  incidents.set(incident.id, incident);
  return incident;
}

export function getIncident(id: string): Incident | undefined {
  return incidents.get(id);
}

export function listIncidents(): Incident[] {
  return [...incidents.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function listOpenIncidents(): Incident[] {
  return listIncidents().filter((i) => i.status === "open");
}

// --- Reset (used by demo "reset scenario") ---------------------------------

export function resetAll(): void {
  tickets.clear();
  incidents.clear();
  ledger.length = 0;
  ticketCounter = 100;
  incidentCounter = 0;
}
