import { Switch, Route } from "wouter";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import ChecklistPage from "@/pages/checklist-page";
import TaskDetailPage from "@/pages/task-detail-page";
import RequestsPage from "@/pages/requests-page";
import CalendarPage from "@/pages/calendar-page";
import ReportsPage from "@/pages/reports-page";
import NewDealPage from "@/pages/new-deal-page";
import { ProtectedRoute } from "@/lib/protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/dashboard" component={DashboardPage} />
      <ProtectedRoute path="/checklist" component={ChecklistPage} />
      <ProtectedRoute path="/task/:id" component={TaskDetailPage} />
      <ProtectedRoute path="/requests" component={RequestsPage} />
      <ProtectedRoute path="/calendar" component={CalendarPage} />
      <ProtectedRoute path="/reports" component={ReportsPage} />
      <ProtectedRoute path="/deals/new" component={NewDealPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <TooltipProvider>
      <Router />
    </TooltipProvider>
  );
}

export default App;