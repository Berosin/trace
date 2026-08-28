import { chatJSON } from "./groq";
import { DiagnosticState } from "../types/domain";

// ---------------------------------------------------------------------------
// This is the actual "brain" of TRACE. Nothing here is keyed off keywords or
// matched against a canned scenario — every function sends the ticket's real
// text (or the real accumulated diagnostic state) to an LLM and asks it to
// reason about THIS specific problem. The JSON schema each prompt requests
// mirrors DiagnosticState exactly, so results map straight onto the domain
// model the rest of the app already understands.
// ---------------------------------------------------------------------------

export interface RawEntity {
  type: string;
  value: string;
}
export interface RawHypothesis {
  text: string;
}
export interface RawEvidence {
  summary: string;
  source: string;
}
export interface RawAction {
  action: string;
  result: string;
  ruledOutHypothesisIndex: number | null;
  confirmsHypothesisIndex?: number | null;
}

export interface L1Result {
  entities: RawEntity[];
  hypotheses: RawHypothesis[];
  actions: RawAction[];
  evidence: RawEvidence[];
  confidence: number;
  nextRecommendedAction: string;
}

export interface ContinuationResult {
  actions: RawAction[];
  evidence: RawEvidence[];
  confidence: number;
  nextRecommendedAction: string;
  readyToResolve?: boolean;
}

export interface ResolutionResult {
  rootCause: string;
}

const JSON_REMINDER =
  "Respond with ONLY a single valid JSON object matching the schema described. No prose, no markdown fences, no commentary.";

/**
 * L1 triage: given only the raw customer message, extract entities, propose
 * plausible hypotheses, simulate the diagnostic actions a real L1 support
 * agent would take against internal tools (logs, config, account status,
 * service health dashboards), and report what those actions would plausibly
 * find for THIS specific problem.
 */
export async function runL1Triage(subject: string, rawMessage: string): Promise<L1Result> {
  const system = `You are an L1 support triage agent inside TRACE, a support platform.
Given a customer's ticket, you investigate like a real support engineer would: you extract
concrete entities, form multiple competing hypotheses for the root cause, and take a few
plausible diagnostic actions against the kind of internal tooling a real company would have
(logs, config services, account/database lookups, service health dashboards) — then report
specific, technically credible results for each action, as if you actually ran it.

Ground everything in the specific details of the ticket. Do not invent unrelated systems.

${JSON_REMINDER}
Schema:
{
  "entities": [{"type": string, "value": string}],           // 1-4 concrete entities actually mentioned or clearly implied
  "hypotheses": [{"text": string}],                            // exactly 3 distinct, plausible root-cause hypotheses
  "actions": [                                                  // 2-4 diagnostic actions, in order
    {
      "action": string,                                         // what you checked
      "result": string,                                         // specific, technically credible finding
      "ruledOutHypothesisIndex": number | null                  // index into "hypotheses" this action rules out, or null
    }
  ],
  "evidence": [{"summary": string, "source": string}],          // 1-3 concrete evidence items gathered from the actions above
  "confidence": number,                                          // 0.0-1.0, how close L1 got to a confirmed root cause
  "nextRecommendedAction": string                                // the single next step you'd hand to an L2 specialist
}`;

  const user = `Ticket subject: ${subject}\nCustomer's message: ${rawMessage}`;
  return chatJSON<L1Result>(system, user);
}

function describeState(state: DiagnosticState): string {
  return JSON.stringify(
    {
      problem: state.problem,
      entities: state.entities,
      hypotheses: state.hypotheses.map((h, i) => ({ index: i, text: h.text, status: h.status })),
      evidence: state.evidence.map((e) => ({ summary: e.summary, source: e.source })),
      actionsAttempted: state.actionsAttempted.map((a) => ({ action: a.action, result: a.result })),
      confidence: state.confidence,
      nextRecommendedAction: state.nextRecommendedAction,
    },
    null,
    2
  );
}

