import pkg from "pg";

const { Pool } = pkg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL not set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const RULES = [
  {
    name: "Brute Force Login Attempt",
    description: "Detects multiple failed login attempts from a single source IP within 5 minutes",
    severity: "high",
    mitre_tactic: "Credential Access",
    mitre_ids: ["T1110", "T1110.001"],
    tags: ["credential_attack", "external_threat"],
    yaml_content: `id: "DET-001"
name: "Brute Force Login Attempt"
description: "Detects multiple failed login attempts from a single source IP within 5 minutes"
author: "SecOps Team"
severity: high
type: threshold
enabled: true

match:
  category: authentication
  action: login_failure
  outcome: failure

threshold:
  field: srcIp
  count: 5
  timeframe: 5m

filter:
  userName:
    - "healthcheck"
    - "monitoring"

mitre:
  tactic: "Credential Access"
  technique_id: "T1110"
  technique_name: "Brute Force"
  subtechnique_id: "T1110.001"
  subtechnique_name: "Password Guessing"

alert:
  title_template: "Brute Force: {count} failed logins from {srcIp}"
  context_fields:
    - srcIp
    - userName
    - sourceHost
    - geoCountry

tags:
  - "credential_attack"
  - "external_threat"`,
  },
  {
    name: "Suspicious PowerShell Execution",
    description: "Detects PowerShell with encoded commands or download cradles",
    severity: "high",
    mitre_tactic: "Execution",
    mitre_ids: ["T1059", "T1059.001"],
    tags: ["execution", "powershell"],
    yaml_content: `id: "DET-002"
name: "Suspicious PowerShell Execution"
description: "Detects PowerShell with encoded commands or download cradles"
author: "SecOps Team"
severity: high
type: simple
enabled: true

match:
  category: process
  action: process_create
  processName|endswith: "powershell.exe"
  processCommandLine|contains|any:
    - "-EncodedCommand"
    - "-enc "
    - "FromBase64String"
    - "Net.WebClient"
    - "DownloadString"
    - "DownloadFile"
    - "Invoke-Expression"
    - "IEX"
    - "Start-BitsTransfer"

filter:
  processCommandLine|contains:
    - "WindowsUpdate"

mitre:
  tactic: "Execution"
  technique_id: "T1059"
  technique_name: "Command and Scripting Interpreter"
  subtechnique_id: "T1059.001"
  subtechnique_name: "PowerShell"

alert:
  title_template: "Suspicious PowerShell on {sourceHost} by {userName}"
  context_fields:
    - sourceHost
    - userName
    - processCommandLine
    - parentProcessName

tags:
  - "execution"
  - "powershell"`,
  },
  {
    name: "PsExec-style Lateral Movement",
    description: "Detects service installation typical of PsExec lateral movement",
    severity: "critical",
    mitre_tactic: "Lateral Movement",
    mitre_ids: ["T1570"],
    tags: ["lateral_movement", "persistence"],
    yaml_content: `id: "DET-005"
name: "PsExec-style Lateral Movement"
description: "Detects service installation typical of PsExec lateral movement"
author: "SecOps Team"
severity: critical
type: simple
enabled: true

match:
  category: system
  action: service_install
  processName|contains|any:
    - "PSEXESVC"
    - "psexec"
    - "csexec"
    - "paexec"

mitre:
  tactic: "Lateral Movement"
  technique_id: "T1570"
  technique_name: "Lateral Tool Transfer"

alert:
  title_template: "PsExec-style service on {sourceHost}"
  context_fields:
    - sourceHost
    - processName
    - userName

tags:
  - "lateral_movement"
  - "persistence"`,
  },
  {
    name: "SSH Brute Force",
    description: "Detects multiple SSH login failures from a single IP",
    severity: "high",
    mitre_tactic: "Credential Access",
    mitre_ids: ["T1110"],
    tags: ["credential_attack", "ssh"],
    yaml_content: `id: "DET-003"
name: "SSH Brute Force"
description: "Detects multiple SSH login failures from a single IP address within 5 minutes"
author: "SecOps Team"
severity: high
type: threshold
enabled: true

match:
  category: authentication
  action: login_failure
  sourceType: syslog

threshold:
  field: srcIp
  count: 10
  timeframe: 5m

mitre:
  tactic: "Credential Access"
  technique_id: "T1110"
  technique_name: "Brute Force"

alert:
  title_template: "SSH Brute Force: {count} failures from {srcIp}"
  context_fields:
    - srcIp
    - userName
    - sourceHost

tags:
  - "credential_attack"
  - "ssh"`,
  },
  {
    name: "Firewall Connection Blocked – Repeated",
    description: "Detects repeated blocked connections from same source, possible port scan or attack",
    severity: "medium",
    mitre_tactic: "Discovery",
    mitre_ids: ["T1046"],
    tags: ["network", "scan"],
    yaml_content: `id: "DET-004"
name: "Firewall Connection Blocked – Repeated"
description: "Detects many blocked connections from a single source, possible port scan"
author: "SecOps Team"
severity: medium
type: threshold
enabled: true

match:
  category: firewall
  action: connection_blocked

threshold:
  field: srcIp
  count: 20
  timeframe: 1m

mitre:
  tactic: "Discovery"
  technique_id: "T1046"
  technique_name: "Network Service Discovery"

alert:
  title_template: "Port scan detected: {count} blocked connections from {srcIp}"
  context_fields:
    - srcIp
    - sourceHost
    - dstPort

tags:
  - "network"
  - "scan"`,
  },
];

