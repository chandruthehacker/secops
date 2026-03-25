import { create } from 'zustand';
import { Alert, DetectionRule, LogEntry } from '../lib/types';
import { MOCK_ALERTS, MOCK_LOGS, mockRules, mockMitreMatrix } from '../lib/mockGenerator';

interface AppState {
  logs: LogEntry[];
  alerts: Alert[];
  rules: DetectionRule[];
  mitre: typeof mockMitreMatrix;
  sidebarCollapsed: boolean;
  
  // Actions
  toggleSidebar: () => void;
  updateAlertStatus: (id: string, status: Alert['status']) => void;
  assignAlert: (id: string, assignee: string) => void;
  toggleRule: (id: string) => void;
  addRule: (rule: DetectionRule) => void;
}

export const useAppStore = create<AppState>((set) => ({
  logs: MOCK_LOGS,
  alerts: MOCK_ALERTS,
  rules: mockRules,
  mitre: mockMitreMatrix,
  sidebarCollapsed: false,

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  
  updateAlertStatus: (id, status) => set((state) => ({
    alerts: state.alerts.map(a => a.id === id ? { ...a, status, updatedAt: new Date() } : a)
  })),

  assignAlert: (id, assignee) => set((state) => ({
    alerts: state.alerts.map(a => a.id === id ? { ...a, assignee, updatedAt: new Date() } : a)
  })),

  toggleRule: (id) => set((state) => ({
    rules: state.rules.map(r => r.id === id ? { ...r, enabled: !r.enabled, updatedAt: new Date() } : r)
  })),

  addRule: (rule) => set((state) => ({
    rules: [rule, ...state.rules]
  }))
}));