/**
 * L2 continuation: the specialist agent receives the FULL diagnostic state
 * (the structured handoff, not a transcript) and continues the investigation
 * — deeper actions aimed specifically at the still-active hypotheses and the
 * recommended next step, using more specialized tooling than L1 would reach
 * for. It must not repeat actions already listed in actionsAttempted.
 */
export async function continueL2Investigation(state: DiagnosticState): Promise<ContinuationResult> {
  const system = `You are an L2 support specialist inside TRACE. You have just received a
structured handoff from an L1 triage agent: the full diagnostic state below (entities,
hypotheses with their current status, evidence already collected, actions already attempted,
current confidence, and the recommended next action). You do NOT re-investigate from scratch —
continue exactly where L1 left off, using deeper/more specialized internal tooling, aimed at
the active hypotheses and the recommended next action.

Do not repeat any action already listed in actionsAttempted. Hypothesis indices in your
response must refer to the "hypotheses" array given to you below (by its "index" field).

${JSON_REMINDER}
Schema:
{
  "actions": [                                                   // 1-2 new diagnostic actions
    {
      "action": string,
      "result": string,
      "ruledOutHypothesisIndex": number | null,
      "confirmsHypothesisIndex": number | null                    // set if this action strongly confirms a hypothesis
    }
  ],
  "evidence": [{"summary": string, "source": string}],            // 0-2 new evidence items
  "confidence": number,                                            // updated 0.0-1.0, should generally increase
  "nextRecommendedAction": string                                  // what a subsequent agent should do next (used for crash-recovery)
}`;

  const user = `Current diagnostic state (JSON):\n${describeState(state)}`;
  return chatJSON<ContinuationResult>(system, user);
}

/**
 * Recovery: a brand-new agent process that has never seen this ticket before
 * is started after the previous L2 agent crashed. It is given the exact same
 * persisted diagnostic state (read from the ledger) and must RESUME from the
 * recommended next action rather than restarting the investigation.
 */
export async function runRecoveryInvestigation(state: DiagnosticState): Promise<ContinuationResult> {
  const system = `You are a brand-new replacement agent inside TRACE. The previous agent working
this ticket crashed. You have never seen this ticket before, but the full diagnostic state below
was persisted in TRACE's ledger before the crash. Resume the investigation from exactly
"nextRecommendedAction" — do not restart or repeat any action already listed in
actionsAttempted. Perform that action (and, if warranted, one confirming follow-up), and if the
evidence is now sufficient, set readyToResolve to true.

Hypothesis indices in your response must refer to the "hypotheses" array given below (by its
"index" field).

${JSON_REMINDER}
Schema:
{
  "actions": [
    {
      "action": string,
      "result": string,
      "ruledOutHypothesisIndex": number | null,
      "confirmsHypothesisIndex": number | null
    }
  ],
  "evidence": [{"summary": string, "source": string}],
  "confidence": number,
  "nextRecommendedAction": string,
  "readyToResolve": boolean
}`;

  const user = `Diagnostic state restored from the ledger (JSON):\n${describeState(state)}`;
  return chatJSON<ContinuationResult>(system, user);
}

/**
 * Resolution: synthesizes a concise, customer-ready root-cause statement
 * from the full accumulated diagnostic state.
 */
export async function synthesizeResolution(state: DiagnosticState): Promise<ResolutionResult> {
  const system = `You are closing out a support ticket inside TRACE. Given the full diagnostic
state below, write a concise (1-3 sentence) root-cause statement plus the fix or resolution,
suitable for the record and for briefing the customer. Be specific — reference the actual
evidence and confirmed hypothesis, not generic language.

${JSON_REMINDER}
Schema: { "rootCause": string }`;

  const user = `Diagnostic state (JSON):\n${describeState(state)}`;
  return chatJSON<ResolutionResult>(system, user);
}
