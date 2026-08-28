// ---------------------------------------------------------------------------
// TRACE domain types.
// The central object of this system is DIAGNOSTIC STATE, not conversation
// history. Everything below exists to make that state explicit, structured,
// and provenance-tracked.
// ---------------------------------------------------------------------------

export type TicketStatus =
  | "new"
  | "l1_investigating"
  | "escalated"
  | "l2_investigating"
  | "agent_crashed"
  | "recovering"
  | "needs_human"
  | "resolved";

export type AgentRole = "l1_triage" | "correlation" | "l2_specialist" | "recovery" | "human";

export interface Entity {
  type: string; // e.g. "order_id", "discount_code", "region", "product"
  value: string;
}

export interface Evidence {
  id: string;
  summary: string;
  source: string; // e.g. "pricing-service log", "billing DB query"
  collectedBy: AgentRole;
  at: string;
}

export interface ActionAttempted {
  id: string;
  action: string;
  result: string;
  ruledOut: boolean; // true if this action ruled out a hypothesis
  at: string;
}

export interface Hypothesis {
  id: string;
  text: string;
  status: "active" | "ruled_out" | "confirmed";
}

/**
 * DiagnosticState is the thing TRACE actually hands off between agents.
 * L1 -> L2 transfers this, not a transcript.
 */
export interface DiagnosticState {
  problem: string;
  entities: Entity[];
  evidence: Evidence[];
  actionsAttempted: ActionAttempted[];
  hypotheses: Hypothesis[];
  currentHypothesisId: string | null;
  confidence: number; // 0-1
  nextRecommendedAction: string;
}

export interface HandoffPacket {
  id: string;
  ticketId: string;
  fromAgent: AgentRole;
  toAgent: AgentRole;
  diagnosticState: DiagnosticState;
  createdAt: string;
}

export type LedgerEventType =
  | "ticket_created"
  | "l1_started"
  | "l1_action"
  | "l1_evidence"
  | "l1_hypothesis_ruled_out"
  | "l1_handoff"
  | "correlation_checked"
  | "correlation_linked"
  | "incident_created"
  | "l2_started"
  | "l2_action"
  | "l2_evidence"
  | "agent_crashed"
  | "recovery_started"
  | "recovery_state_restored"
  | "l2_resumed"
  | "resolved"
  | "escalated_to_human";

export interface LedgerEntry {
  seq: number;
  id: string;
  ticketId: string;
  type: LedgerEventType;
  actor: AgentRole;
  summary: string;
  detail?: Record<string, unknown>;
  at: string;
  prevHash: string;
  hash: string;
}

export interface Ticket {
  id: string;
  shortId: string; // e.g. TICK-101
  subject: string;
  customer: string;
  channel: "email" | "chat" | "web_form";
  rawMessage: string;
  status: TicketStatus;
  incidentId: string | null;
  diagnosticState: DiagnosticState;
  assignedAgent: AgentRole | null;
  createdAt: string;
  updatedAt: string;
  resolvedSummary?: string;
}

export interface Incident {
  id: string;
  shortId: string; // e.g. INC-001
  title: string;
  ticketIds: string[];
  rootCause: string | null;
  status: "open" | "resolved";
  createdAt: string;
}
