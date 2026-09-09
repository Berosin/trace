import { io } from "socket.io-client";

// Same VITE_API_URL used by api.ts. Unset in local dev (connects same-origin,
// proxied by Vite); set to the deployed backend's URL in production so a
// statically-hosted frontend connects to the right domain.
const API_URL = import.meta.env.VITE_API_URL || undefined;

export const socket = io(API_URL, {
  path: "/socket.io",
  transports: ["websocket", "polling"],
  autoConnect: true,
});