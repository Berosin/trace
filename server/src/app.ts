import express from "express";
import cors from "cors";
import { ticketsRouter } from "./routes/tickets.routes";
import { incidentsRouter } from "./routes/incidents.routes";
import { ledgerRouter } from "./routes/ledger.routes";
import { providerName } from "./services/groq";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", provider: providerName() });
  });

  app.use("/api/tickets", ticketsRouter);
  app.use("/api/incidents", incidentsRouter);
  app.use("/api/ledger", ledgerRouter);

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Internal error" });
  });

  return app;
}
