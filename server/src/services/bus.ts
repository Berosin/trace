import { EventEmitter } from "events";

// Internal pub/sub so agent/ledger logic doesn't need to know about Socket.IO.
// socket.ts subscribes to these and fans them out to connected clients.
export const bus = new EventEmitter();
bus.setMaxListeners(50);

export type BusEvent = "ledger:entry" | "ticket:updated" | "incident:updated";
