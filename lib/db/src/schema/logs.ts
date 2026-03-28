import { pgTable, text, uuid, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const rawLogsTable = pgTable("raw_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: text("source").notNull(),
  severity: text("severity").notNull().default("info"),
  eventType: text("event_type"),
  category: text("category"),
  action: text("action"),
  outcome: text("outcome"),
  sourceIp: text("source_ip"),
  destIp: text("dest_ip"),
  srcPort: integer("src_port"),
  dstPort: integer("dst_port"),
  protocol: text("protocol"),
  hostname: text("hostname"),
  sourceHost: text("source_host"),
  username: text("username"),
  processName: text("process_name"),
  processId: integer("process_id"),
  processCommandLine: text("process_command_line"),
  parentProcessName: text("parent_process_name"),
  geoCountry: text("geo_country"),
  geoCity: text("geo_city"),
  assetCriticality: text("asset_criticality"),
  message: text("message"),
  rawData: jsonb("raw_data"),
  processed: text("processed").notNull().default("false"),
  detectionRunAt: timestamp("detection_run_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRawLogSchema = createInsertSchema(rawLogsTable).omit({
  id: true,
  processed: true,
  detectionRunAt: true,
  createdAt: true,
});

export type RawLog = typeof rawLogsTable.$inferSelect;
export type InsertRawLog = z.infer<typeof insertRawLogSchema>;
