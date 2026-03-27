import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Settings, User, Bell, Shield, Key, CheckCircle2, Eye, EyeOff, Plus, Copy, CheckCheck, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

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
  const [form, setForm] = useState({ firstName: 'Alice', lastName: 'Analyst', role: 'Senior Threat Hunter', timezone: 'UTC' });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <div>
      <h2 className="text-xl font-bold text-foreground mb-6">Profile Settings</h2>
      <div className="flex items-center gap-6 mb-8">
        <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/50 flex items-center justify-center text-2xl font-bold text-primary shadow-[0_0_15px_rgba(59,130,246,0.3)]">
          {form.firstName.charAt(0)}{form.lastName.charAt(0)}
        </div>
        <div>
          <button className="px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors border border-border">Upload Avatar</button>
          <p className="text-xs text-muted-foreground mt-2">JPG, GIF or PNG. Max 800KB</p>
        </div>
      </div>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-5">
          {(['firstName', 'lastName'] as const).map(k => (
            <div key={k}>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">{k === 'firstName' ? 'First Name' : 'Last Name'}</label>
              <input type="text" value={form[k]} onChange={set(k)} className="w-full bg-input border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
          ))}
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Email Address</label>
          <input type="email" defaultValue="alice.analyst@soc.local" disabled className="w-full bg-secondary/50 border border-border/50 rounded-lg px-4 py-2 text-muted-foreground cursor-not-allowed" />
          <p className="text-xs text-muted-foreground mt-1">Contact your admin to change your email.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Role / Title</label>
          <input type="text" value={form.role} onChange={set('role')} className="w-full bg-input border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Timezone</label>
          <select value={form.timezone} onChange={set('timezone')} className="w-full bg-input border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary appearance-none">
            <option value="UTC">UTC (Universal Coordinated Time)</option>
            <option value="EST">EST (Eastern Standard Time, UTC-5)</option>
            <option value="PST">PST (Pacific Standard Time, UTC-8)</option>
            <option value="CET">CET (Central European Time, UTC+1)</option>
          </select>
        </div>
        <div className="pt-4 border-t border-border flex justify-end">
          <button onClick={() => onSave('Profile settings saved')} className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">Save Changes</button>
        </div>
      </div>
    </div>
  );
}

