import axios from "axios";
import type { Alert, AlertStatus, LogEntry, DetectionRule } from "./types";

const BASE = "/api";

export const apiClient = axios.create({
  baseURL: BASE,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE}/auth/refresh`, { refreshToken });
          localStorage.setItem("access_token", data.accessToken);
          localStorage.setItem("refresh_token", data.refreshToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return apiClient(original);
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
        }
      } else {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ─── Normalizers ────────────────────────────────────────────────────────────

export function normalizeAlert(raw: any): Alert {
  return {
    id: raw.id,
    title: raw.title ?? "Untitled Alert",
    severity: raw.severity,
    status: raw.status,
    assignee: raw.assignedToName ?? (raw.assignedTo ? raw.assignedTo : undefined),
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
    mitreIds: raw.mitreIds ?? [],
    mitreTactics: raw.mitreTactic ? [raw.mitreTactic] : [],
    ruleId: raw.ruleId ?? "",
    ruleName: raw.ruleName ?? "Detection Alert",
    affectedAssets: [raw.hostname, raw.sourceIp, raw.destIp].filter(Boolean),
    relatedEventIds: [],
    description: raw.description ?? "No description provided.",
    timeline: (raw.timeline ?? []).map((t: any) => ({
      id: t.id,
      timestamp: new Date(t.createdAt),
      action: t.type === "note" ? "Analyst Note Added" : (t.type ?? "System Event"),
      user: t.authorName ?? undefined,
      note: t.type === "note" ? t.content : t.content,
    })),
    aiSummary: raw.description ?? "No AI analysis available for this alert.",
  };
}

export function normalizeLog(raw: any): LogEntry {
  return {
    id: raw.id,
    timestamp: new Date(raw.createdAt),
    source: raw.source,
    severity: raw.severity,
    eventType: raw.eventType ?? "unknown",
    sourceIp: raw.sourceIp ?? "0.0.0.0",
    destIp: raw.destIp ?? "0.0.0.0",
    user: raw.username ?? undefined,
    message: raw.message ?? "",
    rawLog: raw.rawData ? JSON.stringify(raw.rawData) : "",
    parsed: raw.rawData ?? {},
    tags: [],
    ruleMatched: undefined,
    alertId: undefined,
  };
}

export function normalizeRule(raw: any): DetectionRule {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? "",
    severity: raw.severity,
    enabled: raw.enabled,
    conditions: [],
    yaml: raw.yamlContent ?? "",
    mitreIds: raw.mitreIds ?? [],
    mitreTactics: raw.mitreTactic ? [raw.mitreTactic] : [],
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
    author: raw.createdBy ?? "system",
    triggerCount: raw.triggerCount ?? 0,
  };
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (identifier: string, password: string) =>
    apiClient.post<{ accessToken: string; refreshToken: string; user: AuthUser }>("/auth/login", { identifier, password }),
  logout: () => apiClient.post("/auth/logout"),
  me: () => apiClient.get<{ user: AuthUser }>("/auth/me"),
  refresh: (refreshToken: string) =>
    apiClient.post<{ accessToken: string; refreshToken: string; user: AuthUser }>("/auth/refresh", { refreshToken }),
};

// ─── Me (self-service profile) ───────────────────────────────────────────────

export const meApi = {
  getProfile: () => apiClient.get<{ profile: MeProfile }>("/me"),
  updateProfile: (data: { displayName?: string; jobTitle?: string }) =>
    apiClient.patch<{ profile: MeProfile }>("/me", data),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.post<{ message: string }>("/me/password", { currentPassword, newPassword }),
  getSettings: () => apiClient.get<{ settings: UserSettings }>("/me/settings"),
  updateSettings: (patch: Partial<UserSettings>) =>
    apiClient.patch<{ settings: UserSettings }>("/me/settings", patch),
  listApiKeys: () => apiClient.get<{ keys: ApiKeyRecord[] }>("/me/api-keys"),
  createApiKey: (name: string, scopes?: string[]) =>
    apiClient.post<{ key: ApiKeyRecord & { rawKey: string } }>("/me/api-keys", { name, scopes }),
  deleteApiKey: (id: string) => apiClient.delete(`/me/api-keys/${id}`),
};

// ─── Users ───────────────────────────────────────────────────────────────────

export const usersApi = {
  list: () => apiClient.get<{ users: ApiUser[] }>("/users"),
  getById: (id: string) => apiClient.get<{ user: ApiUser }>(`/users/${id}`),
  create: (data: CreateUserPayload) => apiClient.post<{ user: ApiUser }>("/users", data),
  update: (id: string, data: Partial<ApiUser>) => apiClient.patch<{ user: ApiUser }>(`/users/${id}`, data),
  resetPassword: (id: string, newPassword: string) =>
    apiClient.post(`/users/${id}/reset-password`, { newPassword }),
};

// ─── Alerts ──────────────────────────────────────────────────────────────────

export const alertsApi = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get<{ alerts: any[]; total: number; page: number; limit: number }>("/alerts", { params }),
  getById: (id: string) => apiClient.get<{ alert: any }>(`/alerts/${id}`),
  updateStatus: (id: string, status: AlertStatus, resolutionNotes?: string) =>
    apiClient.patch<{ alert: any }>(`/alerts/${id}/status`, { status, resolutionNotes }),
  assign: (id: string, assignedTo: string) =>
    apiClient.patch<{ alert: any }>(`/alerts/${id}/assign`, { assignedTo }),
  addNote: (id: string, content: string, type?: string) =>
    apiClient.post<{ entry: any }>(`/alerts/${id}/timeline`, { content, type }),
  bulkUpdate: (ids: string[], status: AlertStatus, resolutionNotes?: string) =>
    apiClient.post<{ updated: number }>("/alerts/bulk-update", { ids, status, resolutionNotes }),
  relatedEvents: (id: string, minutesBefore = 10, minutesAfter = 5) =>
    apiClient.get<{ events: any[]; total: number }>(`/alerts/${id}/related-events`, { params: { minutesBefore, minutesAfter } }),
};

// ─── Rules ───────────────────────────────────────────────────────────────────

export const rulesApi = {
  list: () => apiClient.get<{ rules: any[] }>("/rules"),
  getById: (id: string) => apiClient.get(`/rules/${id}`),
  create: (data: unknown) => apiClient.post("/rules", data),
  update: (id: string, data: unknown) => apiClient.patch(`/rules/${id}`, data),
  delete: (id: string) => apiClient.delete(`/rules/${id}`),
  toggle: (id: string, enabled: boolean) => apiClient.patch(`/rules/${id}/toggle`, { enabled }),
};

// ─── Logs ────────────────────────────────────────────────────────────────────

export const logsApi = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get<{ logs: any[]; total: number; page: number; limit: number }>("/logs", { params }),
};

// ─── Ingest ──────────────────────────────────────────────────────────────────

export const ingestApi = {
  single: (data: {
    source: string;
    severity?: string;
    eventType?: string;
    sourceIp?: string;
    destIp?: string;
    hostname?: string;
    username?: string;
    message?: string;
    rawData?: unknown;
  }) => apiClient.post<{ logId: string }>("/ingest-log", data),

  bulk: (logs: Record<string, unknown>[]) =>
    apiClient.post<{ inserted: number }>("/ingest/bulk", { logs }),
};

// ─── Assets ──────────────────────────────────────────────────────────────────

export const assetsApi = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get<{ assets: any[]; total: number; page: number; limit: number }>("/assets", { params }),
  getById: (id: string) => apiClient.get<{ asset: any }>(`/assets/${id}`),
  create: (data: {
    hostname: string;
    ip?: string;
    os?: string;
    criticality?: string;
    tags?: string[];
    owner?: string;
    department?: string;
    description?: string;
  }) => apiClient.post<{ asset: any }>("/assets", data),
  update: (id: string, data: Record<string, any>) => apiClient.put<{ asset: any }>(`/assets/${id}`, data),
  delete: (id: string) => apiClient.delete(`/assets/${id}`),
};

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const dashboardApi = {
  stats: () => apiClient.get<DashboardStats>("/dashboard/stats"),
};

// ─── Audit ───────────────────────────────────────────────────────────────────

export const auditApi = {
  list: (params?: Record<string, string>) => apiClient.get("/audit", { params }),
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  userId: string;
  username: string;
  email: string;
  role: "admin" | "soc_manager" | "detection_engineer" | "soc_l2" | "soc_l1" | "viewer";
  displayName?: string | null;
}

export interface MeProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  displayName?: string | null;
  jobTitle?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface UserSettings {
  timezone: string;
  notifications: {
    emailAlerts: boolean;
    emailDigest: boolean;
    slackIntegration: boolean;
    criticalOnly: boolean;
    newAlerts: boolean;
    assignedAlerts: boolean;
    ruleMatches: boolean;
    weeklyReport: boolean;
  };
  security: {
    mfaEnabled: boolean;
    sessionTimeout: number;
  };
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
}

export interface ApiUser {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  displayName?: string;
  lastLoginAt?: string;
  createdAt: string;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  role: string;
  displayName?: string;
}

export interface DashboardStats {
  alerts: {
    total: number;
    last24h: number;
    byStatus: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  logs: {
    total: number;
    bySource: Record<string, number>;
  };
  rules: {
    active: number;
  };
  recentAlerts: Array<{
    id: string;
    alertCode: string;
    title: string;
    severity: string;
    status: string;
    createdAt: string;
  }>;
  alertTrend: Array<{ hour: string; count: number }>;
}
