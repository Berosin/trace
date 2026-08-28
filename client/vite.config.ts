import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In Docker Compose this is set to http://server:4000 so the container can
// reach the API by service name; locally it defaults to localhost.
const apiTarget = process.env.VITE_API_PROXY_TARGET || "http://localhost:4000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": apiTarget,
      "/socket.io": {
        target: apiTarget,
        ws: true,
      },
    },
  },
});
