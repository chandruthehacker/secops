import { db, alertsTable, alertTimelineTable, usersTable, rawLogsTable } from "@workspace/db";
import { eq, desc, and, or, ilike, sql, inArray } from "drizzle-orm";

let alertCounter = 1000;

function generateAlertCode(): string {
  return `ALT-${Date.now()}-${++alertCounter}`;
}

export async function getAlerts(filters: {
  status?: string;
  severity?: string;
  search?: string;
  page?: number;
  limit?: number;
} = {}) {
  const { page = 1, limit = 50 } = filters;
  const offset = (page - 1) * limit;

  const conditions: any[] = [];
  if (filters.status) conditions.push(eq(alertsTable.status, filters.status as any));
  if (filters.severity) conditions.push(eq(alertsTable.severity, filters.severity as any));
  if (filters.search) {
    conditions.push(
      sql`(${alertsTable.title} ilike ${"%" + filters.search + "%"} OR ${alertsTable.description} ilike ${"%" + filters.search + "%"} OR ${alertsTable.hostname} ilike ${"%" + filters.search + "%"})`
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [alerts, [{ count }]] = await Promise.all([
    db.select({
      id: alertsTable.id,
      alertCode: alertsTable.alertCode,
      title: alertsTable.title,
      description: alertsTable.description,
      severity: alertsTable.severity,
      severityScore: alertsTable.severityScore,
      status: alertsTable.status,
      source: alertsTable.source,
      ruleId: alertsTable.ruleId,
      ruleName: alertsTable.ruleName,
      mitreIds: alertsTable.mitreIds,
      mitreTactic: alertsTable.mitreTactic,
      mitreTechniqueId: alertsTable.mitreTechniqueId,
      mitreTechniqueName: alertsTable.mitreTechniqueName,
      mitreSubtechniqueId: alertsTable.mitreSubtechniqueId,
      sourceIp: alertsTable.sourceIp,
      destIp: alertsTable.destIp,
      hostname: alertsTable.hostname,
      sourceHost: alertsTable.sourceHost,
      triggerTimestamp: alertsTable.triggerTimestamp,
      context: alertsTable.context,
      tags: alertsTable.tags,
      assignedTo: alertsTable.assignedTo,
      resolvedAt: alertsTable.resolvedAt,
      resolutionNotes: alertsTable.resolutionNotes,
      createdAt: alertsTable.createdAt,
      updatedAt: alertsTable.updatedAt,
    })
    .from(alertsTable)
    .where(where)
    .orderBy(desc(alertsTable.severityScore), desc(alertsTable.createdAt))
    .limit(limit)
    .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(alertsTable).where(where),
  ]);

  return { alerts, total: Number(count), page, limit };
}

export async function getAlertById(id: string) {
  const [alert] = await db.select().from(alertsTable).where(eq(alertsTable.id, id)).limit(1);
  if (!alert) return null;

  const timeline = await db
    .select()
    .from(alertTimelineTable)
    .where(eq(alertTimelineTable.alertId, id))
    .orderBy(alertTimelineTable.createdAt);

  return { ...alert, timeline };
}

export async function createAlert(data: {
  title: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  source?: string;
  description?: string;
  ruleId?: string;
  ruleName?: string;
  mitreIds?: string[];
  mitreTactic?: string;
  sourceIp?: string;
  destIp?: string;
  hostname?: string;
  rawLog?: unknown;
  createdBy?: string;
}) {
  const [alert] = await db.insert(alertsTable).values({
    alertCode: generateAlertCode(),
    ...data,
    rawLog: data.rawLog as any,
    status: "new",
  }).returning();
  return alert;
}

export async function updateAlertStatus(id: string, status: string, userId: string, resolutionNotes?: string) {
  const [alert] = await db.update(alertsTable)
    .set({
      status: status as any,
      updatedBy: userId,
      updatedAt: new Date(),
      resolvedAt: status === "resolved" ? new Date() : null,
      resolutionNotes: resolutionNotes ?? null,
    })
    .where(eq(alertsTable.id, id))
    .returning();

  if (alert) {
    await db.insert(alertTimelineTable).values({
      alertId: id,
      authorId: userId,
      type: "status_change",
      content: `Status changed to ${status}${resolutionNotes ? `: ${resolutionNotes}` : ""}`,
      metadata: { status, resolutionNotes } as any,
    });
  }

  return alert ?? null;
}

export async function bulkUpdateAlertStatus(ids: string[], status: string, userId: string, resolutionNotes?: string) {
  const [{ count }] = await db
    .update(alertsTable)
    .set({
      status: status as any,
      updatedBy: userId,
      updatedAt: new Date(),
      resolvedAt: status === "resolved" ? new Date() : null,
      resolutionNotes: resolutionNotes ?? null,
    })
    .where(inArray(alertsTable.id, ids))
    .returning({ count: sql<number>`count(*)` });

  return Number(count ?? ids.length);
}

export async function assignAlertTo(id: string, assignedTo: string, userId: string) {
  const [alert] = await db.update(alertsTable)
    .set({ assignedTo, updatedBy: userId, updatedAt: new Date() })
    .where(eq(alertsTable.id, id))
    .returning();

  if (alert) {
    await db.insert(alertTimelineTable).values({
      alertId: id,
      authorId: userId,
      type: "assignment",
      content: `Alert assigned`,
      metadata: { assignedTo } as any,
    });
  }

  return alert ?? null;
}

export async function addTimelineNote(alertId: string, authorId: string, authorName: string, content: string, type = "note") {
  const [entry] = await db.insert(alertTimelineTable).values({
    alertId,
    authorId,
    authorName,
    type,
    content,
  }).returning();
  return entry;
}

export async function getRelatedEvents(alertId: string, minutesBefore = 10, minutesAfter = 5) {
  const [alert] = await db.select().from(alertsTable).where(eq(alertsTable.id, alertId)).limit(1);
  if (!alert) return [];

  const triggerTime = alert.triggerTimestamp ?? alert.createdAt;
  const from = new Date(triggerTime.getTime() - minutesBefore * 60_000);
  const to = new Date(triggerTime.getTime() + minutesAfter * 60_000);

  const hostFilter = alert.sourceHost ?? alert.hostname;

  const events = await db.select().from(rawLogsTable).where(
    and(
      sql`${rawLogsTable.createdAt} >= ${from.toISOString()}`,
      sql`${rawLogsTable.createdAt} <= ${to.toISOString()}`,
      hostFilter
        ? sql`(${rawLogsTable.sourceHost} = ${hostFilter} OR ${rawLogsTable.hostname} = ${hostFilter})`
        : sql`true`,
    )
  ).orderBy(rawLogsTable.createdAt).limit(100);

  return events;
}
