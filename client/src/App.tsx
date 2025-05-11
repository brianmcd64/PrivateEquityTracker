import { Switch, Route } from "wouter";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import ChecklistPage from "@/pages/checklist-page";
import TaskDetailPage from "@/pages/task-detail-page";
import RequestsPage from "@/pages/requests-page";
import CalendarPage from "@/pages/calendar-page";
import ReportsPage from "@/pages/reports-page";
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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <TooltipProvider>
        <Router />
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
