import { listOpenIncidents, getTicket, saveIncident, nextIncidentShortId } from "../data/store";
import { Ticket, Incident, Entity } from "../types/domain";
import { v4 as uuid } from "uuid";
import { bus } from "./bus";
import * as ledger from "./ledger.service";

// ---------------------------------------------------------------------------
// Similarity is computed over entity values + subject keywords (Jaccard).
// In the full spec this is where an embedding model + Qdrant vector search
// would sit; the interface below is exactly what that swap would implement —
// `similarity(ticket, incident) -> number` — so replacing this function body
// is the entire migration.
// ---------------------------------------------------------------------------

const STOPWORDS = new Set(["the", "a", "an", "at", "for", "on", "to", "is", "was", "my", "of", "in", "and"]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

function entityTokens(entities: Entity[]): Set<string> {
  return new Set(entities.map((e) => `${e.type}:${e.value}`.toLowerCase()));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  const intersection = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

const SIMILARITY_THRESHOLD = 0.15;

export function similarity(ticket: Ticket, representative: Ticket): number {
  const subjectSim = jaccard(tokenize(ticket.subject + " " + ticket.rawMessage), tokenize(representative.subject + " " + representative.rawMessage));
  const entitySim = jaccard(entityTokens(ticket.diagnosticState.entities), entityTokens(representative.diagnosticState.entities));
  // entity overlap (e.g. same discount code, same surface) is a much stronger
  // correlation signal than subject wording, so weight it higher.
  return subjectSim * 0.35 + entitySim * 0.65;
}

/**
 * Checks the ticket against every open incident's most recent ticket.
 * Returns the matched incident (joined) or a newly created one.
 */
export function correlate(ticket: Ticket, allTickets: Ticket[]): { incident: Incident; matched: boolean; score: number } {
  const openIncidents = listOpenIncidents();

  let best: { incident: Incident; score: number } | null = null;

  for (const incident of openIncidents) {
    const memberTickets = incident.ticketIds
      .map((id) => allTickets.find((t) => t.id === id))
      .filter((t): t is Ticket => Boolean(t));
    for (const member of memberTickets) {
      const score = similarity(ticket, member);
      if (!best || score > best.score) best = { incident, score };
    }
  }

  ledger.record({
    ticketId: ticket.id,
    type: "correlation_checked",
    actor: "correlation",
    summary: best
      ? `Checked against ${openIncidents.length} open incident(s); best match ${best.incident.shortId} at ${(best.score * 100).toFixed(0)}% similarity.`
      : `Checked against ${openIncidents.length} open incident(s); no candidates found.`,
    detail: { bestScore: best?.score ?? 0, threshold: SIMILARITY_THRESHOLD },
  });

  if (best && best.score >= SIMILARITY_THRESHOLD) {
    best.incident.ticketIds.push(ticket.id);
    saveIncident(best.incident);
    ledger.record({
      ticketId: ticket.id,
      type: "correlation_linked",
      actor: "correlation",
      summary: `Linked to existing incident ${best.incident.shortId} ("${best.incident.title}") at ${(best.score * 100).toFixed(0)}% similarity — duplicate investigation avoided.`,
      detail: { incidentId: best.incident.id, score: best.score },
    });
    bus.emit("incident:updated", best.incident);
    return { incident: best.incident, matched: true, score: best.score };
  }

  const incident: Incident = {
    id: uuid(),
    shortId: nextIncidentShortId(),
    title: ticket.subject,
    ticketIds: [ticket.id],
    rootCause: null,
    status: "open",
    createdAt: new Date().toISOString(),
  };
  saveIncident(incident);
  ledger.record({
    ticketId: ticket.id,
    type: "incident_created",
    actor: "correlation",
    summary: `No matching incident found — opened new root incident ${incident.shortId}.`,
  });
  bus.emit("incident:updated", incident);
  return { incident, matched: false, score: best?.score ?? 0 };
}
