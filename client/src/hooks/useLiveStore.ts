import { useEffect, useRef, useState } from "react";
import { socket } from "../services/socket";
import { api } from "../services/api";
import { Incident, LedgerEntry, Ticket } from "../types";

export interface LiveStore {
  tickets: Ticket[];
  incidents: Incident[];
  ledger: LedgerEntry[];
  connected: boolean;
  refresh: () => void;
}

export function useLiveStore(): LiveStore {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const refreshing = useRef(false);

  const refresh = () => {
    if (refreshing.current) return;
    refreshing.current = true;
    Promise.all([api.listTickets(), api.listIncidents(), api.fullLedger()])
      .then(([t, i, l]) => {
        setTickets(t);
        setIncidents(i);
        setLedger(l);
      })
      .catch(() => void 0)
      .finally(() => {
        refreshing.current = false;
      });
  };

  useEffect(() => {
    refresh();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onTicket = (t: Ticket) =>
      setTickets((prev) => {
        const idx = prev.findIndex((p) => p.id === t.id);
        if (idx === -1) return [t, ...prev];
        const next = [...prev];
        next[idx] = t;
        return next;
      });

    const onIncident = (i: Incident) =>
      setIncidents((prev) => {
        const idx = prev.findIndex((p) => p.id === i.id);
        if (idx === -1) return [i, ...prev];
        const next = [...prev];
        next[idx] = i;
        return next;
      });

    const onLedger = (e: LedgerEntry) => setLedger((prev) => [...prev, e]);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("ticket:updated", onTicket);
    socket.on("incident:updated", onIncident);
    socket.on("ledger:entry", onLedger);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("ticket:updated", onTicket);
      socket.off("incident:updated", onIncident);
      socket.off("ledger:entry", onLedger);
    };
  }, []);

  return { tickets, incidents, ledger, connected, refresh };
}
