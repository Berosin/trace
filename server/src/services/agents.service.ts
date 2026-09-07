import { v4 as uuid } from "uuid";
import { Ticket, HandoffPacket, ActionAttempted, Evidence, Hypothesis } from "../types/domain";
import { get as getTicket, list as listTickets, update } from "./ticket.service";
import * as ledger from "./ledger.service";
import { correlate } from "./correlation.service";
import { getIncident, saveIncident } from "../data/store";
import {
  runL1Triage,
  continueL2Investigation,
  runRecoveryInvestigation,
  synthesizeResolution,
  RawAction,
  RawEvidence,
} from "./reasoning.service";

// ---------------------------------------------------------------------------
// This module owns the ticket lifecycle. It calls into reasoning.service for
// actual inference and turns the results into ledger entries + diagnostic
// state updates. Nothing here decides WHAT the investigation finds — that's
// entirely up to the LLM, per-ticket, every time.
// ---------------------------------------------------------------------------

function applyActions(ticket: Ticket, actions: RawAction[], actor: "l1_triage" | "l2_specialist" | "recovery") {
  const at = new Date().toISOString();
  for (const raw of actions) {
    const action: ActionAttempted = {
      id: uuid(),
      action: raw.action,
      result: raw.result,
      ruledOut: raw.ruledOutHypothesisIndex !== null && raw.ruledOutHypothesisIndex !== undefined,
      at,
    };
    ticket.diagnosticState.actionsAttempted.push(action);

    if (raw.ruledOutHypothesisIndex !== null && raw.ruledOutHypothesisIndex !== undefined) {
      const h = ticket.diagnosticState.hypotheses[raw.ruledOutHypothesisIndex];
      if (h) {
        h.status = "ruled_out";
        ledger.record({
          ticketId: ticket.id,
          type: "l1_hypothesis_ruled_out",
          actor,
          summary: `Ruled out: "${h.text}" — ${raw.result}`,
        });
      }
    }

    if (raw.confirmsHypothesisIndex !== null && raw.confirmsHypothesisIndex !== undefined) {
      const h = ticket.diagnosticState.hypotheses[raw.confirmsHypothesisIndex];
      if (h && h.status === "active") {
        ticket.diagnosticState.currentHypothesisId = h.id;
      }
    }

    ledger.record({
      ticketId: ticket.id,
      type: actor === "l1_triage" ? "l1_action" : "l2_action",
      actor,
      summary: `${raw.action} → ${raw.result}`,
    });
  }
}

function applyEvidence(ticket: Ticket, evidence: RawEvidence[], actor: "l1_triage" | "l2_specialist" | "recovery") {
  const at = new Date().toISOString();
  for (const raw of evidence) {
    const item: Evidence = { id: uuid(), summary: raw.summary, source: raw.source, collectedBy: actor, at };
    ticket.diagnosticState.evidence.push(item);
    ledger.record({
      ticketId: ticket.id,
      type: actor === "l1_triage" ? "l1_evidence" : "l2_evidence",
      actor,
      summary: `Evidence collected: ${item.summary} (${item.source})`,
    });
  }
}

// --- L1 -----------------------------------------------------------------------

