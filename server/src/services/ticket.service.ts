import { v4 as uuid } from "uuid";
import { getTicket, listTickets, nextTicketShortId, saveTicket } from "../data/store";
import { DiagnosticState, Ticket } from "../types/domain";
import { bus } from "./bus";
import * as ledger from "./ledger.service";

export async function createTicket(input: {
  subject: string;
  customer: string;
  channel: Ticket["channel"];
  rawMessage: string;
}): Promise<Ticket> {
  const now = new Date().toISOString();
  const emptyState: DiagnosticState = {
    problem: input.subject,
    entities: [],
    evidence: [],
    actionsAttempted: [],
    hypotheses: [],
    currentHypothesisId: null,
    confidence: 0,
    nextRecommendedAction: "Awaiting L1 triage",
  };
  const ticket: Ticket = {
    id: uuid(),
    shortId: await nextTicketShortId(),
    subject: input.subject,
    customer: input.customer,
    channel: input.channel,
    rawMessage: input.rawMessage,
    status: "new",
    incidentId: null,
    diagnosticState: emptyState,
    assignedAgent: null,
    resolvedByAgent: null,
    createdAt: now,
    updatedAt: now,
  };
  await saveTicket(ticket);
  await ledger.record({
    ticketId: ticket.id,
    type: "ticket_created",
    actor: "human",
    summary: `Ticket ${ticket.shortId} created by ${input.customer}: "${input.subject}"`,
  });
  bus.emit("ticket:updated", ticket);
  return ticket;
}

export async function update(ticketId: string, mutate: (t: Ticket) => void): Promise<Ticket> {
  const ticket = await getTicket(ticketId);
  if (!ticket) throw new Error(`Ticket ${ticketId} not found`);
  mutate(ticket);
  ticket.updatedAt = new Date().toISOString();
  await saveTicket(ticket);
  bus.emit("ticket:updated", ticket);
  return ticket;
}

export const get = getTicket;
export const list = listTickets;