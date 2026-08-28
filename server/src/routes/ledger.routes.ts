import { Router } from "express";
import * as ledgerService from "../services/ledger.service";

export const ledgerRouter = Router();

ledgerRouter.get("/", (_req, res) => {
  res.json(ledgerService.full());
});

ledgerRouter.get("/verify", (_req, res) => {
  res.json(ledgerService.verify());
});
