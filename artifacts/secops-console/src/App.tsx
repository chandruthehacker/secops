import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

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
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      <Route path="/logs" component={LogsExplorerPage} />
      <Route path="/alerts" component={AlertQueuePage} />
      <Route path="/alerts/:id" component={AlertDetailPage} />
      <Route path="/rules" component={DetectionRulesPage} />
      <Route path="/rules/new" component={RuleBuilderPage} />
      <Route path="/mitre" component={MitreAttackPage} />
      <Route path="/ingestion" component={LogIngestionPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
