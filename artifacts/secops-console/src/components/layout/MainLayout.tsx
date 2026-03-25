import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAppStore } from '@/store';
import { 
  LayoutDashboard, Terminal, AlertTriangle, Shield, 
  Target, Database, Settings, Menu, Bell, User, Search
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/logs', icon: Terminal, label: 'Logs Explorer' },
  { href: '/alerts', icon: AlertTriangle, label: 'Alert Queue', badge: true },
  { href: '/rules', icon: Shield, label: 'Detection Rules' },
  { href: '/mitre', icon: Target, label: 'MITRE ATT&CK' },
  { href: '/ingestion', icon: Database, label: 'Log Ingestion' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { sidebarCollapsed, toggleSidebar, alerts } = useAppStore();
  
  const newAlertsCount = alerts.filter(a => a.status === 'new').length;

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside 
        className={`${sidebarCollapsed ? 'w-20' : 'w-64'} flex-shrink-0 border-r border-border bg-sidebar transition-all duration-300 ease-in-out flex flex-col`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 text-primary font-bold text-lg tracking-tight">
              <Shield className="w-6 h-6" />
              SecOps Console
            </div>
          )}
          {sidebarCollapsed && (
            <Shield className="w-8 h-8 text-primary mx-auto" />
          )}
        </div>

        <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = location === item.href || (item.href !== '/' && location.startsWith(item.href));
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`
                  flex items-center px-3 py-3 rounded-xl transition-all duration-200 group
                  ${active 
                    ? 'bg-primary/10 text-primary font-medium' 
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }
                  ${sidebarCollapsed ? 'justify-center' : ''}
                `}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon className={`w-5 h-5 ${active ? 'text-primary' : 'group-hover:text-foreground'}`} />
                {!sidebarCollapsed && (
                  <span className="ml-3 flex-1">{item.label}</span>
                )}
                {!sidebarCollapsed && item.badge && newAlertsCount > 0 && (
                  <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                    {newAlertsCount}
                  </span>
                )}
                {sidebarCollapsed && item.badge && newAlertsCount > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-destructive rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-border">
          <button 
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 flex-shrink-0 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between px-6 z-10 sticky top-0">
          <div className="flex items-center bg-input border border-border rounded-lg px-3 py-2 w-96 focus-within:ring-2 focus-within:ring-primary/50 transition-shadow">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search logs, alerts, IPs..." 
              className="bg-transparent border-none outline-none text-sm ml-2 w-full text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <Bell className="w-5 h-5" />
              {newAlertsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full animate-pulse" />
              )}
            </button>
            <div className="w-px h-6 bg-border mx-2"></div>
            <button className="flex items-center gap-2 hover:bg-secondary p-1.5 rounded-full pr-4 transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                <User className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">Alice Analyst</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-background p-6">
          <div className="max-w-7xl mx-auto animate-in fade-in duration-300">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
