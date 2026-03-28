export interface ParsedEvent {
  sourceType: string;
  sourceHost: string;
  category: string;
  action: string;
  outcome?: string;
  severity: string;
  userName?: string;
  userDomain?: string;
  processName?: string;
  processId?: number;
  processCommandLine?: string;
  parentProcessName?: string;
  srcIp?: string;
  srcPort?: number;
  dstIp?: string;
  dstPort?: number;
  protocol?: string;
  message?: string;
  eventType?: string;
  rawLog?: string;
}
