import crypto from "crypto";
import { v4 as uuid } from "uuid";
import { supabase } from "./supabaseClient";
import {
  Ticket,
  Incident,
  LedgerEntry,
  LedgerEventType,
  AgentRole,
  DiagnosticState,
} from "../types/domain";

// ---------------------------------------------------------------------------
// This module is the swappable persistence boundary — the rest of the app
// only ever talks to the functions exported here, so this file is the only
// place that knows it's Supabase/Postgres underneath. Everything is async
// now (real network I/O), which is the one behavioral difference from the
// in-memory version this replaced: every caller needs to `await` these.
// ---------------------------------------------------------------------------

async function increment(counterName: string): Promise<number> {
  const { data, error } = await supabase.rpc("increment_counter", { counter_name: counterName });
  if (error) throw new Error(`Counter increment failed (${counterName}): ${error.message}`);
  return data as number;
}

export async function nextTicketShortId(): Promise<string> {
  const n = await increment("ticket");
  return `TICK-${n}`;
}

export async function nextIncidentShortId(): Promise<string> {
  const n = await increment("incident");
  return `INC-${String(n).padStart(3, "0")}`;
}

// --- row <-> domain mapping --------------------------------------------------

function rowToTicket(row: any): Ticket {
  return {
    id: row.id,
    shortId: row.short_id,
    subject: row.subject,
    customer: row.customer,
    channel: row.channel,
    rawMessage: row.raw_message,
    status: row.status,
    incidentId: row.incident_id,
    diagnosticState: row.diagnostic_state as DiagnosticState,
    assignedAgent: row.assigned_agent,
    resolvedByAgent: row.resolved_by_agent ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedSummary: row.resolved_summary ?? undefined,
  };
}

function ticketToRow(t: Ticket) {
  return {
    id: t.id,
    short_id: t.shortId,
    subject: t.subject,
    customer: t.customer,
    channel: t.channel,
    raw_message: t.rawMessage,
    status: t.status,
    incident_id: t.incidentId,
    diagnostic_state: t.diagnosticState,
    assigned_agent: t.assignedAgent,
    resolved_by_agent: t.resolvedByAgent,
    resolved_summary: t.resolvedSummary ?? null,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

function rowToIncident(row: any): Incident {
  return {
    id: row.id,
    shortId: row.short_id,
    title: row.title,
    ticketIds: row.ticket_ids as string[],
    rootCause: row.root_cause,
    status: row.status,
    createdAt: row.created_at,
  };
}

function incidentToRow(i: Incident) {
  return {
    id: i.id,
    short_id: i.shortId,
    title: i.title,
    ticket_ids: i.ticketIds,
    root_cause: i.rootCause,
    status: i.status,
    created_at: i.createdAt,
  };
}

function rowToLedgerEntry(row: any): LedgerEntry {
  return {
    seq: row.seq,
    id: row.id,
    ticketId: row.ticket_id,
    type: row.type,
    actor: row.actor,
    summary: row.summary,
    detail: row.detail ?? undefined,
    at: row.at,
    prevHash: row.prev_hash,
    hash: row.hash,
  };
}

function ledgerEntryToRow(e: LedgerEntry) {
  return {
    seq: e.seq,
    id: e.id,
    ticket_id: e.ticketId,
    type: e.type,
    actor: e.actor,
    summary: e.summary,
    detail: e.detail ?? null,
    at: e.at,
    prev_hash: e.prevHash,
    hash: e.hash,
  };
}

// --- Ledger --------------------------------------------------------------

function hashEntry(prevHash: string, payload: object): string {
  return crypto.createHash("sha256").update(prevHash + JSON.stringify(payload)).digest("hex");
}

/**
 * Appends a new ledger entry, hash-chained to the previous one.
 *
 * Known limitation: the seq number is allocated atomically (via the
 * increment_counter RPC), but reading the previous row's hash and inserting
 * this row are two separate round trips. Under concurrent writers this has a
 * small race window (seq N's insert could theoretically read seq N-1 before
 * it's committed). For this app's usage pattern — one operator driving one
 * ticket's agent actions at a time — that's an acceptable tradeoff. Making
 * this fully concurrency-safe would mean moving the hash computation into a
 * Postgres function so allocate+insert happen in one transaction.
 */
export async function appendLedgerEntry(input: {
  ticketId: string;
  type: LedgerEventType;
  actor: AgentRole;
  summary: string;
  detail?: Record<string, unknown>;
}): Promise<LedgerEntry> {
  const seq = await increment("ledger_seq");

  let prevHash = "GENESIS";
  if (seq > 1) {
    const { data, error } = await supabase.from("ledger_entries").select("hash").eq("seq", seq - 1).single();
    if (error) throw new Error(`Failed to read previous ledger hash: ${error.message}`);
    prevHash = data.hash;
  }

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

  const { error: insertError } = await supabase.from("ledger_entries").insert(ledgerEntryToRow(entry));
  if (insertError) throw new Error(`Failed to write ledger entry: ${insertError.message}`);

  return entry;
}

export async function getLedgerForTicket(ticketId: string): Promise<LedgerEntry[]> {
  const { data, error } = await supabase
    .from("ledger_entries")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("seq", { ascending: true });
  if (error) throw new Error(`Failed to read ledger: ${error.message}`);
  return (data ?? []).map(rowToLedgerEntry);
}

export async function getFullLedger(): Promise<LedgerEntry[]> {
  const { data, error } = await supabase.from("ledger_entries").select("*").order("seq", { ascending: true });
  if (error) throw new Error(`Failed to read ledger: ${error.message}`);
  return (data ?? []).map(rowToLedgerEntry);
}

/** Verifies the hash chain is unbroken end to end (tamper evidence). */
export async function verifyLedgerIntegrity(): Promise<{ valid: boolean; brokenAt: number | null }> {
  const entries = await getFullLedger();
  let prevHash = "GENESIS";
  for (const entry of entries) {
    const { seq, ticketId, type, actor, summary, detail, at } = entry;
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

export async function saveTicket(ticket: Ticket): Promise<Ticket> {
  const { error } = await supabase.from("tickets").upsert(ticketToRow(ticket));
  if (error) throw new Error(`Failed to save ticket ${ticket.shortId}: ${error.message}`);
  return ticket;
}

export async function getTicket(id: string): Promise<Ticket | undefined> {
  const { data, error } = await supabase.from("tickets").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to read ticket: ${error.message}`);
  return data ? rowToTicket(data) : undefined;
}

export async function listTickets(): Promise<Ticket[]> {
  const { data, error } = await supabase.from("tickets").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to list tickets: ${error.message}`);
  return (data ?? []).map(rowToTicket);
}

// --- Incidents ---------------------------------------------------------------

export async function saveIncident(incident: Incident): Promise<Incident> {
  const { error } = await supabase.from("incidents").upsert(incidentToRow(incident));
  if (error) throw new Error(`Failed to save incident ${incident.shortId}: ${error.message}`);
  return incident;
}

export async function getIncident(id: string): Promise<Incident | undefined> {
  const { data, error } = await supabase.from("incidents").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to read incident: ${error.message}`);
  return data ? rowToIncident(data) : undefined;
}

export async function listIncidents(): Promise<Incident[]> {
  const { data, error } = await supabase.from("incidents").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to list incidents: ${error.message}`);
  return (data ?? []).map(rowToIncident);
}

export async function listOpenIncidents(): Promise<Incident[]> {
  const { data, error } = await supabase
    .from("incidents")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to list open incidents: ${error.message}`);
  return (data ?? []).map(rowToIncident);
}