import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi, type AuthUser } from "../lib/api";

export type Permission =
  | "alerts:view"
  | "alerts:triage"
  | "alerts:assign"
  | "alerts:close"
  | "alerts:note"
  | "rules:view"
  | "rules:toggle"
  | "rules:write"
  | "rules:delete"
  | "rules:test"
  | "ingest:write"
  | "ingest:pending"
  | "users:manage"
  | "audit:view"
  | "reports:view";

type UserRole = AuthUser["role"];

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    "alerts:view", "alerts:triage", "alerts:assign", "alerts:close", "alerts:note",
    "rules:view", "rules:toggle", "rules:write", "rules:delete", "rules:test",
    "ingest:write", "ingest:pending",
    "users:manage",
    "audit:view",
    "reports:view",
  ],
  soc_manager: [
    "alerts:view", "alerts:triage", "alerts:assign", "alerts:close", "alerts:note",
    "rules:view",
    "ingest:write", "ingest:pending",
    "audit:view",
    "reports:view",
  ],
  detection_engineer: [
    "alerts:view", "alerts:note",
    "rules:view", "rules:toggle", "rules:write", "rules:delete", "rules:test",
    "ingest:write", "ingest:pending",
    "reports:view",
  ],
  soc_l2: [
    "alerts:view", "alerts:triage", "alerts:assign", "alerts:close", "alerts:note",
    "rules:view", "rules:toggle", "rules:write", "rules:test",
    "ingest:write", "ingest:pending",
    "reports:view",
  ],
  soc_l1: [
    "alerts:view", "alerts:triage", "alerts:note",
    "rules:view",
    "reports:view",
  ],
  viewer: [
    "alerts:view",
    "rules:view",
    "reports:view",
  ],
};

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
  can: (permission: Permission) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isInitialized: false,
      isLoading: false,

      login: async (identifier, password) => {
        set({ isLoading: true });
        try {
          const { data } = await authApi.login(identifier, password);
          localStorage.setItem("access_token", data.accessToken);
          localStorage.setItem("refresh_token", data.refreshToken);
          set({ user: data.user, isAuthenticated: true, isInitialized: true, isLoading: false });
        } catch (err: any) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {}
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        set({ user: null, isAuthenticated: false });
      },

      restoreSession: async () => {
        const token = localStorage.getItem("access_token");
        if (!token) {
          set({ isInitialized: true });
          return;
        }
        try {
          const { data } = await authApi.me();
          set({ user: data.user, isAuthenticated: true, isInitialized: true });
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          set({ user: null, isAuthenticated: false, isInitialized: true });
        }
      },

      hasRole: (...roles) => {
        const user = get().user;
        return !!user && roles.includes(user.role);
      },

      can: (permission) => {
        const user = get().user;
        if (!user) return false;
        return (ROLE_PERMISSIONS[user.role] ?? []).includes(permission);
      },
    }),
    {
      name: "secops-auth",
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
