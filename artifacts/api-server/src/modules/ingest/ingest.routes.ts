import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireMinRole } from "../../middlewares/rbac.middleware";
import { db, rawLogsTable, alertsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logAuditEvent } from "../../lib/audit";
import type { Request, Response } from "express";

const router = Router();

router.post("/ingest-log", requireAuth, requireMinRole("soc_l2"), async (req: Request, res: Response) => {
  const { source, severity, eventType, sourceIp, destIp, hostname, username, message, rawData } = req.body;

  if (!source) {
    res.status(400).json({ error: "source is required" });
    return;
  }

  const [log] = await db.insert(rawLogsTable).values({
    source,
    severity: severity ?? "info",
    eventType,
    sourceIp,
    destIp,
    hostname,
    username,
    message,
    rawData: rawData ?? null,
    processed: "false",
  }).returning();

  await logAuditEvent(req, "ingest.log", { resource: "ingest", resourceId: log.id, metadata: { source, severity } });

  res.status(201).json({
    message: "Log ingested successfully",
    logId: log.id,
    note: "Connect your detection engine to process this log. Poll GET /api/ingest/pending for unprocessed logs.",
  });
});

router.get("/ingest/pending", requireAuth, requireMinRole("soc_l2"), async (req: Request, res: Response) => {
  const limit = Number(req.query.limit ?? 100);
  const logs = await db.select().from(rawLogsTable)
    .where(eq(rawLogsTable.processed, "false"))
    .limit(limit);
  res.json({ logs, count: logs.length });
});

router.post("/ingest/detections", requireAuth, requireMinRole("soc_l2"), async (req: Request, res: Response) => {
  const { detections } = req.body;
  if (!Array.isArray(detections)) {
    res.status(400).json({ error: "detections must be an array" });
    return;
  }

  const created = [];
  for (const det of detections) {
    const [alert] = await db.insert(alertsTable).values({
      alertCode: `ALT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: det.title ?? "Detection Alert",
      description: det.description,
      severity: det.severity ?? "medium",
      status: "new",
      source: det.source,
      ruleId: det.ruleId,
      ruleName: det.ruleName,
      mitreIds: det.mitreIds ?? [],
      mitreTactic: det.mitreTactic,
      sourceIp: det.sourceIp,
      destIp: det.destIp,
      hostname: det.hostname,
      rawLog: det.rawLog,
      createdBy: req.user!.userId,
    }).returning();
    created.push(alert);
  }

  res.status(201).json({ created: created.length, alerts: created });
});

export default router;