export async function runL1(ticketId: string): Promise<Ticket> {
  const t = getTicket(ticketId);
  if (!t) throw new Error("Ticket not found");

  ledger.record({
    ticketId: t.id,
    type: "l1_started",
    actor: "l1_triage",
    summary: `L1 triage started on: "${t.subject}"`,
  });

  const result = await runL1Triage(t.subject, t.rawMessage);

  return update(ticketId, (ticket) => {
    ticket.status = "l1_investigating";
    ticket.assignedAgent = "l1_triage";

    ticket.diagnosticState.entities = result.entities.map((e) => ({ type: e.type, value: e.value }));

    const hypotheses: Hypothesis[] = result.hypotheses.map((h) => ({
      id: uuid(),
      text: h.text,
      status: "active",
    }));
    ticket.diagnosticState.hypotheses = hypotheses;
    ticket.diagnosticState.currentHypothesisId = hypotheses[0]?.id ?? null;

    ledger.record({
      ticketId: ticket.id,
      type: "l1_started",
      actor: "l1_triage",
      summary: `Entities extracted: ${ticket.diagnosticState.entities.map((e) => `${e.type}=${e.value}`).join(", ") || "none"}. ${hypotheses.length} hypothesis(es) proposed.`,
    });

    applyActions(ticket, result.actions, "l1_triage");
    applyEvidence(ticket, result.evidence, "l1_triage");

    ticket.diagnosticState.confidence = result.confidence;
    ticket.diagnosticState.nextRecommendedAction = result.nextRecommendedAction;

    const stillActive = ticket.diagnosticState.hypotheses.filter((h) => h.status === "active");
    if (!ticket.diagnosticState.currentHypothesisId || !stillActive.find((h) => h.id === ticket.diagnosticState.currentHypothesisId)) {
      ticket.diagnosticState.currentHypothesisId = stillActive[0]?.id ?? null;
    }
  });
}

// --- Escalation + correlation -------------------------------------------------

export async function escalateToL2(
  ticketId: string
): Promise<{ ticket: Ticket; handoff: HandoffPacket; matched: boolean; score: number }> {
  const t = getTicket(ticketId);
  if (!t) throw new Error("Ticket not found");

  const handoff: HandoffPacket = {
    id: uuid(),
    ticketId: t.id,
    fromAgent: "l1_triage",
    toAgent: "l2_specialist",
    diagnosticState: JSON.parse(JSON.stringify(t.diagnosticState)),
    createdAt: new Date().toISOString(),
  };

  ledger.record({
    ticketId: t.id,
    type: "l1_handoff",
    actor: "l1_triage",
    summary: `Structured handoff packet created for L2 — diagnostic state transferred (${handoff.diagnosticState.evidence.length} evidence item(s), ${handoff.diagnosticState.actionsAttempted.length} action(s), confidence ${(handoff.diagnosticState.confidence * 100).toFixed(0)}%). No transcript replay required.`,
    detail: { handoffId: handoff.id },
  });

  const ticket = update(ticketId, (ticket) => {
    ticket.status = "escalated";
    ticket.assignedAgent = null;
  });

  const { incident, matched, score } = correlate(ticket, listTickets());

  const finalTicket = update(ticketId, (ticket) => {
    ticket.incidentId = incident.id;
  });

  return { ticket: finalTicket, handoff, matched, score };
}

// --- L2 -----------------------------------------------------------------------

export async function startL2(ticketId: string): Promise<Ticket> {
  const t = getTicket(ticketId);
  if (!t) throw new Error("Ticket not found");

  ledger.record({
    ticketId: t.id,
    type: "l2_started",
    actor: "l2_specialist",
    summary: `L2 specialist picked up ticket from structured handoff — resuming from confidence ${(t.diagnosticState.confidence * 100).toFixed(0)}%, no re-triage needed.`,
  });

  const result = await continueL2Investigation(t.diagnosticState);

  return update(ticketId, (ticket) => {
    ticket.status = "l2_investigating";
    ticket.assignedAgent = "l2_specialist";
    applyActions(ticket, result.actions, "l2_specialist");
    applyEvidence(ticket, result.evidence, "l2_specialist");
    ticket.diagnosticState.confidence = result.confidence;
    ticket.diagnosticState.nextRecommendedAction = result.nextRecommendedAction;
  });
}

// --- Crash / Recovery -----------------------------------------------------------

export function crashAgent(ticketId: string): Ticket {
  const t = getTicket(ticketId);
  if (!t) throw new Error("Ticket not found");

  ledger.record({
    ticketId: t.id,
    type: "agent_crashed",
    actor: "l2_specialist",
    summary: `L2 agent process crashed mid-investigation (simulated infra fault). Last persisted state: hypothesis "${
      t.diagnosticState.hypotheses.find((h) => h.id === t.diagnosticState.currentHypothesisId)?.text ?? "unresolved"
    }" at ${(t.diagnosticState.confidence * 100).toFixed(0)}% confidence, next action was "${t.diagnosticState.nextRecommendedAction}".`,
  });

  return update(ticketId, (ticket) => {
    ticket.status = "agent_crashed";
    ticket.assignedAgent = null;
  });
}

