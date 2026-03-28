import React, { useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, rulesApi, normalizeRule } from '@/lib/api';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { format } from 'date-fns';
import { ShieldAlert, Activity, Clock, Target, TrendingUp, Database, Cpu, Loader2 } from 'lucide-react';
import { SeverityBadge, StatusBadge } from '@/components/ui/Badge';
import { Link } from 'wouter';

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  info: '#6366f1',
};

const SOURCE_COLORS: Record<string, string> = {
  firewall: '#3b82f6',
  ids: '#06b6d4',
  endpoint: '#8b5cf6',
  auth: '#f59e0b',
  dns: '#10b981',
  proxy: '#ec4899',
};

const tooltipStyle = { backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' };

function StatCard({ title, value, icon, trend, urgent = false, trendUp }: {
  title: string; value: string | number; icon: React.ReactNode; trend: string; urgent?: boolean; trendUp?: boolean;
}) {
  return (
    <div className={`bg-card rounded-xl p-5 border ${urgent ? 'border-destructive/40' : 'border-border'} shadow-lg shadow-black/20 flex flex-col relative overflow-hidden hover:-translate-y-0.5 transition-all duration-200`}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-muted-foreground font-medium text-sm">{title}</h3>
        <div className={`p-2 ${urgent ? 'bg-destructive/10' : 'bg-secondary'} rounded-lg`}>{icon}</div>
      </div>
      <div className="text-3xl font-bold text-foreground mb-1.5 tracking-tight">{value}</div>
      <div className={`text-xs flex items-center gap-1 ${urgent ? 'text-destructive' : trendUp ? 'text-amber-400' : 'text-muted-foreground'}`}>
        {trendUp && <TrendingUp className="w-3 h-3" />}
        {trend}
      </div>
      {urgent && <div className="absolute -top-4 -right-4 w-20 h-20 bg-destructive/10 rounded-full blur-xl" />}
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.stats().then(r => r.data),
    refetchInterval: 60000,
  });

  const { data: rulesData } = useQuery({
    queryKey: ['rules'],
    queryFn: () => rulesApi.list().then(r => r.data.rules.map(normalizeRule)),
  });

  const areaData = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (let i = 23; i >= 0; i--) {
      const h = format(new Date(Date.now() - i * 3600000), 'HH:00');
      buckets[h] = 0;
    }
    (stats?.alertTrend ?? []).forEach(({ hour, count }) => {
      if (hour in buckets) buckets[hour] = count;
    });
    return Object.entries(buckets).map(([time, alerts]) => ({ time, alerts }));
  }, [stats]);

  const pieData = useMemo(() => (
    ['critical', 'high', 'medium', 'low'].map(s => ({
      name: s.charAt(0).toUpperCase() + s.slice(1),
      value: stats?.alerts?.bySeverity?.[s] ?? 0,
      color: SEVERITY_COLORS[s],
    })).filter(d => d.value > 0)
  ), [stats]);

  const topRulesData = useMemo(() => (
    (rulesData ?? [])
      .map(r => ({ name: r.name.length > 22 ? r.name.slice(0, 22) + '…' : r.name, count: r.triggerCount }))
      .sort((a, b) => b.count - a.count).slice(0, 6)
  ), [rulesData]);

  const sourceData = useMemo(() => (
    Object.entries(stats?.logs?.bySource ?? {}).map(([name, value]) => ({
      name, value: Number(value), color: SOURCE_COLORS[name] ?? '#64748b',
    }))
  ), [stats]);

  const newAlerts = stats?.alerts?.byStatus?.new ?? 0;
  const criticalAlerts = stats?.alerts?.bySeverity?.critical ?? 0;
  const resolvedToday = stats?.alerts?.byStatus?.resolved ?? 0;
  const activeRules = stats?.rules?.active ?? rulesData?.filter(r => r.enabled).length ?? 0;
  const totalRules = rulesData?.length ?? 0;

  return (
    <MainLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">SOC Dashboard</h1>
            <p className="text-muted-foreground mt-1">System health and active threats overview — {format(new Date(), 'MMMM d, yyyy HH:mm')}</p>
          </div>
          {statsLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="New Alerts" value={newAlerts} icon={<ShieldAlert className="text-primary" />} trend={`${stats?.alerts?.last24h ?? 0} in last 24h`} trendUp />
          <StatCard title="Critical Threats" value={criticalAlerts} icon={<Activity className="text-destructive" />} trend="Requires attention" urgent />
          <StatCard title="Resolved Alerts" value={resolvedToday} icon={<Clock className="text-emerald-400" />} trend={`${stats?.alerts?.total ?? 0} total alerts`} />
          <StatCard title="Active Rules" value={activeRules} icon={<Target className="text-blue-400" />} trend={`of ${totalRules} total`} />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Alert Volume (Last 24h)</h3>
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">{stats?.alerts?.total ?? 0} total</span>
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} interval={3} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: 'hsl(var(--foreground))' }} />
                  <Area type="monotone" dataKey="alerts" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorAlerts)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-lg shadow-black/20 flex flex-col">
            <h3 className="font-semibold mb-2 text-foreground">Alerts by Severity</h3>
            {pieData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">No alert data yet</div>
            ) : (
              <>
                <div className="flex-1 min-h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  {pieData.map(d => (
                    <div key={d.name} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                      {d.name}: <span className="text-foreground font-medium ml-auto">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-lg shadow-black/20">
            <h3 className="font-semibold mb-4 text-foreground">Top Detection Rules</h3>
            {topRulesData.length === 0 ? (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">No rule trigger data yet</div>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topRulesData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" width={140} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'hsl(var(--secondary))' }} contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={14} label={{ position: 'right', fontSize: 10, fill: '#94a3b8' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-lg shadow-black/20">
            <h3 className="font-semibold mb-4 text-foreground">Log Volume by Source</h3>
            {sourceData.length === 0 ? (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                <div className="text-center">
                  <Database className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>No log data ingested yet</p>
                </div>
              </div>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sourceData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                      {sourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Recent Alerts</h3>
              <Link href="/alerts" className="text-primary text-sm hover:underline">View All →</Link>
            </div>
            {statsLoading ? (
              <div className="flex items-center justify-center py-8 gap-3 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin text-primary" /> Loading…
              </div>
            ) : (stats?.recentAlerts ?? []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No alerts yet. Ingest logs to trigger detections.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground border-b border-border">
                    <tr>
                      <th className="pb-3 font-medium">Time</th>
                      <th className="pb-3 font-medium">Title</th>
                      <th className="pb-3 font-medium">Severity</th>
                      <th className="pb-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {(stats?.recentAlerts ?? []).map(alert => (
                      <tr key={alert.id} className="hover:bg-secondary/50 transition-colors cursor-pointer group">
                        <td className="py-2.5 text-muted-foreground whitespace-nowrap text-xs font-mono pr-3">{format(new Date(alert.createdAt), 'HH:mm:ss')}</td>
                        <td className="py-2.5 text-foreground font-medium pr-4">
                          <Link href={`/alerts/${alert.id}`} className="group-hover:text-primary transition-colors block truncate max-w-[220px]">{alert.title}</Link>
                        </td>
                        <td className="py-2.5 pr-3"><SeverityBadge severity={alert.severity as any} /></td>
                        <td className="py-2.5"><StatusBadge status={alert.status as any} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* System Health */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-lg shadow-black/20">
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">Data Overview</h3>
            </div>
            <div className="space-y-4">
              <div className="pt-2 space-y-3 text-sm">
                {[
                  ['Total Alerts', String(stats?.alerts?.total ?? 0)],
                  ['Open (New)', String(stats?.alerts?.byStatus?.new ?? 0)],
                  ['Investigating', String(stats?.alerts?.byStatus?.investigating ?? 0)],
                  ['Resolved', String(stats?.alerts?.byStatus?.resolved ?? 0)],
                  ['False Positives', String(stats?.alerts?.byStatus?.false_positive ?? 0)],
                  ['Total Logs Ingested', String(stats?.logs?.total ?? 0)],
                  ['Active Detection Rules', String(activeRules)],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between items-center border-b border-border/50 pb-2 last:border-0">
                    <span className="text-muted-foreground text-xs">{label}</span>
                    <span className="text-foreground font-mono text-xs font-medium">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