function NotificationsTab({ onSave }: { onSave: (msg: string) => void }) {
  const [settings, setSettings] = useState({
    emailAlerts: true,
    emailDigest: false,
    slackIntegration: false,
    criticalOnly: false,
    newAlerts: true,
    assignedAlerts: true,
    ruleMatches: false,
    weeklyReport: true,
  });
  const toggle = (k: keyof typeof settings) => () => setSettings(s => ({ ...s, [k]: !s[k] }));
  const Toggle = ({ id }: { id: keyof typeof settings }) => (
    <button onClick={toggle(id)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${settings[id] ? 'bg-primary' : 'bg-secondary border border-border'}`}>
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${settings[id] ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
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
        <button onClick={() => onSave('Notification preferences saved')} className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">Save Preferences</button>
      </div>
    </div>
  );
}

function SecurityTab({ onSave }: { onSave: (msg: string) => void }) {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('8');
  const handleSave = () => {
    if (newPw && newPw !== confirmPw) { alert('Passwords do not match'); return; }
    onSave('Security settings updated');
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
  };
  return (
    <div>
      <h2 className="text-xl font-bold text-foreground mb-6">Security Settings</h2>
      <div className="space-y-6">
        <div className="bg-secondary/30 border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4">Change Password</h3>
          <div className="space-y-4">
            {[['Current Password', currentPw, setCurrentPw], ['New Password', newPw, setNewPw], ['Confirm New Password', confirmPw, setConfirmPw]].map(([label, val, setter]) => (
              <div key={label as string}>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">{label as string}</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={val as string} onChange={e => (setter as Function)(e.target.value)} placeholder="••••••••" className="w-full bg-input border border-border rounded-lg px-4 py-2 pr-10 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                  <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between py-4 border-b border-border">
          <div>
            <div className="font-medium text-foreground">Multi-Factor Authentication</div>
            <div className="text-xs text-muted-foreground mt-0.5">{mfaEnabled ? 'Authenticator app is linked' : 'Enable for stronger security'}</div>
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
        <div className="bg-secondary/30 border border-border rounded-xl p-4">
          <h3 className="font-semibold text-foreground text-sm mb-3">Recent Sessions</h3>
          <div className="space-y-2 text-xs text-muted-foreground">
            {[['This device', 'Chrome · 192.168.1.50', 'Now'], ['MacBook Pro', 'Safari · 192.168.1.42', '2h ago'], ['Remote VPN', 'Firefox · 10.0.1.5', 'Yesterday']].map(([dev, info, time]) => (
              <div key={dev} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div><div className="font-medium text-foreground text-xs">{dev}</div><div>{info}</div></div>
                <div className="text-right"><div>{time}</div></div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={handleSave} className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">Update Security</button>
        </div>
      </div>
    </div>
  );
}

function ApiKeysTab({ onSave }: { onSave: (msg: string) => void }) {
  const [keys, setKeys] = useState([
    { id: uuidv4(), name: 'SIEM API Integration', key: 'sk_live_abc123def456ghi789', createdAt: '2026-01-15', lastUsed: '2h ago', scopes: ['read:alerts', 'write:rules'] },
    { id: uuidv4(), name: 'Threat Intel Feed', key: 'sk_live_xyz987uvw654rst321', createdAt: '2026-02-01', lastUsed: '1d ago', scopes: ['read:iocs'] },
  ]);
  const [newKeyName, setNewKeyName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<string | null>(null);
  const handleCreate = () => {
    if (!newKeyName.trim()) return;
    setKeys(prev => [...prev, { id: uuidv4(), name: newKeyName, key: `sk_live_${uuidv4().replace(/-/g, '').slice(0, 24)}`, createdAt: new Date().toISOString().split('T')[0], lastUsed: 'Never', scopes: ['read:alerts'] }]);
    setNewKeyName('');
    onSave(`API key "${newKeyName}" created`);
  };
  const copyKey = (id: string, key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };
  const deleteKey = (id: string) => setKeys(prev => prev.filter(k => k.id !== id));
  return (
    <div>
      <h2 className="text-xl font-bold text-foreground mb-6">API Keys</h2>
      <div className="space-y-4 mb-6">
        {keys.map(k => (
          <div key={k.id} className="bg-secondary/30 border border-border rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-semibold text-foreground">{k.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Created {k.createdAt} · Last used {k.lastUsed}</div>
              </div>
              <button onClick={() => deleteKey(k.id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 items-center mb-3">
              <code className="flex-1 bg-[#050810] border border-border rounded-lg px-3 py-2 text-xs font-mono text-green-400 truncate">
                {showKey === k.id ? k.key : k.key.slice(0, 12) + '••••••••••••••••••'}
              </code>
              <button onClick={() => setShowKey(showKey === k.id ? null : k.id)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors">
                {showKey === k.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button onClick={() => copyKey(k.id, k.key)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors">
                {copiedId === k.id ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {k.scopes.map(s => <span key={s} className="text-xs font-mono bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded">{s}</span>)}
            </div>
          </div>
        ))}
      </div>
      <div className="bg-secondary/30 border border-border rounded-xl p-4">
        <h3 className="font-semibold text-foreground text-sm mb-3">Create New Key</h3>
        <div className="flex gap-2">
          <input type="text" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="Key name (e.g. Automation Script)" className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" onKeyDown={e => e.key === 'Enter' && handleCreate()} />
          <button onClick={handleCreate} disabled={!newKeyName.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
            <Plus className="w-4 h-4" /> Generate
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  return (
    <MainLayout>
      {toast && <Toast msg={toast} />}
      <div className="flex flex-col gap-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Settings className="w-8 h-8 text-primary" /> Settings
          </h1>
          <p className="text-muted-foreground mt-1">Configure your console preferences and user account.</p>
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
