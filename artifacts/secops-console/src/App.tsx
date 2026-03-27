import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";

// Pages
import DashboardPage from "@/pages/DashboardPage";
import LogsExplorerPage from "@/pages/LogsExplorerPage";
import AlertQueuePage from "@/pages/AlertQueuePage";
import AlertDetailPage from "@/pages/AlertDetailPage";
import DetectionRulesPage from "@/pages/DetectionRulesPage";
import RuleBuilderPage from "@/pages/RuleBuilderPage";
import MitreAttackPage from "@/pages/MitreAttackPage";
import LogIngestionPage from "@/pages/LogIngestionPage";
import SettingsPage from "@/pages/SettingsPage";
import LoginPage from "@/pages/LoginPage";
import UserManagementPage from "@/pages/UserManagementPage";
import AuditLogPage from "@/pages/AuditLogPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, minRole }: { component: React.ComponentType; minRole?: string }) {
  const { isAuthenticated, hasMinRole } = useAuthStore();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;
  if (minRole && !hasMinRole(minRole as any)) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>You don't have permission to view this page.</p>
      </div>
    );
  }
  return <Component />;
}

function AuthInit({ children }: { children: React.ReactNode }) {
  const restoreSession = useAuthStore((s) => s.restoreSession);
  useEffect(() => { restoreSession(); }, [restoreSession]);
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/" component={() => <ProtectedRoute component={DashboardPage} />} />
      <Route path="/logs" component={() => <ProtectedRoute component={LogsExplorerPage} />} />
      <Route path="/alerts" component={() => <ProtectedRoute component={AlertQueuePage} />} />
      <Route path="/alerts/:id" component={() => <ProtectedRoute component={AlertDetailPage} />} />
      <Route path="/rules" component={() => <ProtectedRoute component={DetectionRulesPage} />} />
      <Route path="/rules/new" component={() => <ProtectedRoute component={RuleBuilderPage} minRole="soc_l2" />} />
      <Route path="/mitre" component={() => <ProtectedRoute component={MitreAttackPage} />} />
      <Route path="/ingestion" component={() => <ProtectedRoute component={LogIngestionPage} minRole="soc_l2" />} />
      <Route path="/settings" component={() => <ProtectedRoute component={SettingsPage} />} />
      <Route path="/users" component={() => <ProtectedRoute component={UserManagementPage} minRole="admin" />} />
      <Route path="/audit" component={() => <ProtectedRoute component={AuditLogPage} minRole="admin" />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthInit>
            <Router />
          </AuthInit>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
