export interface NormalizedEvent {
  id?: string;
  timestamp: Date;
  ingestedAt?: Date;
  sourceType: string;
  sourceHost: string;
  category: string;
  action: string;
  outcome?: string;
  severity: string;
  userName?: string;
  userDomain?: string;
  userId?: string;
  processName?: string;
  processId?: number;
  processCommandLine?: string;
  parentProcessName?: string;
  srcIp?: string;
  srcPort?: number;
  dstIp?: string;
  dstPort?: number;
  protocol?: string;
  geoCountry?: string;
  geoCity?: string;
  assetCriticality?: string;
  assetTags?: string[];
  rawLog?: string;
  message?: string;
  [key: string]: any;
}

export interface MitreMapping {
  tactic: string;
  techniqueId: string;
  techniqueName: string;
  subtechniqueId?: string;
  subtechniqueName?: string;
}

export interface ThresholdConfig {
  field: string;
  count: number;
  timeframe: string;
}

export interface AlertConfig {
  titleTemplate: string;
  contextFields?: string[];
}

export interface DetectionRule {
  id: string;
  name: string;
  description: string;
  author?: string;
  severity: "critical" | "high" | "medium" | "low";
  type: "simple" | "threshold";
  enabled: boolean;
  match: Record<string, any>;
  filter?: Record<string, any>;
  threshold?: ThresholdConfig;
  mitre?: MitreMapping;
  alert: AlertConfig;
  tags?: string[];
}

export interface TriggeredAlert {
  ruleId: string;
  ruleName: string;
  title: string;
  description?: string;
  severity: string;
  severityScore: number;
  mitreTactic?: string;
  mitreTechniqueId?: string;
  mitreTechniqueName?: string;
  mitreSubtechniqueId?: string;
  sourceHost?: string;
  triggerEventId?: string;
  triggerTimestamp: Date;
  context: Record<string, any>;
  tags?: string[];
  dedupKey?: string;
  sourceIp?: string;
  destIp?: string;
  hostname?: string;
}
