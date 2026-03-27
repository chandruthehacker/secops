import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi, type AuthUser } from "../lib/api";

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  hasRole: (...roles: AuthUser["role"][]) => boolean;
  hasMinRole: (minRole: AuthUser["role"]) => boolean;
}

const ROLE_LEVEL: Record<AuthUser["role"], number> = {
  admin: 4,
  soc_l2: 3,
  soc_l1: 2,
  viewer: 1,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (identifier, password) => {
        set({ isLoading: true });
        try {
          const { data } = await authApi.login(identifier, password);
          localStorage.setItem("access_token", data.accessToken);
          localStorage.setItem("refresh_token", data.refreshToken);
          set({ user: data.user, isAuthenticated: true, isLoading: false });
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
        if (!token) return;
        try {
          const { data } = await authApi.me();
          set({ user: data.user, isAuthenticated: true });
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          set({ user: null, isAuthenticated: false });
        }
      },

      hasRole: (...roles) => {
        const user = get().user;
        return !!user && roles.includes(user.role);
      },

      hasMinRole: (minRole) => {
        const user = get().user;
        if (!user) return false;
        return ROLE_LEVEL[user.role] >= ROLE_LEVEL[minRole];
      },
    }),
    {
      name: "secops-auth",
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
