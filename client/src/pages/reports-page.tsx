import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Filter, RefreshCw } from "lucide-react";
import { Task, User, Deal } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { MetricsChart } from "@/components/reports/metrics-chart";
import { WorkloadChart } from "@/components/reports/workload-chart";
import { PhaseCompletionChart } from "@/components/reports/phase-completion-chart";
import { OverdueTasksList } from "@/components/reports/overdue-tasks-list";

export default function ReportsPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [dealName, setDealName] = useState<string>("");
  
  // Get the active deal from localStorage and use for initial state
  const [dealId, setDealId] = useState<number | null>(null);
  
  // Load active deal from localStorage
  useEffect(() => {
    const storedDealId = localStorage.getItem("activeDealId");
    if (storedDealId) {
      setDealId(parseInt(storedDealId));
    } else {
      // Redirect to deal management if no active deal
      navigate("/deals");
    }
  }, [navigate]);
  
  // Fetch deal data
  const { data: deals } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });
  
  // Fetch active deal info
  const { data: deal } = useQuery<Deal>({
    queryKey: dealId ? [`/api/deals/${dealId}`] : ['skip-query'],
    enabled: !!dealId,
  });
  
  // Update deal name when deal data is loaded
  useEffect(() => {
    if (deal) {
      setDealName(deal.name);
    }
  }, [deal]);
  
  // Update localStorage when manually changing deal in report view
  useEffect(() => {
    if (dealId) {
      localStorage.setItem("activeDealId", dealId.toString());
    }
  }, [dealId]);
  
  // Fetch all tasks for the selected deal
  const { 
    data: tasks, 
    isLoading: isTasksLoading, 
    error: tasksError,
    refetch: refetchTasks,
  } = useQuery<Task[]>({
    queryKey: dealId ? [`/api/deals/${dealId}/tasks`] : ['skip-tasks-query'],
    enabled: !!dealId,
  });
  
  // Mock users for the prototype
  const users = [
    { id: 1, name: "Sarah Johnson", role: "deal_lead" },
    { id: 2, name: "Michael Reynolds", role: "functional_lead", specialization: "financial" },
    { id: 3, name: "Amanda Lee", role: "functional_lead", specialization: "legal" },
    { id: 4, name: "Tom Wilson", role: "functional_lead", specialization: "operations" },
  ];
  
  const handleRefresh = () => {
    refetchTasks();
    toast({
      title: "Reports refreshed",
      description: "All report data has been updated."
    });
  };
  
  const handleExport = () => {
    toast({
      title: "Export started",
      description: "Your report export will be ready shortly."
    });
    // In a real app, this would trigger an export of the report data
  };
  
  // If no deal ID yet, show loading state
  if (!dealId) {
    return (
      <Layout 
        title="Loading Reports..." 
        subtitle="Please wait"
      >
        <div className="flex items-center justify-center h-64">
          <p className="text-neutral-500">Loading deal information...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title="Reports & Analytics" 
      subtitle={dealName}
    >
      {/* Reports Controls */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex items-center gap-4">
          {deals && deals.length > 0 && dealId && (
            <Select value={dealId.toString()} onValueChange={(value) => setDealId(parseInt(value))}>
              <SelectTrigger className="w-[220px]">
                <div className="flex items-center">
                  <Filter className="mr-2 h-4 w-4" />
                  <span>Deal: {dealName || "Loading..."}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {deals.map(deal => (
                  <SelectItem key={deal.id} value={deal.id.toString()}>
                    {deal.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      {isTasksLoading ? (
        <div className="text-center py-8">
          <p className="text-neutral-500">Loading report data...</p>
        </div>
      ) : tasksError ? (
        <div className="text-center py-8">
          <p className="text-red-500">Error loading report data</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-neutral-500">Total Tasks</p>
                  <p className="text-3xl font-bold mt-1">{tasks?.length || 0}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-neutral-500">Tasks Completed</p>
                  <p className="text-3xl font-bold mt-1 text-green-600">
                    {tasks?.filter(t => t.status === "completed").length || 0}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-neutral-500">Overdue Tasks</p>
                  <p className="text-3xl font-bold mt-1 text-red-600">
                    {tasks?.filter(t => {
                      if (!t.dueDate || t.status === "completed") return false;
                      return new Date(t.dueDate) < new Date();
                    }).length || 0}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-neutral-500">Completion Rate</p>
                  <p className="text-3xl font-bold mt-1">
                    {tasks?.length 
                      ? Math.round((tasks.filter(t => t.status === "completed").length / tasks.length) * 100) 
                      : 0}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Task Completion by Phase</CardTitle>
                <CardDescription>
                  Breakdown of task completion status across different phases
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <PhaseCompletionChart tasks={tasks || []} />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Metrics Trend</CardTitle>
                <CardDescription>
                  Completion metrics over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <MetricsChart tasks={tasks || []} />
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Team Workload</CardTitle>
                <CardDescription>
                  Number of tasks assigned to each team member
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <WorkloadChart tasks={tasks || []} users={users} />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Overdue Tasks</CardTitle>
                <CardDescription>
                  Tasks that are past their due date
                </CardDescription>
              </CardHeader>
              <CardContent className="max-h-[300px] overflow-y-auto p-0">
                <OverdueTasksList tasks={tasks || []} users={users} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </Layout>
  );
}