const SAMPLE_ASSETS = [
  { hostname: "DC01.corp.local", ip: "10.0.0.1",  os: "windows", criticality: "high",   tags: ["domain-controller", "prod"],    owner: "Infrastructure Team", department: "IT" },
  { hostname: "WEB01.corp.local", ip: "10.0.0.10", os: "linux",   criticality: "high",   tags: ["web-server", "prod", "dmz"],     owner: "DevOps Team",          department: "Engineering" },
  { hostname: "APP02.corp.local", ip: "10.0.0.20", os: "linux",   criticality: "medium", tags: ["app-server", "prod"],            owner: "DevOps Team",          department: "Engineering" },
  { hostname: "WS042.corp.local", ip: "10.0.1.42", os: "windows", criticality: "low",    tags: ["workstation", "dev"],            owner: "Security Team",        department: "IT" },
  { hostname: "FW01.corp.local",  ip: "10.0.0.254",os: "network", criticality: "high",   tags: ["firewall", "network", "prod"],   owner: "Network Team",         department: "IT" },
  { hostname: "DB01.corp.local",  ip: "10.0.0.30", os: "linux",   criticality: "high",   tags: ["database", "prod", "sensitive"], owner: "DBA Team",             department: "Engineering" },
];

async function seedDetectionRules() {
  const client = await pool.connect();
  try {
    console.log("Seeding detection rules...");
    for (const rule of RULES) {
      const exists = await client.query(`SELECT id FROM rules WHERE name = $1`, [rule.name]);
      if (exists.rows.length > 0) {
        await client.query(
          `UPDATE rules SET description=$1, severity=$2, yaml_content=$3, mitre_tactic=$4, mitre_ids=$5, tags=$6, updated_at=NOW() WHERE name=$7`,
          [rule.description, rule.severity, rule.yaml_content, rule.mitre_tactic, rule.mitre_ids, rule.tags, rule.name]
        );
      } else {
        await client.query(
          `INSERT INTO rules (id, name, description, severity, enabled, yaml_content, mitre_tactic, mitre_ids, tags, trigger_count, false_positive_rate, last_modified_at, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, true, $4, $5, $6, $7, 0, 0, NOW(), NOW(), NOW())`,
          [rule.name, rule.description, rule.severity, rule.yaml_content, rule.mitre_tactic, rule.mitre_ids, rule.tags]
        );
      }
      console.log(`✓ Rule: ${rule.name}`);
    }

    console.log("\nSeeding sample assets...");
    for (const asset of SAMPLE_ASSETS) {
      await client.query(
        `INSERT INTO assets (id, hostname, ip, os, criticality, tags, owner, department, last_seen, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), NOW())
         ON CONFLICT (hostname) DO UPDATE SET
           ip = EXCLUDED.ip, os = EXCLUDED.os, criticality = EXCLUDED.criticality,
           tags = EXCLUDED.tags, owner = EXCLUDED.owner, department = EXCLUDED.department,
           last_seen = NOW(), updated_at = NOW()`,
        [asset.hostname, asset.ip, asset.os, asset.criticality, asset.tags, asset.owner, asset.department]
      );
      console.log(`✓ Asset: ${asset.hostname} (${asset.criticality})`);
    }

    console.log("\n✅ Seed complete!");
  } finally {
    client.release();
    await pool.end();
  }
}

seedDetectionRules().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
