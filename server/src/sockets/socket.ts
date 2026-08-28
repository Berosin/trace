import { Server as HTTPServer } from "http";
import { Server } from "socket.io";
import { bus } from "../services/bus";

export function attachSocket(httpServer: HTTPServer) {
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  bus.on("ledger:entry", (entry) => io.emit("ledger:entry", entry));
  bus.on("ticket:updated", (ticket) => io.emit("ticket:updated", ticket));
  bus.on("incident:updated", (incident) => io.emit("incident:updated", incident));

  io.on("connection", (socket) => {
    socket.emit("connected", { ok: true });
  });

  return io;
}
