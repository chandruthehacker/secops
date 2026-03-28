import yaml from "js-yaml";
import crypto from "crypto";
import { db, rulesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { DetectionRule, NormalizedEvent, TriggeredAlert, ThresholdConfig } from "./types";

interface ThresholdState {
  timeframeSecs: number;
  buckets: Map<string, Date[]>;
}

class DetectionEngine {
  private rules: DetectionRule[] = [];
  private thresholdStates: Map<string, ThresholdState> = new Map();
  private lastLoaded: Date = new Date(0);

  async loadRulesFromDb(): Promise<void> {
    const rows = await db.select().from(rulesTable).where(eq(rulesTable.enabled, true));
    this.rules = [];
    for (const row of rows) {
      if (!row.yamlContent) continue;
      try {
        const parsed = yaml.load(row.yamlContent) as any;
        const rule: DetectionRule = {
          id: parsed.id ?? row.id,
          name: parsed.name ?? row.name,
          description: parsed.description ?? row.description ?? "",
          author: parsed.author,
          severity: parsed.severity ?? row.severity ?? "medium",
          type: parsed.type ?? "simple",
          enabled: row.enabled,
          match: parsed.match ?? {},
          filter: parsed.filter,
          threshold: parsed.threshold,
          mitre: parsed.mitre ? {
            tactic: parsed.mitre.tactic,
            techniqueId: parsed.mitre.technique_id,
            techniqueName: parsed.mitre.technique_name,
            subtechniqueId: parsed.mitre.subtechnique_id,
            subtechniqueName: parsed.mitre.subtechnique_name,
          } : undefined,
          alert: {
            titleTemplate: parsed.alert?.title_template ?? row.name,
            contextFields: parsed.alert?.context_fields ?? [],
          },
          tags: parsed.tags ?? row.tags ?? [],
        };
        this.rules.push(rule);

        if (rule.type === "threshold" && rule.threshold) {
          const tfSecs = parseTimeframe(rule.threshold.timeframe);
          if (!this.thresholdStates.has(rule.id)) {
            this.thresholdStates.set(rule.id, { timeframeSecs: tfSecs, buckets: new Map() });
          }
        }
      } catch (err) {
        // skip bad YAML
      }
    }
    this.rules.sort((a, b) => {
      const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
    });
    this.lastLoaded = new Date();
  }

  evaluate(event: NormalizedEvent): TriggeredAlert[] {
    const alerts: TriggeredAlert[] = [];
    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      if (!this.matches(event, rule.match)) continue;
      if (rule.filter && this.matches(event, rule.filter)) continue;

      if (rule.type === "simple") {
        alerts.push(this.createAlert(rule, event, {}));
      } else if (rule.type === "threshold" && rule.threshold) {
        const state = this.thresholdStates.get(rule.id);
        if (!state) continue;
        const keyValue = event[rule.threshold.field];
        if (keyValue == null) continue;
        const groupKey = String(keyValue);
        const [triggered, count] = this.addAndCheck(state, groupKey, event.timestamp, rule.threshold.count);
        if (triggered) {
          const extra: Record<string, any> = { count };
          extra[rule.threshold.field] = groupKey;
          alerts.push(this.createAlert(rule, event, extra));
          this.clearKey(state, groupKey);
        }
      }
    }
    return alerts;
  }

  private matches(event: NormalizedEvent, conditions: Record<string, any>): boolean {
    for (const [key, expected] of Object.entries(conditions)) {
      const parts = key.split("|");
      const fieldName = parts[0];
      const modifiers = parts.slice(1);

      const actual = event[fieldName];
      if (actual == null) return false;
      const actualStr = String(actual).toLowerCase();

      if (modifiers.length === 0) {
        if (Array.isArray(expected)) {
          if (!expected.some(v => String(v).toLowerCase() === actualStr)) return false;
        } else {
          if (actualStr !== String(expected).toLowerCase()) return false;
        }
      } else if (modifiers[0] === "contains" && modifiers[1] === "any") {
        const list = Array.isArray(expected) ? expected : [expected];
        if (!list.some(v => actualStr.includes(String(v).toLowerCase()))) return false;
      } else if (modifiers[0] === "contains") {
        if (Array.isArray(expected)) {
          if (!expected.some(v => actualStr.includes(String(v).toLowerCase()))) return false;
        } else {
          if (!actualStr.includes(String(expected).toLowerCase())) return false;
        }
      } else if (modifiers[0] === "endswith") {
        if (!actualStr.endsWith(String(expected).toLowerCase())) return false;
      } else if (modifiers[0] === "startswith") {
        if (!actualStr.startsWith(String(expected).toLowerCase())) return false;
      } else if (modifiers[0] === "re") {
        const regex = new RegExp(String(expected), "i");
        if (!regex.test(String(actual))) return false;
      }
    }
    return true;
  }

  private createAlert(rule: DetectionRule, event: NormalizedEvent, extra: Record<string, any>): TriggeredAlert {
    const context: Record<string, any> = {};
    for (const field of (rule.alert.contextFields ?? [])) {
      context[field] = event[field];
    }
    Object.assign(context, extra);

    // Build title from template
    const templateVars: Record<string, any> = { ...flattenEvent(event), ...extra };
    const title = rule.alert.titleTemplate.replace(/\{(\w+)\}/g, (_, k) => String(templateVars[k] ?? `{${k}}`));

    // Compute severity score
    const severityScore = this.computeSeverityScore(rule, event);

    // Build dedup key
    const dedupKey = computeDedupKey(rule.id, extra);

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      title,
      description: rule.description,
      severity: rule.severity,
      severityScore,
      mitreTactic: rule.mitre?.tactic,
      mitreTechniqueId: rule.mitre?.techniqueId,
      mitreTechniqueName: rule.mitre?.techniqueName,
      mitreSubtechniqueId: rule.mitre?.subtechniqueId,
      sourceHost: event.sourceHost,
      triggerEventId: event.id,
      triggerTimestamp: event.timestamp,
      context,
      tags: rule.tags ?? [],
      dedupKey,
      sourceIp: event.srcIp,
      destIp: event.dstIp,
      hostname: event.sourceHost,
    };
  }

  private computeSeverityScore(rule: DetectionRule, event: NormalizedEvent): number {
    const base: Record<string, number> = { critical: 90, high: 70, medium: 45, low: 20 };
    let score = base[rule.severity] ?? 30;
    if (event.assetCriticality === "high") score = Math.min(100, score + 15);
    else if (event.assetCriticality === "medium") score = Math.min(100, score + 5);
    if (event.userName && ["administrator", "admin", "root"].includes(event.userName.toLowerCase())) {
      score = Math.min(100, score + 10);
    }
    if (event.geoCountry && event.geoCountry !== "US") score = Math.min(100, score + 5);
    return score;
  }

  private addAndCheck(state: ThresholdState, key: string, ts: Date, threshold: number): [boolean, number] {
    const cutoff = new Date(ts.getTime() - state.timeframeSecs * 1000);
    const existing = (state.buckets.get(key) ?? []).filter(t => t > cutoff);
    existing.push(ts);
    state.buckets.set(key, existing);
    return [existing.length >= threshold, existing.length];
  }

  private clearKey(state: ThresholdState, key: string): void {
    state.buckets.delete(key);
  }

  getRules(): DetectionRule[] {
    return this.rules;
  }
}

function parseTimeframe(tf: string): number {
  const match = tf.match(/^(\d+)([smhd])$/);
  if (!match) return 300;
  const n = parseInt(match[1]);
  const units: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return n * (units[match[2]] ?? 60);
}

function flattenEvent(event: NormalizedEvent): Record<string, any> {
  return {
    source_host: event.sourceHost,
    source_type: event.sourceType,
    category: event.category,
    action: event.action,
    user_name: event.userName,
    src_ip: event.srcIp,
    dst_ip: event.dstIp,
    process_name: event.processName,
    process_command_line: event.processCommandLine,
    parent_process_name: event.parentProcessName,
    geo_country: event.geoCountry,
    ...event,
  };
}

function computeDedupKey(ruleId: string, extra: Record<string, any>): string {
  const str = ruleId + JSON.stringify(Object.entries(extra).sort());
  return crypto.createHash("sha256").update(str).digest("hex").slice(0, 32);
}

export const detectionEngine = new DetectionEngine();
