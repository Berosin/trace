import { Incident, LedgerEntry, Ticket } from "../types";

const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listTickets: () => request<Ticket[]>("/tickets"),
  getTicket: (id: string) => request<Ticket>(`/tickets/${id}`),
  ticketLedger: (id: string) => request<LedgerEntry[]>(`/tickets/${id}/ledger`),
  createTicket: (input: { subject: string; customer: string; channel: string; rawMessage: string }) =>
    request<Ticket>("/tickets", { method: "POST", body: JSON.stringify(input) }),
  runL1: (id: string) => request<Ticket>(`/tickets/${id}/l1`, { method: "POST" }),
  escalate: (id: string) => request<{ ticket: Ticket; matched: boolean; score: number }>(`/tickets/${id}/escalate`, { method: "POST" }),
  startL2: (id: string) => request<Ticket>(`/tickets/${id}/l2`, { method: "POST" }),
  crash: (id: string) => request<Ticket>(`/tickets/${id}/crash`, { method: "POST" }),
  recover: (id: string) => request<Ticket>(`/tickets/${id}/recover`, { method: "POST" }),
  resolve: (id: string) => request<Ticket>(`/tickets/${id}/resolve`, { method: "POST" }),

  listIncidents: () => request<Incident[]>("/incidents"),

  fullLedger: () => request<LedgerEntry[]>("/ledger"),
  verifyLedger: () => request<{ valid: boolean; brokenAt: number | null }>("/ledger/verify"),
};
