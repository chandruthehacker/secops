import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { can } from "../../middlewares/rbac.middleware";
import { db, rawLogsTable, alertsTable } from "@workspace/db";
import { eq, desc, ilike, and, sql } from "drizzle-orm";
import { logAuditEvent } from "../../lib/audit";
import { processLogRecord, processLogsBatch } from "../../lib/detection/pipeline";
import type { Request, Response } from "express";

const router = Router();

router.post("/ingest-log", requireAuth, can("ingest:write"), async (req: Request, res: Response) => {
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

  // Run detection asynchronously
  const rawMsg = message ?? JSON.stringify(rawData ?? {});
  processLogRecord(log.id, rawMsg, source, hostname ?? sourceIp ?? "unknown", { srcIp: sourceIp, userName: username }).catch(() => {});

  res.status(201).json({ message: "Log ingested successfully", logId: log.id });
});

router.get("/ingest/pending", requireAuth, can("ingest:pending"), async (req: Request, res: Response) => {
  const limit = Number(req.query.limit ?? 100);
  const logs = await db.select().from(rawLogsTable)
    .where(eq(rawLogsTable.processed, "false"))
    .limit(limit);
  res.json({ logs, count: logs.length });
});

router.post("/ingest/detections", requireAuth, can("ingest:write"), async (req: Request, res: Response) => {
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

router.post("/ingest/bulk", requireAuth, can("ingest:write"), async (req: Request, res: Response) => {
  const { logs } = req.body;
  if (!Array.isArray(logs) || logs.length === 0) {
    res.status(400).json({ error: "logs must be a non-empty array" });
    return;
  }
  if (logs.length > 10_000) {
    res.status(400).json({ error: "Maximum 10,000 logs per bulk upload" });
    return;
  }

  const values = logs.map((l: Record<string, any>) => ({
    source: String(l.source ?? l.host ?? l.hostname ?? "file-upload"),
    severity: ["critical", "high", "medium", "low", "info"].includes(String(l.severity ?? "").toLowerCase())
      ? String(l.severity).toLowerCase()
      : "info",
    eventType: l.eventType ?? l.event_type ?? l.EventType ?? undefined,
    sourceIp: l.sourceIp ?? l.source_ip ?? l.src_ip ?? l.src ?? undefined,
    destIp: l.destIp ?? l.dest_ip ?? l.dst_ip ?? l.dst ?? undefined,
    hostname: l.hostname ?? l.host ?? undefined,
    username: l.username ?? l.user ?? undefined,
    message: l.message ?? l.msg ?? l.Message ?? JSON.stringify(l),
    rawData: l as any,
    processed: "false" as const,
  }));

  const inserted = await db.insert(rawLogsTable).values(values).returning({ id: rawLogsTable.id, message: rawLogsTable.message, source: rawLogsTable.source, hostname: rawLogsTable.hostname, sourceIp: rawLogsTable.sourceIp, username: rawLogsTable.username });

  await logAuditEvent(req, "ingest.bulk", {
    resource: "ingest",
    resourceId: inserted[0]?.id,
    metadata: { count: inserted.length },
  });

  // Run detection asynchronously on all inserted logs
  processLogsBatch(inserted.map(l => ({ id: l.id, message: l.message ?? "", source: l.source, hostname: l.hostname ?? undefined, sourceIp: l.sourceIp ?? undefined, username: l.username ?? undefined }))).catch(() => {});

  res.status(201).json({ inserted: inserted.length });
});

router.get("/logs", requireAuth, can("alerts:view"), async (req: Request, res: Response) => {
  const { source, severity, search, category, action, page = "1", limit = "50" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(200, Math.max(1, Number(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  if (source) conditions.push(eq(rawLogsTable.source, source));
  if (severity) conditions.push(eq(rawLogsTable.severity, severity));
  if (category) conditions.push(eq(rawLogsTable.category as any, category));
  if (action) conditions.push(eq(rawLogsTable.action as any, action));
  if (search) {
    conditions.push(
      sql`(${rawLogsTable.message} ilike ${"%" + search + "%"} or ${rawLogsTable.sourceIp} ilike ${"%" + search + "%"} or ${rawLogsTable.eventType} ilike ${"%" + search + "%"} or ${rawLogsTable.username} ilike ${"%" + search + "%"})`
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [logs, [{ count }]] = await Promise.all([
    db.select().from(rawLogsTable).where(where).orderBy(desc(rawLogsTable.createdAt)).limit(limitNum).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(rawLogsTable).where(where),
  ]);

  res.json({ logs, total: Number(count), page: pageNum, limit: limitNum });
});

export default router;
