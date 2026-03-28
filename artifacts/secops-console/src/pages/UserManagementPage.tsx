import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Users, Plus, RefreshCw, Shield, UserCheck, UserX, MoreVertical, Key, Edit2, Lock } from "lucide-react";
import { usersApi, type ApiUser } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-500/15 text-red-400 border-red-500/30",
  soc_manager: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  detection_engineer: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  soc_l2: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  soc_l1: "bg-green-500/15 text-green-400 border-green-500/30",
  viewer: "bg-muted text-muted-foreground border-border",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  soc_manager: "SOC Manager",
  detection_engineer: "Det. Engineer",
  soc_l2: "SOC L2",
  soc_l1: "SOC L1",
  viewer: "Viewer",
};

const ALL_ROLES = [
  { value: "admin",              label: "Admin" },
  { value: "soc_manager",        label: "SOC Manager" },
  { value: "detection_engineer", label: "Detection Engineer" },
  { value: "soc_l2",             label: "SOC L2 Analyst" },
  { value: "soc_l1",             label: "SOC L1 Analyst" },
  { value: "viewer",             label: "Viewer / Auditor" },
];

const STATUS_COLORS: Record<string, string> = {
  active: "text-green-400",
  inactive: "text-muted-foreground",
  locked: "text-destructive",
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<ApiUser | null>(null);
  const [resetUser, setResetUser] = useState<ApiUser | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const { toast } = useToast();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data } = await usersApi.list();
      setUsers(data.users);
    } catch {
      toast({ title: "Failed to load users", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleStatusToggle = async (user: ApiUser) => {
    const newStatus = user.status === "active" ? "inactive" : "active";
    try {
      await usersApi.update(user.id, { status: newStatus as any });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
      toast({ title: `User ${newStatus === "active" ? "activated" : "deactivated"}` });
    } catch {
      toast({ title: "Failed to update user", variant: "destructive" });
    }
    setActiveMenu(null);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">User Management</h1>
              <p className="text-sm text-muted-foreground">Manage analyst accounts and role assignments</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={loadUsers} className="flex items-center gap-2 px-4 py-2 bg-secondary border border-border rounded-lg text-sm hover:bg-secondary/80 transition-colors">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-primary rounded-lg text-sm text-white font-medium hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" />
              Add User
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Users", value: users.length, color: "text-foreground" },
            { label: "Active", value: users.filter(u => u.status === "active").length, color: "text-green-400" },
            { label: "Admins", value: users.filter(u => u.role === "admin").length, color: "text-red-400" },
            { label: "Locked", value: users.filter(u => u.status === "locked").length, color: "text-destructive" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Login</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Loading users…</td></tr>
                ) : users.map(user => (
                  <tr key={user.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center border border-primary/20 shrink-0">
                          <span className="text-xs font-bold text-primary">
                            {(user.displayName ?? user.username).split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{user.displayName ?? user.username}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded border ${ROLE_COLORS[user.role]}`}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${user.status === "active" ? "bg-green-400" : user.status === "locked" ? "bg-destructive" : "bg-muted"}`} />
                        <span className={`capitalize ${STATUS_COLORS[user.status]}`}>{user.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 relative">
                      <button
                        onClick={() => setActiveMenu(activeMenu === user.id ? null : user.id)}
                        className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {activeMenu === user.id && (
                        <div className="absolute right-4 top-10 z-20 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[160px]">
                          <button
                            onClick={() => { setEditUser(user); setActiveMenu(null); }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-secondary text-foreground transition-colors"
                          >
                            <Edit2 className="w-4 h-4" /> Edit Role
                          </button>
                          <button
                            onClick={() => { setResetUser(user); setActiveMenu(null); }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-secondary text-foreground transition-colors"
                          >
                            <Key className="w-4 h-4" /> Reset Password
                          </button>
                          <button
                            onClick={() => handleStatusToggle(user)}
                            className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-secondary transition-colors ${user.status === "active" ? "text-amber-400" : "text-green-400"}`}
                          >
                            {user.status === "active" ? <Lock className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            {user.status === "active" ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={(u) => { setUsers(prev => [...prev, u]); setShowCreate(false); }} />}
      {editUser && <EditRoleModal user={editUser} onClose={() => setEditUser(null)} onUpdated={(u) => { setUsers(prev => prev.map(p => p.id === u.id ? u : p)); setEditUser(null); }} />}
      {resetUser && <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />}
    </MainLayout>
  );
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: (u: ApiUser) => void }) {
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "soc_l1", displayName: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await usersApi.create(form);
      toast({ title: "User created successfully" });
      onCreated(data.user);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Create New User" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded px-3 py-2">{error}</p>}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Display Name" value={form.displayName} onChange={v => setForm(f => ({ ...f, displayName: v }))} placeholder="Alice Analyst" />
          <Field label="Username" value={form.username} onChange={v => setForm(f => ({ ...f, username: v }))} placeholder="alice" required />
        </div>
        <Field label="Email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="alice@secops.local" type="email" required />
        <Field label="Password" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} placeholder="Min. 8 characters" type="password" required />
        <div>
          <label className="text-sm font-medium text-foreground block mb-1.5">Role</label>
          <select
            value={form.role}
            onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {ALL_ROLES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-secondary border border-border rounded-lg text-sm hover:bg-secondary/80">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-primary rounded-lg text-sm text-white font-medium hover:bg-primary/90 disabled:opacity-60">
            {loading ? "Creating…" : "Create User"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditRoleModal({ user, onClose, onUpdated }: { user: ApiUser; onClose: () => void; onUpdated: (u: ApiUser) => void }) {
  const [role, setRole] = useState(user.role);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data } = await usersApi.update(user.id, { role: role as any });
      toast({ title: "Role updated" });
      onUpdated(data.user);
    } catch {
      toast({ title: "Failed to update role", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Edit Role — ${user.displayName ?? user.username}`} onClose={onClose}>
      <div className="space-y-4">
        <select
          value={role}
          onChange={e => setRole(e.target.value)}
          className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {ALL_ROLES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-secondary border border-border rounded-lg text-sm">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 px-4 py-2 bg-primary rounded-lg text-sm text-white font-medium hover:bg-primary/90 disabled:opacity-60">
            {loading ? "Saving…" : "Save Role"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ResetPasswordModal({ user, onClose }: { user: ApiUser; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleReset = async () => {
    if (password.length < 8) { toast({ title: "Password must be at least 8 characters", variant: "destructive" }); return; }
    setLoading(true);
    try {
      await usersApi.resetPassword(user.id, password);
      toast({ title: "Password reset successfully" });
      onClose();
    } catch {
      toast({ title: "Failed to reset password", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Reset Password — ${user.displayName ?? user.username}`} onClose={onClose}>
      <div className="space-y-4">
        <Field label="New Password" value={password} onChange={setPassword} placeholder="Min. 8 characters" type="password" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-secondary border border-border rounded-lg text-sm">Cancel</button>
          <button onClick={handleReset} disabled={loading} className="flex-1 px-4 py-2 bg-primary rounded-lg text-sm text-white font-medium hover:bg-primary/90 disabled:opacity-60">
            {loading ? "Resetting…" : "Reset Password"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", required }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground block mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
    </div>
  );
}
