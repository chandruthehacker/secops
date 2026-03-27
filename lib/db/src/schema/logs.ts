import { pgTable, text, uuid, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const rawLogsTable = pgTable("raw_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: text("source").notNull(),
  severity: text("severity").notNull().default("info"),
  eventType: text("event_type"),
  sourceIp: text("source_ip"),
  destIp: text("dest_ip"),
  hostname: text("hostname"),
  username: text("username"),
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
