import { parseSyslog } from "./syslog";
import { parseWindowsEventLog } from "./windows-eventlog";
import { parseFirewall } from "./firewall";
import type { ParsedEvent } from "./types";

export type SourceType = "syslog" | "windows_eventlog" | "firewall" | "generic";

export function parseLog(raw: string, sourceType: string, sourceHost: string): ParsedEvent | null {
  switch (sourceType) {
    case "syslog":
      return parseSyslog(raw, sourceHost);
    case "windows_eventlog":
      return parseWindowsEventLog(raw, sourceHost);
    case "firewall":
      return parseFirewall(raw, sourceHost);
    default:
      return parseGeneric(raw, sourceHost, sourceType);
  }
}

function parseGeneric(raw: string, sourceHost: string, sourceType: string): ParsedEvent {
  let obj: Record<string, any> = {};
  try { obj = JSON.parse(raw); } catch {}

  return {
    sourceType,
    sourceHost: obj.hostname ?? obj.host ?? sourceHost,
    category: obj.category ?? "system",
    action: obj.action ?? obj.event_type ?? obj.eventType ?? "generic_event",
    outcome: obj.outcome,
    severity: obj.severity ?? "info",
    userName: obj.username ?? obj.user,
    srcIp: obj.source_ip ?? obj.src_ip ?? obj.sourceIp,
    dstIp: obj.dest_ip ?? obj.dst_ip ?? obj.destIp,
    processName: obj.process ?? obj.process_name,
    processCommandLine: obj.command_line ?? obj.process_command_line,
    message: obj.message ?? obj.msg ?? raw.slice(0, 500),
    rawLog: raw,
    eventType: obj.event_type ?? sourceType,
  };
}

export { ParsedEvent };
