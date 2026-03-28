import type { Request, Response } from "express";
import * as dashboardService from "./dashboard.service";

export async function getStats(req: Request, res: Response): Promise<void> {
  const stats = await dashboardService.getDashboardStats();
  res.json(stats);
}
