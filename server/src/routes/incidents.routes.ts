import { Router } from "express";
import { listIncidents, getIncident } from "../data/store";

export const incidentsRouter = Router();

incidentsRouter.get("/", (_req, res) => {
  res.json(listIncidents());
});

incidentsRouter.get("/:id", (req, res) => {
  const i = getIncident(req.params.id);
  if (!i) return res.status(404).json({ error: "Incident not found" });
  res.json(i);
});
