import { create } from 'zustand';
import { Alert, AlertStatus, DetectionRule, LogEntry } from '../lib/types';
import { MOCK_ALERTS, MOCK_LOGS, mockRules, mockMitreMatrix } from '../lib/mockGenerator';
import { v4 as uuidv4 } from 'uuid';

interface AppState {
  logs: LogEntry[];
  alerts: Alert[];
  rules: DetectionRule[];
  mitre: typeof mockMitreMatrix;
  sidebarCollapsed: boolean;

  toggleSidebar: () => void;
  updateAlertStatus: (id: string, status: AlertStatus) => void;
  assignAlert: (id: string, assignee: string) => void;
  addNoteToAlert: (id: string, note: string) => void;
  toggleRule: (id: string) => void;
  addRule: (rule: DetectionRule) => void;
  deleteRule: (id: string) => void;
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
    alerts: state.alerts.map(a => a.id === id ? { ...a, assignee: assignee || undefined, updatedAt: new Date() } : a)
  })),

  addNoteToAlert: (id, note) => set((state) => ({
    alerts: state.alerts.map(a => a.id === id ? {
      ...a,
      updatedAt: new Date(),
      timeline: [
        ...a.timeline,
        {
          id: uuidv4(),
          timestamp: new Date(),
          action: 'Analyst Note Added',
          user: 'Alice (L1)',
          note,
        },
      ]
    } : a)
  })),

  toggleRule: (id) => set((state) => ({
    rules: state.rules.map(r => r.id === id ? { ...r, enabled: !r.enabled, updatedAt: new Date() } : r)
  })),

  addRule: (rule) => set((state) => ({
    rules: [rule, ...state.rules]
  })),

  deleteRule: (id) => set((state) => ({
    rules: state.rules.filter(r => r.id !== id)
  })),
}));
