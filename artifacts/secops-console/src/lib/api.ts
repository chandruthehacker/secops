import axios from "axios";

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

export const authApi = {
  login: (identifier: string, password: string) =>
    apiClient.post<{ accessToken: string; refreshToken: string; user: AuthUser }>("/auth/login", { identifier, password }),
  logout: () => apiClient.post("/auth/logout"),
  me: () => apiClient.get<{ user: AuthUser }>("/auth/me"),
  refresh: (refreshToken: string) =>
    apiClient.post<{ accessToken: string; refreshToken: string; user: AuthUser }>("/auth/refresh", { refreshToken }),
};

export const usersApi = {
  list: () => apiClient.get<{ users: ApiUser[] }>("/users"),
  getById: (id: string) => apiClient.get<{ user: ApiUser }>(`/users/${id}`),
  create: (data: CreateUserPayload) => apiClient.post<{ user: ApiUser }>("/users", data),
  update: (id: string, data: Partial<ApiUser>) => apiClient.patch<{ user: ApiUser }>(`/users/${id}`, data),
  resetPassword: (id: string, newPassword: string) =>
    apiClient.post(`/users/${id}/reset-password`, { newPassword }),
};

export const alertsApi = {
  list: (params?: Record<string, string>) => apiClient.get("/alerts", { params }),
  getById: (id: string) => apiClient.get(`/alerts/${id}`),
  updateStatus: (id: string, status: string) => apiClient.patch(`/alerts/${id}/status`, { status }),
  assign: (id: string, assignedTo: string) => apiClient.patch(`/alerts/${id}/assign`, { assignedTo }),
  addNote: (id: string, content: string, type?: string) =>
    apiClient.post(`/alerts/${id}/timeline`, { content, type }),
};

export const rulesApi = {
  list: () => apiClient.get("/rules"),
  getById: (id: string) => apiClient.get(`/rules/${id}`),
  create: (data: unknown) => apiClient.post("/rules", data),
  update: (id: string, data: unknown) => apiClient.patch(`/rules/${id}`, data),
  delete: (id: string) => apiClient.delete(`/rules/${id}`),
  toggle: (id: string, enabled: boolean) => apiClient.patch(`/rules/${id}/toggle`, { enabled }),
};

export const auditApi = {
  list: (params?: Record<string, string>) => apiClient.get("/audit", { params }),
};

export interface AuthUser {
  userId: string;
  username: string;
  email: string;
  role: "admin" | "soc_l2" | "soc_l1" | "viewer";
  displayName?: string | null;
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
