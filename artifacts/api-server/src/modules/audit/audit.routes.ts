import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/rbac.middleware";
import { db, auditLogsTable } from "@workspace/db";
import { desc, sql } from "drizzle-orm";
import type { Request, Response } from "express";

const router = Router();

router.get("/audit", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 50);
  const offset = (page - 1) * limit;

  const logs = await db.select().from(auditLogsTable)
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(auditLogsTable);

  res.json({ logs, total: Number(count), page, limit });
});

export default router;
