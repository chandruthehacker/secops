import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { ClipboardList, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { auditApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface AuditLog {
  id: string;
  userId: string | null;
  username: string | null;
  action: string;
  resource: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  success: string;
  createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  "auth.login": "text-green-400",
  "auth.login_failed": "text-destructive",
  "auth.logout": "text-muted-foreground",
  "users.create": "text-blue-400",
  "users.update": "text-amber-400",
  "users.delete": "text-destructive",
  "users.reset_password": "text-amber-400",
  "alerts.status_update": "text-primary",
  "alerts.add_note": "text-primary",
  "alerts.assign": "text-primary",
  "rules.create": "text-blue-400",
  "rules.update": "text-amber-400",
  "rules.delete": "text-destructive",
  "rules.enable": "text-green-400",
  "rules.disable": "text-amber-400",
  "ingest.log": "text-muted-foreground",
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const limit = 50;

  const loadLogs = async (p = page) => {
    setLoading(true);
    try {
      const { data } = await auditApi.list({ page: String(p), limit: String(limit) });
      setLogs(data.logs);
      setTotal(data.total);
    } catch {
      toast({ title: "Failed to load audit logs", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLogs(); }, [page]);

  const totalPages = Math.ceil(total / limit);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
              <ClipboardList className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
              <p className="text-sm text-muted-foreground">Complete record of all system actions and events</p>
            </div>
          </div>
          <button onClick={() => loadLogs()} className="flex items-center gap-2 px-4 py-2 bg-secondary border border-border rounded-lg text-sm hover:bg-secondary/80 transition-colors">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{total.toLocaleString()} total events</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1 text-sm bg-secondary border border-border rounded disabled:opacity-40 hover:bg-secondary/80 transition-colors">Prev</button>
              <span className="text-sm text-muted-foreground">{page} / {totalPages || 1}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1 text-sm bg-secondary border border-border rounded disabled:opacity-40 hover:bg-secondary/80 transition-colors">Next</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Time</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resource</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">IP Address</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Loading…</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No audit logs yet</td></tr>
                ) : logs.map(log => (
                  <tr key={log.id} className="border-b border-border/40 hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{log.username ?? "system"}</td>
                    <td className="px-4 py-3">
                      <code className={`text-xs font-mono ${ACTION_COLORS[log.action] ?? "text-foreground"}`}>
                        {log.action}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {log.resource ?? "—"}
                      {log.resourceId && <span className="ml-1 text-xs opacity-60">#{log.resourceId.slice(0, 8)}</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{log.ipAddress ?? "—"}</td>
                    <td className="px-4 py-3">
                      {log.success === "true"
                        ? <CheckCircle className="w-4 h-4 text-green-400" />
                        : <XCircle className="w-4 h-4 text-destructive" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