export async function recoverAgent(ticketId: string): Promise<Ticket> {
  const t = getTicket(ticketId);
  if (!t) throw new Error("Ticket not found");

  ledger.record({
    ticketId: t.id,
    type: "recovery_started",
    actor: "recovery",
    summary: `Replacement agent started for ${t.shortId} — a process that has never seen this ticket before. Reading the persisted ledger instead of asking the customer to repeat information.`,
  });

  ledger.record({
    ticketId: t.id,
    type: "recovery_state_restored",
    actor: "recovery",
    summary: `State restored from ledger: ${t.diagnosticState.actionsAttempted.length} action(s), ${t.diagnosticState.evidence.length} evidence item(s), ${
      t.diagnosticState.hypotheses.filter((h) => h.status === "ruled_out").length
    } hypothesis(es) ruled out, current confidence ${(t.diagnosticState.confidence * 100).toFixed(0)}%. Investigation resumes — not restarts.`,
  });

  const result = await runRecoveryInvestigation(t.diagnosticState);

  return update(ticketId, (ticket) => {
    ticket.status = "l2_investigating";
    ticket.assignedAgent = "recovery";
    ledger.record({
      ticketId: ticket.id,
      type: "l2_resumed",
      actor: "recovery",
      summary: `Resuming from recommended next action: "${ticket.diagnosticState.nextRecommendedAction}".`,
    });
    applyActions(ticket, result.actions, "recovery");
    applyEvidence(ticket, result.evidence, "recovery");
    ticket.diagnosticState.confidence = result.confidence;
    ticket.diagnosticState.nextRecommendedAction = result.nextRecommendedAction;
  });
}

// --- Resolution -----------------------------------------------------------------

export async function resolveTicket(ticketId: string): Promise<Ticket> {
  const t = getTicket(ticketId);
  if (!t) throw new Error("Ticket not found");

  const { rootCause } = await synthesizeResolution(t.diagnosticState);

  const currentHyp = t.diagnosticState.hypotheses.find((h) => h.id === t.diagnosticState.currentHypothesisId);
  if (currentHyp) currentHyp.status = "confirmed";

  // Remember who actually did the work before we clear assignedAgent — this
  // is what the UI shows in place of "unassigned" once a ticket is resolved.
  const resolvingAgent = t.assignedAgent ?? "l2_specialist";

  const resolved = update(ticketId, (ticket) => {
    ticket.status = "resolved";
    ticket.assignedAgent = null;
    ticket.resolvedByAgent = resolvingAgent;
    ticket.resolvedSummary = rootCause;
    ticket.diagnosticState.nextRecommendedAction = "None — resolved";
  });

  ledger.record({
    ticketId: t.id,
    type: "resolved",
    actor: resolvingAgent,
    summary: `Resolved. Root cause: ${rootCause}`,
  });

  if (resolved.incidentId) {
    const incident = getIncident(resolved.incidentId);
    if (incident) {
      incident.status = "resolved";
      incident.rootCause = rootCause;
      saveIncident(incident);

      // Propagate the resolution to sibling tickets under the same incident —
      // this is the payoff of correlation: one root-cause fix closes the group.
      for (const siblingId of incident.ticketIds) {
        if (siblingId === resolved.id) continue;
        const sibling = getTicket(siblingId);
        if (sibling && sibling.status !== "resolved") {
          update(siblingId, (s) => {
            s.status = "resolved";
            s.assignedAgent = null;
            s.resolvedByAgent = "correlation";
            s.resolvedSummary = `Resolved via shared root cause identified on ${resolved.shortId}: ${rootCause}`;
          });
          ledger.record({
            ticketId: siblingId,
            type: "resolved",
            actor: "correlation",
            summary: `Auto-resolved: shared root incident ${incident.shortId} was fixed via ${resolved.shortId}.`,
          });
        }
      }
    }
  }

  return resolved;
}