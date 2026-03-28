import type { ParsedEvent } from "./types";

const EVENT_MAP: Record<number, { category: string; action: string; severity: string }> = {
  4624: { category: "authentication", action: "login_success",        severity: "info" },
  4625: { category: "authentication", action: "login_failure",        severity: "medium" },
  4648: { category: "authentication", action: "explicit_logon",       severity: "low" },
  4672: { category: "authentication", action: "special_privilege_logon", severity: "low" },
  4688: { category: "process",        action: "process_create",       severity: "info" },
  4689: { category: "process",        action: "process_terminate",    severity: "info" },
  4657: { category: "registry",       action: "registry_modify",      severity: "low" },
  4663: { category: "file",           action: "file_access",          severity: "info" },
  7045: { category: "system",         action: "service_install",      severity: "medium" },
  1:    { category: "process",        action: "process_create",       severity: "info" },
};

export function parseWindowsEventLog(raw: string, sourceHost: string): ParsedEvent | null {
  try {
    // Try to extract key fields from XML or JSON
    let eventId: number | undefined;
    let computer: string | undefined;
    let eventData: Record<string, string> = {};

    // XML format
    if (raw.includes("<Event") || raw.includes("<EventID")) {
      eventId = extractXmlInt(raw, "EventID");
      computer = extractXmlText(raw, "Computer");
      // Extract EventData Name=... fields
      const dataRegex = /<Data Name="([^"]+)">([^<]*)<\/Data>/g;
      let m;
      while ((m = dataRegex.exec(raw)) !== null) {
        eventData[m[1]] = m[2];
      }
    } else if (raw.startsWith("{")) {
      // JSON format
      const obj = JSON.parse(raw);
      eventId = obj.EventID ?? obj.event_id;
      computer = obj.Computer ?? obj.computer ?? obj.hostname;
      eventData = obj.EventData ?? obj;
    } else {
      return null;
    }

    if (!eventId) return null;

    const mapping = EVENT_MAP[eventId] ?? {
      category: "system",
      action: `event_${eventId}`,
      severity: "info",
    };

    return {
      sourceType: "windows_eventlog",
      sourceHost: computer || sourceHost,
      category: mapping.category,
      action: mapping.action,
      severity: mapping.severity,
      outcome: [4624, 4672].includes(eventId) ? "success" : eventId === 4625 ? "failure" : undefined,
      userName: eventData.TargetUserName || eventData.User,
      userDomain: eventData.TargetDomainName,
      processName: eventData.NewProcessName || eventData.Image,
      processCommandLine: eventData.CommandLine || eventData.ProcessCommandLine,
      parentProcessName: eventData.ParentImage,
      srcIp: eventData.IpAddress,
      srcPort: eventData.IpPort ? parseInt(eventData.IpPort) : undefined,
      eventType: `EventID-${eventId}`,
      message: `Windows Event ${eventId}: ${mapping.action}`,
      rawLog: raw,
    };
  } catch {
    return null;
  }
}

function extractXmlText(xml: string, tag: string): string | undefined {
  const m = new RegExp(`<${tag}[^>]*>([^<]+)<\/${tag}>`).exec(xml);
  return m?.[1];
}

function extractXmlInt(xml: string, tag: string): number | undefined {
  const v = extractXmlText(xml, tag);
  return v ? parseInt(v) : undefined;
}
