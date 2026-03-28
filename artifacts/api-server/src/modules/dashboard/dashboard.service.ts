import { db, alertsTable, rawLogsTable, rulesTable } from "@workspace/db";
import { sql, desc, gte } from "drizzle-orm";

export async function getDashboardStats() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    alertsTotal,
    alertsByStatus,
    alertsBySeverity,
    alertsLast24h,
    logsTotal,
    activeRules,
    recentAlerts,
    logsBySource,
    alertTrend,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(alertsTable),
    db
      .select({ status: alertsTable.status, count: sql<number>`count(*)` })
      .from(alertsTable)
      .groupBy(alertsTable.status),
    db
      .select({ severity: alertsTable.severity, count: sql<number>`count(*)` })
      .from(alertsTable)
      .groupBy(alertsTable.severity),
    db
      .select({ count: sql<number>`count(*)` })
      .from(alertsTable)
      .where(gte(alertsTable.createdAt, twentyFourHoursAgo)),
    db.select({ count: sql<number>`count(*)` }).from(rawLogsTable),
    db.select({ count: sql<number>`count(*)` }).from(rulesTable).where(sql`enabled = true`),
    db
      .select({
        id: alertsTable.id,
        alertCode: alertsTable.alertCode,
        title: alertsTable.title,
        severity: alertsTable.severity,
        status: alertsTable.status,
        createdAt: alertsTable.createdAt,
      })
      .from(alertsTable)
      .orderBy(desc(alertsTable.createdAt))
      .limit(5),
    db
      .select({ source: rawLogsTable.source, count: sql<number>`count(*)` })
      .from(rawLogsTable)
      .groupBy(rawLogsTable.source),
    db
      .select({
        hour: sql<string>`to_char(date_trunc('hour', created_at), 'HH24:00')`,
        count: sql<number>`count(*)`,
      })
      .from(alertsTable)
      .where(gte(alertsTable.createdAt, twentyFourHoursAgo))
      .groupBy(sql`date_trunc('hour', created_at)`)
      .orderBy(sql`date_trunc('hour', created_at)`),
  ]);

  const severityMap: Record<string, number> = {};
  alertsBySeverity.forEach(row => { severityMap[row.severity] = Number(row.count); });

  const statusMap: Record<string, number> = {};
  alertsByStatus.forEach(row => { statusMap[row.status] = Number(row.count); });

  const sourceMap: Record<string, number> = {};
  logsBySource.forEach(row => { sourceMap[row.source] = Number(row.count); });

  return {
    alerts: {
      total: Number(alertsTotal[0]?.count ?? 0),
      last24h: Number(alertsLast24h[0]?.count ?? 0),
      byStatus: statusMap,
      bySeverity: severityMap,
    },
    logs: {
      total: Number(logsTotal[0]?.count ?? 0),
      bySource: sourceMap,
    },
    rules: {
      active: Number(activeRules[0]?.count ?? 0),
    },
    recentAlerts,
    alertTrend: alertTrend.map(r => ({ hour: r.hour, count: Number(r.count) })),
  };
}
