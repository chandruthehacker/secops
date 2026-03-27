import { db, alertsTable, alertTimelineTable, usersTable } from "@workspace/db";
import { eq, desc, and, or, ilike, sql } from "drizzle-orm";

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

  let query = db.select().from(alertsTable).orderBy(desc(alertsTable.createdAt));

  const alerts = await query.limit(limit).offset(offset);
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(alertsTable);

  return { alerts, total: Number(count), page, limit };
}

export async function getAlertById(id: string) {
  const [alert] = await db.select().from(alertsTable).where(eq(alertsTable.id, id)).limit(1);
  if (!alert) return null;

  const timeline = await db
    .select()
    .from(alertTimelineTable)
    .where(eq(alertTimelineTable.alertId, id))
    .orderBy(desc(alertTimelineTable.createdAt));

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

export async function updateAlertStatus(id: string, status: string, userId: string) {
  const [alert] = await db.update(alertsTable)
    .set({ status: status as any, updatedBy: userId, updatedAt: new Date(), resolvedAt: status === "resolved" ? new Date() : null })
    .where(eq(alertsTable.id, id))
    .returning();
  return alert ?? null;
}

export async function assignAlert(id: string, assignedTo: string, userId: string) {
  const [alert] = await db.update(alertsTable)
    .set({ assignedTo, updatedBy: userId, updatedAt: new Date() })
    .where(eq(alertsTable.id, id))
    .returning();
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
