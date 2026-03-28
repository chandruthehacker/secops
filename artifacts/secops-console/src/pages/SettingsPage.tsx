import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { meApi } from '@/lib/api';
import type { UserSettings } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Settings, User, Bell, Shield, Key, CheckCircle2, Eye, EyeOff, Plus, Copy, CheckCheck, Trash2, Loader2 } from 'lucide-react';

type Tab = 'profile' | 'notifications' | 'security' | 'apikeys';
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'apikeys', label: 'API Keys', icon: Key },
];

function Toast({ msg }: { msg: string }) {
  return (
    <div className="fixed top-6 right-6 z-50 bg-card border border-primary/30 text-foreground px-4 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top-4 duration-200">
      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /> {msg}
    </div>
  );
}

function ProfileTab({ onSave }: { onSave: (msg: string) => void }) {
  const qc = useQueryClient();
  const user = useAuthStore(s => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ['me-profile'],
    queryFn: () => meApi.getProfile().then(r => r.data.profile),
  });

  const [displayName, setDisplayName] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  useEffect(() => {
    if (data) {
      setDisplayName(data.displayName ?? '');
      setJobTitle(data.jobTitle ?? '');
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => meApi.updateProfile({ displayName, jobTitle }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me-profile'] });
      onSave('Profile settings saved');
    },
    onError: () => onSave('Failed to save profile'),
  });

  const initials = (displayName || user?.username || 'U').slice(0, 2).toUpperCase();

  if (isLoading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground mb-6">Profile Settings</h2>
      <div className="flex items-center gap-6 mb-8">
        <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/50 flex items-center justify-center text-2xl font-bold text-primary shadow-[0_0_15px_rgba(59,130,246,0.3)]">
          {initials}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Avatar is generated from your name initials</p>
          <p className="text-xs text-muted-foreground mt-1">{data?.email}</p>
        </div>
      </div>
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            className="w-full bg-input border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="Your display name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Email Address</label>
          <input
            type="email"
            defaultValue={data?.email ?? ''}
            disabled
            className="w-full bg-secondary/50 border border-border/50 rounded-lg px-4 py-2 text-muted-foreground cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground mt-1">Contact your admin to change your email.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Role / Title</label>
          <input
            type="text"
            value={jobTitle}
            onChange={e => setJobTitle(e.target.value)}
            className="w-full bg-input border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="e.g. Senior Threat Hunter"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">System Role</label>
          <input
            type="text"
            value={data?.role ?? ''}
            disabled
            className="w-full bg-secondary/50 border border-border/50 rounded-lg px-4 py-2 text-muted-foreground cursor-not-allowed capitalize"
          />
          <p className="text-xs text-muted-foreground mt-1">Roles are managed by your administrator.</p>
        </div>
        <div className="pt-4 border-t border-border flex justify-end">
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2"
          >
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationsTab({ onSave }: { onSave: (msg: string) => void }) {
  const qc = useQueryClient();

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['me-settings'],
    queryFn: () => meApi.getSettings().then(r => r.data.settings),
  });

  const [notifs, setNotifs] = useState<UserSettings['notifications']>({
    emailAlerts: true, emailDigest: false, slackIntegration: false,
    criticalOnly: false, newAlerts: true, assignedAlerts: true,
    ruleMatches: false, weeklyReport: true,
  });

  useEffect(() => {
    if (settingsData?.notifications) setNotifs(settingsData.notifications);
  }, [settingsData]);

  const mutation = useMutation({
    mutationFn: () => meApi.updateSettings({ notifications: notifs }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me-settings'] });
      onSave('Notification preferences saved');
    },
  });

  const toggle = (k: keyof UserSettings['notifications']) => () => setNotifs(n => ({ ...n, [k]: !n[k] }));
  const Toggle = ({ id }: { id: keyof UserSettings['notifications'] }) => (
    <button onClick={toggle(id)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${notifs[id] ? 'bg-primary' : 'bg-secondary border border-border'}`}>
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${notifs[id] ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );

  if (isLoading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground mb-6">Notification Preferences</h2>
      <div className="space-y-6">
        {[
          { label: 'Email Alerts', desc: 'Receive alert notifications via email', id: 'emailAlerts' as const },
          { label: 'Daily Digest', desc: 'Get a summary of daily SOC activity', id: 'emailDigest' as const },
          { label: 'Slack Integration', desc: 'Push alerts to your Slack workspace', id: 'slackIntegration' as const },
          { label: 'Critical Alerts Only', desc: 'Only receive notifications for critical severity', id: 'criticalOnly' as const },
          { label: 'New Alert Assignments', desc: 'Notify when an alert is assigned to you', id: 'assignedAlerts' as const },
          { label: 'Rule Match Notifications', desc: 'Alert when detection rules fire', id: 'ruleMatches' as const },
          { label: 'Weekly Report', desc: 'Weekly SOC performance and coverage report', id: 'weeklyReport' as const },
        ].map(item => (
          <div key={item.id} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
            <div>
              <div className="text-sm font-medium text-foreground">{item.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
            </div>
            <Toggle id={item.id} />
          </div>
        ))}
      </div>
      <div className="pt-4 mt-2 flex justify-end">
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2"
        >
          {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Preferences
        </button>
      </div>
    </div>
  );
}

function SecurityTab({ onSave }: { onSave: (msg: string) => void }) {
  const qc = useQueryClient();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState('');

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['me-settings'],
    queryFn: () => meApi.getSettings().then(r => r.data.settings),
  });

  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('8');

  useEffect(() => {
    if (settingsData?.security) {
      setMfaEnabled(settingsData.security.mfaEnabled);
      setSessionTimeout(String(settingsData.security.sessionTimeout));
    }
  }, [settingsData]);

  const pwMutation = useMutation({
    mutationFn: () => meApi.changePassword(currentPw, newPw),
    onSuccess: () => {
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setPwError('');
      onSave('Password updated successfully');
    },
    onError: (err: any) => {
      setPwError(err.response?.data?.error ?? 'Failed to update password');
    },
  });

  const secMutation = useMutation({
    mutationFn: () => meApi.updateSettings({ security: { mfaEnabled, sessionTimeout: Number(sessionTimeout) } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me-settings'] });
      onSave('Security settings updated');
    },
  });

  const handlePasswordSave = () => {
    setPwError('');
    if (!currentPw || !newPw) { setPwError('All password fields are required'); return; }
    if (newPw !== confirmPw) { setPwError('New passwords do not match'); return; }
    if (newPw.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    pwMutation.mutate();
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground mb-6">Security Settings</h2>
      <div className="space-y-6">
        <div className="bg-secondary/30 border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4">Change Password</h3>
          {pwError && <div className="mb-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{pwError}</div>}
          <div className="space-y-4">
            {[['Current Password', currentPw, setCurrentPw], ['New Password', newPw, setNewPw], ['Confirm New Password', confirmPw, setConfirmPw]].map(([label, val, setter]) => (
              <div key={label as string}>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">{label as string}</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={val as string}
                    onChange={e => (setter as Function)(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-input border border-border rounded-lg px-4 py-2 pr-10 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  {label === 'Current Password' && (
                    <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handlePasswordSave}
              disabled={pwMutation.isPending}
              className="px-5 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 text-sm disabled:opacity-50 flex items-center gap-2"
            >
              {pwMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Update Password
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between py-4 border-b border-border">
          <div>
            <div className="font-medium text-foreground">Multi-Factor Authentication</div>
            <div className="text-xs text-muted-foreground mt-0.5">{mfaEnabled ? 'MFA is enabled' : 'Enable for stronger security'}</div>
          </div>
          <button onClick={() => setMfaEnabled(!mfaEnabled)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${mfaEnabled ? 'bg-primary' : 'bg-secondary border border-border'}`}>
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${mfaEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Session Timeout</label>
          <select value={sessionTimeout} onChange={e => setSessionTimeout(e.target.value)} className="w-full max-w-xs bg-input border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary appearance-none">
            {['1', '2', '4', '8', '24'].map(h => <option key={h} value={h}>{h} hour{h !== '1' ? 's' : ''}</option>)}
          </select>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => secMutation.mutate()}
            disabled={secMutation.isPending}
            className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2"
          >
            {secMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Security Settings
          </button>
        </div>
      </div>
    </div>
  );
}

function ApiKeysTab({ onSave }: { onSave: (msg: string) => void }) {
  const qc = useQueryClient();
  const [newKeyName, setNewKeyName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<string | null>(null);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['me-api-keys'],
    queryFn: () => meApi.listApiKeys().then(r => r.data.keys),
  });

  const createMutation = useMutation({
    mutationFn: () => meApi.createApiKey(newKeyName.trim()),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['me-api-keys'] });
      setNewRawKey(res.data.key.rawKey);
      setNewKeyName('');
      onSave(`API key "${res.data.key.name}" created — copy it now!`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => meApi.deleteApiKey(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me-api-keys'] }),
  });

  const copyKey = (id: string, key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground mb-6">API Keys</h2>

      {newRawKey && (
        <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
          <p className="text-sm font-medium text-emerald-400 mb-2">New API key created — copy it now. It won't be shown again.</p>
          <div className="flex gap-2 items-center">
            <code className="flex-1 bg-[#050810] border border-border rounded-lg px-3 py-2 text-xs font-mono text-emerald-400 truncate">{newRawKey}</code>
            <button onClick={() => copyKey('new', newRawKey)} className="p-2 text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors">
              {copiedId === 'new' ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <button onClick={() => setNewRawKey(null)} className="text-xs text-muted-foreground hover:text-foreground mt-2">Dismiss</button>
        </div>
      )}

      <div className="space-y-4 mb-6">
        {(data ?? []).length === 0 && (
          <div className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-xl">
            No API keys yet. Create one below.
          </div>
        )}
        {(data ?? []).map(k => (
          <div key={k.id} className="bg-secondary/30 border border-border rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-semibold text-foreground">{k.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Created {new Date(k.createdAt).toLocaleDateString()} · Last used {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}
                </div>
              </div>
              <button onClick={() => deleteMutation.mutate(k.id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 items-center mb-3">
              <code className="flex-1 bg-[#050810] border border-border rounded-lg px-3 py-2 text-xs font-mono text-green-400 truncate">
                {showKey === k.id ? `${k.keyPrefix}••••••••••••••••••••••••••` : `${k.keyPrefix}${'•'.repeat(18)}`}
              </code>
              <button onClick={() => setShowKey(showKey === k.id ? null : k.id)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors">
                {showKey === k.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {(k.scopes ?? []).map(s => <span key={s} className="text-xs font-mono bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded">{s}</span>)}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-secondary/30 border border-border rounded-xl p-4">
        <h3 className="font-semibold text-foreground text-sm mb-3">Create New Key</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g. Automation Script)"
            className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            onKeyDown={e => e.key === 'Enter' && newKeyName.trim() && createMutation.mutate()}
          />
          <button
            onClick={() => createMutation.mutate()}
            disabled={!newKeyName.trim() || createMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  return (
    <MainLayout>
      {toast && <Toast msg={toast} />}
      <div className="flex flex-col gap-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Settings className="w-8 h-8 text-primary" /> Settings
          </h1>
          <p className="text-muted-foreground mt-1">Configure your console preferences and account settings.</p>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          <div className="flex flex-col md:flex-row">
            <div className="p-5 md:w-56 border-b md:border-b-0 md:border-r border-border bg-secondary/20">
              <nav className="flex md:flex-col gap-1">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-primary/10 text-primary shadow-sm border border-primary/20' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                  >
                    <tab.icon className="w-4 h-4 flex-shrink-0" /> {tab.label}
                  </button>
                ))}
              </nav>
            </div>
            <div className="p-8 flex-1">
              {activeTab === 'profile' && <ProfileTab onSave={showToast} />}
              {activeTab === 'notifications' && <NotificationsTab onSave={showToast} />}
              {activeTab === 'security' && <SecurityTab onSave={showToast} />}
              {activeTab === 'apikeys' && <ApiKeysTab onSave={showToast} />}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
