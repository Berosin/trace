import { Router } from "express";
import { listIncidents, getIncident } from "../data/store";

export const incidentsRouter = Router();

incidentsRouter.get("/", async (_req, res) => {
  try {
    res.json(await listIncidents());
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Request failed" });
  }
});

incidentsRouter.get("/:id", async (req, res) => {
  try {
    const i = await getIncident(req.params.id);
    if (!i) return res.status(404).json({ error: "Incident not found" });
    res.json(i);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Request failed" });
  }
});