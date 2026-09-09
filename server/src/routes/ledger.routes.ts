import { Router } from "express";
import * as ledgerService from "../services/ledger.service";

export const ledgerRouter = Router();

ledgerRouter.get("/", async (_req, res) => {
  try {
    res.json(await ledgerService.full());
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Request failed" });
  }
});

ledgerRouter.get("/verify", async (_req, res) => {
  try {
    res.json(await ledgerService.verify());
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Request failed" });
  }
});