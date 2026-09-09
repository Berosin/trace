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
//
// Every ledger.record() call below is awaited one at a time (never fired
// concurrently) because the ledger is hash-chained: each entry's hash
// depends on reading the previous entry, so writes must happen strictly in
// order or the chain can corrupt under interleaving.
// ---------------------------------------------------------------------------

async function applyActions(ticket: Ticket, actions: RawAction[], actor: "l1_triage" | "l2_specialist" | "recovery") {
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
        await ledger.record({
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

    await ledger.record({
      ticketId: ticket.id,
      type: actor === "l1_triage" ? "l1_action" : "l2_action",
      actor,
      summary: `${raw.action} → ${raw.result}`,
    });
  }
}

async function applyEvidence(ticket: Ticket, evidence: RawEvidence[], actor: "l1_triage" | "l2_specialist" | "recovery") {
  const at = new Date().toISOString();
  for (const raw of evidence) {
    const item: Evidence = { id: uuid(), summary: raw.summary, source: raw.source, collectedBy: actor, at };
    ticket.diagnosticState.evidence.push(item);
    await ledger.record({
      ticketId: ticket.id,
      type: actor === "l1_triage" ? "l1_evidence" : "l2_evidence",
      actor,
      summary: `Evidence collected: ${item.summary} (${item.source})`,
    });
  }
}

// --- L1 -----------------------------------------------------------------------

export async function runL1(ticketId: string): Promise<Ticket> {
  const t = await getTicket(ticketId);
  if (!t) throw new Error("Ticket not found");

  await ledger.record({
    ticketId: t.id,
    type: "l1_started",
    actor: "l1_triage",
    summary: `L1 triage started on: "${t.subject}"`,
  });

  const result = await runL1Triage(t.subject, t.rawMessage);

  const entities = result.entities.map((e) => ({ type: e.type, value: e.value }));
  const hypotheses: Hypothesis[] = result.hypotheses.map((h) => ({
    id: uuid(),
    text: h.text,
    status: "active" as const,
  }));

  await ledger.record({
    ticketId: t.id,
    type: "l1_started",
    actor: "l1_triage",
    summary: `Entities extracted: ${entities.map((e) => `${e.type}=${e.value}`).join(", ") || "none"}. ${hypotheses.length} hypothesis(es) proposed.`,
  });

  // Apply actions/evidence against a scratch copy sharing the same array
  // references as `hypotheses`/`entities` above, then persist once via update().
  const scratch: Ticket = { ...t, diagnosticState: { ...t.diagnosticState, entities, hypotheses } };
  scratch.diagnosticState.currentHypothesisId = hypotheses[0]?.id ?? null;
  await applyActions(scratch, result.actions, "l1_triage");
  await applyEvidence(scratch, result.evidence, "l1_triage");
  scratch.diagnosticState.confidence = result.confidence;
  scratch.diagnosticState.nextRecommendedAction = result.nextRecommendedAction;

  const stillActive = scratch.diagnosticState.hypotheses.filter((h) => h.status === "active");
  if (!scratch.diagnosticState.currentHypothesisId || !stillActive.find((h) => h.id === scratch.diagnosticState.currentHypothesisId)) {
    scratch.diagnosticState.currentHypothesisId = stillActive[0]?.id ?? null;
  }

  return update(ticketId, (ticket) => {
    ticket.status = "l1_investigating";
    ticket.assignedAgent = "l1_triage";
    ticket.diagnosticState = scratch.diagnosticState;
  });
}

// --- Escalation + correlation -------------------------------------------------

export async function escalateToL2(
  ticketId: string
): Promise<{ ticket: Ticket; handoff: HandoffPacket; matched: boolean; score: number }> {
  const t = await getTicket(ticketId);
  if (!t) throw new Error("Ticket not found");

  const handoff: HandoffPacket = {
    id: uuid(),
    ticketId: t.id,
    fromAgent: "l1_triage",
    toAgent: "l2_specialist",
    diagnosticState: JSON.parse(JSON.stringify(t.diagnosticState)),
    createdAt: new Date().toISOString(),
  };

  await ledger.record({
    ticketId: t.id,
    type: "l1_handoff",
    actor: "l1_triage",
    summary: `Structured handoff packet created for L2 — diagnostic state transferred (${handoff.diagnosticState.evidence.length} evidence item(s), ${handoff.diagnosticState.actionsAttempted.length} action(s), confidence ${(handoff.diagnosticState.confidence * 100).toFixed(0)}%). No transcript replay required.`,
    detail: { handoffId: handoff.id },
  });

  const ticket = await update(ticketId, (ticket) => {
    ticket.status = "escalated";
    ticket.assignedAgent = null;
  });

  const allTickets = await listTickets();
  const { incident, matched, score } = await correlate(ticket, allTickets);

  const finalTicket = await update(ticketId, (ticket) => {
    ticket.incidentId = incident.id;
  });

  return { ticket: finalTicket, handoff, matched, score };
}

// --- L2 -----------------------------------------------------------------------

export async function startL2(ticketId: string): Promise<Ticket> {
  const t = await getTicket(ticketId);
  if (!t) throw new Error("Ticket not found");

  await ledger.record({
    ticketId: t.id,
    type: "l2_started",
    actor: "l2_specialist",
    summary: `L2 specialist picked up ticket from structured handoff — resuming from confidence ${(t.diagnosticState.confidence * 100).toFixed(0)}%, no re-triage needed.`,
  });

  const result = await continueL2Investigation(t.diagnosticState);

  const scratch: Ticket = { ...t, diagnosticState: { ...t.diagnosticState } };
  await applyActions(scratch, result.actions, "l2_specialist");
  await applyEvidence(scratch, result.evidence, "l2_specialist");
  scratch.diagnosticState.confidence = result.confidence;
  scratch.diagnosticState.nextRecommendedAction = result.nextRecommendedAction;

  return update(ticketId, (ticket) => {
    ticket.status = "l2_investigating";
    ticket.assignedAgent = "l2_specialist";
    ticket.diagnosticState = scratch.diagnosticState;
  });
}

// --- Crash / Recovery -----------------------------------------------------------

export async function crashAgent(ticketId: string): Promise<Ticket> {
  const t = await getTicket(ticketId);
  if (!t) throw new Error("Ticket not found");

  await ledger.record({
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
  const t = await getTicket(ticketId);
  if (!t) throw new Error("Ticket not found");

  await ledger.record({
    ticketId: t.id,
    type: "recovery_started",
    actor: "recovery",
    summary: `Replacement agent started for ${t.shortId} — a process that has never seen this ticket before. Reading the persisted ledger instead of asking the customer to repeat information.`,
  });

  await ledger.record({
    ticketId: t.id,
    type: "recovery_state_restored",
    actor: "recovery",
    summary: `State restored from ledger: ${t.diagnosticState.actionsAttempted.length} action(s), ${t.diagnosticState.evidence.length} evidence item(s), ${
      t.diagnosticState.hypotheses.filter((h) => h.status === "ruled_out").length
    } hypothesis(es) ruled out, current confidence ${(t.diagnosticState.confidence * 100).toFixed(0)}%. Investigation resumes — not restarts.`,
  });

  const result = await runRecoveryInvestigation(t.diagnosticState);

  await ledger.record({
    ticketId: t.id,
    type: "l2_resumed",
    actor: "recovery",
    summary: `Resuming from recommended next action: "${t.diagnosticState.nextRecommendedAction}".`,
  });

  const scratch: Ticket = { ...t, diagnosticState: { ...t.diagnosticState } };
  await applyActions(scratch, result.actions, "recovery");
  await applyEvidence(scratch, result.evidence, "recovery");
  scratch.diagnosticState.confidence = result.confidence;
  scratch.diagnosticState.nextRecommendedAction = result.nextRecommendedAction;

  return update(ticketId, (ticket) => {
    ticket.status = "l2_investigating";
    ticket.assignedAgent = "recovery";
    ticket.diagnosticState = scratch.diagnosticState;
  });
}

// --- Resolution -----------------------------------------------------------------

export async function resolveTicket(ticketId: string): Promise<Ticket> {
  const t = await getTicket(ticketId);
  if (!t) throw new Error("Ticket not found");

  const { rootCause } = await synthesizeResolution(t.diagnosticState);

  const currentHyp = t.diagnosticState.hypotheses.find((h) => h.id === t.diagnosticState.currentHypothesisId);
  if (currentHyp) currentHyp.status = "confirmed";

  // Remember who actually did the work before we clear assignedAgent — this
  // is what the UI shows in place of "unassigned" once a ticket is resolved.
  const resolvingAgent = t.assignedAgent ?? "l2_specialist";

  const resolved = await update(ticketId, (ticket) => {
    ticket.status = "resolved";
    ticket.assignedAgent = null;
    ticket.resolvedByAgent = resolvingAgent;
    ticket.resolvedSummary = rootCause;
    ticket.diagnosticState.hypotheses = t.diagnosticState.hypotheses;
    ticket.diagnosticState.nextRecommendedAction = "None — resolved";
  });

  await ledger.record({
    ticketId: t.id,
    type: "resolved",
    actor: resolvingAgent,
    summary: `Resolved. Root cause: ${rootCause}`,
  });

  if (resolved.incidentId) {
    const incident = await getIncident(resolved.incidentId);
    if (incident) {
      incident.status = "resolved";
      incident.rootCause = rootCause;
      await saveIncident(incident);

      // Propagate the resolution to sibling tickets under the same incident —
      // this is the payoff of correlation: one root-cause fix closes the group.
      for (const siblingId of incident.ticketIds) {
        if (siblingId === resolved.id) continue;
        const sibling = await getTicket(siblingId);
        if (sibling && sibling.status !== "resolved") {
          await update(siblingId, (s) => {
            s.status = "resolved";
            s.assignedAgent = null;
            s.resolvedByAgent = "correlation";
            s.resolvedSummary = `Resolved via shared root cause identified on ${resolved.shortId}: ${rootCause}`;
          });
          await ledger.record({
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