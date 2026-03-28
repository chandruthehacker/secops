import { db, rawLogsTable, alertsTable, rulesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { detectionEngine } from "./engine";
import { parseLog } from "../parsers";
import { enrichEvent } from "../enrichment";
import { broadcastAlert } from "../websocket";
import type { NormalizedEvent } from "./types";

let engineLoaded = false;
let engineLoading = false;

export async function ensureEngineLoaded(): Promise<void> {
  if (engineLoaded || engineLoading) return;
  engineLoading = true;
  try {
    await detectionEngine.loadRulesFromDb();
    engineLoaded = true;
  } finally {
    engineLoading = false;
  }
}

export function invalidateEngine(): void {
  engineLoaded = false;
}

export async function processLogRecord(logId: string, raw: string, sourceType: string, sourceHost: string, extraFields: Partial<NormalizedEvent> = {}): Promise<void> {
  await ensureEngineLoaded();

  // Parse
  const parsed = parseLog(raw, sourceType, sourceHost);
  if (!parsed) {
    await db.update(rawLogsTable).set({ processed: "unparseable", detectionRunAt: new Date() }).where(eq(rawLogsTable.id, logId));
    return;
  }

  // Build normalized event
  const event: NormalizedEvent = {
    id: logId,
    timestamp: new Date(),
    ingestedAt: new Date(),
    sourceType: parsed.sourceType,
    sourceHost: parsed.sourceHost,
    category: parsed.category,
    action: parsed.action,
    outcome: parsed.outcome,
    severity: parsed.severity,
    userName: parsed.userName ?? extraFields.userName,
    userDomain: parsed.userDomain,
    processName: parsed.processName ?? extraFields.processName,
    processCommandLine: parsed.processCommandLine ?? extraFields.processCommandLine,
    parentProcessName: parsed.parentProcessName,
    srcIp: parsed.srcIp ?? extraFields.srcIp,
    srcPort: parsed.srcPort ?? extraFields.srcPort,
    dstIp: parsed.dstIp ?? extraFields.dstIp,
    dstPort: parsed.dstPort ?? extraFields.dstPort,
    protocol: parsed.protocol,
    message: parsed.message,
    rawLog: raw,
    ...extraFields,
  };

  // Enrich
  const enriched = await enrichEvent(event);

  // Update the raw_log record with normalized fields
  await db.update(rawLogsTable).set({
    category: enriched.category,
    action: enriched.action,
    outcome: enriched.outcome,
    sourceHost: enriched.sourceHost,
    processName: enriched.processName,
    processCommandLine: enriched.processCommandLine,
    parentProcessName: enriched.parentProcessName,
    srcPort: enriched.srcPort,
    dstPort: enriched.dstPort,
    protocol: enriched.protocol,
    geoCountry: enriched.geoCountry,
    geoCity: enriched.geoCity,
    assetCriticality: enriched.assetCriticality,
    processed: "true",
    detectionRunAt: new Date(),
  }).where(eq(rawLogsTable.id, logId));

  // Run detection
  const triggeredAlerts = detectionEngine.evaluate(enriched);

  // Create alerts in DB and broadcast via WebSocket
  for (const ta of triggeredAlerts) {
    try {
      const alertCode = `ALT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const [created] = await db.insert(alertsTable).values({
        alertCode,
        title: ta.title,
        description: ta.description,
        severity: ta.severity as any,
        severityScore: ta.severityScore,
        status: "new",
        ruleId: ta.ruleId,
        ruleName: ta.ruleName,
        mitreTactic: ta.mitreTactic,
        mitreTechniqueId: ta.mitreTechniqueId,
        mitreTechniqueName: ta.mitreTechniqueName,
        mitreSubtechniqueId: ta.mitreSubtechniqueId,
        mitreIds: [ta.mitreTechniqueId].filter(Boolean) as string[],
        sourceIp: ta.sourceIp,
        destIp: ta.destIp,
        hostname: ta.hostname,
        sourceHost: ta.sourceHost,
        triggerEventId: ta.triggerEventId,
        triggerTimestamp: ta.triggerTimestamp,
        context: ta.context as any,
        tags: ta.tags ?? [],
        dedupKey: ta.dedupKey,
        rawLog: { sourceType, sourceHost, logId } as any,
      }).onConflictDoNothing().returning();

      if (created) {
        // Increment trigger count on the rule
        await db.execute(sql`UPDATE rules SET trigger_count = trigger_count + 1, updated_at = NOW() WHERE name = ${ta.ruleName}`);
        broadcastAlert(created);
      }
    } catch {
      // Dedup conflict - already exists
    }
  }
}

export async function processLogsBatch(logs: Array<{ id: string; message: string; source: string; hostname?: string; sourceIp?: string; username?: string }>): Promise<number> {
  let count = 0;
  for (const log of logs) {
    try {
      const sourceType = detectSourceType(log.source, log.message);
      await processLogRecord(
        log.id,
        log.message ?? JSON.stringify(log),
        sourceType,
        log.hostname ?? log.sourceIp ?? "unknown",
        { srcIp: log.sourceIp, userName: log.username },
      );
      count++;
    } catch {}
  }
  return count;
}

function detectSourceType(source: string, message: string): string {
  const s = source.toLowerCase();
  if (s.includes("windows") || s.includes("winlog") || message.includes("<EventID>")) return "windows_eventlog";
  if (s.includes("syslog") || s.includes("linux") || message.match(/^<\d+>/)) return "syslog";
  if (s.includes("firewall") || s.includes("iptables") || message.includes("SRC=")) return "firewall";
  return "generic";
}
