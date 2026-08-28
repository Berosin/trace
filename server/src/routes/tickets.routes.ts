import { Router, Request, Response } from "express";
import * as ticketService from "../services/ticket.service";
import * as ledgerService from "../services/ledger.service";
import { runL1, escalateToL2, startL2, crashAgent, recoverAgent, resolveTicket } from "../services/agents.service";

export const ticketsRouter = Router();

ticketsRouter.get("/", (_req, res) => {
  res.json(ticketService.list());
});

ticketsRouter.get("/:id", (req, res) => {
  const t = ticketService.get(req.params.id);
  if (!t) return res.status(404).json({ error: "Ticket not found" });
  res.json(t);
});

ticketsRouter.get("/:id/ledger", (req, res) => {
  res.json(ledgerService.forTicket(req.params.id));
});

ticketsRouter.post("/", (req, res) => {
  const { subject, customer, channel, rawMessage } = req.body ?? {};
  if (!subject || !customer || !rawMessage) {
    return res.status(400).json({ error: "subject, customer, and rawMessage are required" });
  }
  const ticket = ticketService.createTicket({
    subject,
    customer,
    channel: channel ?? "web_form",
    rawMessage,
  });
  res.status(201).json(ticket);
});

/**
 * Wraps an agent action (sync or async) so a slow/failed LLM call surfaces
 * as a clean JSON error instead of crashing the process. These calls hit
 * Groq live, so they can take a couple of seconds — that's expected.
 */
function wrap(fn: (id: string) => unknown | Promise<unknown>) {
  return async (req: Request, res: Response) => {
    try {
      const result = await fn(req.params.id);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message ?? "Action failed" });
    }
  };
}

ticketsRouter.post("/:id/l1", wrap(runL1));
ticketsRouter.post("/:id/escalate", wrap(escalateToL2));
ticketsRouter.post("/:id/l2", wrap(startL2));
ticketsRouter.post("/:id/crash", wrap(crashAgent));
ticketsRouter.post("/:id/recover", wrap(recoverAgent));
ticketsRouter.post("/:id/resolve", wrap(resolveTicket));
