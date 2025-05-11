import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { MetricsCard } from "@/components/dashboard/metrics-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { RecentDocuments } from "@/components/dashboard/recent-documents";
import { PhaseStatus } from "@/components/dashboard/phase-status";
import { Button } from "@/components/ui/button";
import { Task, TaskStatuses, Deal } from "@shared/schema";
import { PlusCircle, Download } from "lucide-react";

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const [dealId, setDealId] = useState<number | null>(null);
  const [dealName, setDealName] = useState<string>("");
  
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
  
  // Fetch deal info
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
  
  // Fetch all tasks
  const { data: tasks, isLoading: isTasksLoading } = useQuery<Task[]>({
    queryKey: dealId ? [`/api/deals/${dealId}/tasks`] : ['skip-tasks-query'],
    enabled: !!dealId,
  });
  
  // Calculate metrics
  const calculateMetrics = () => {
    if (!tasks) return { 
      openTasks: 0, 
      overdueTasks: [], 
      upcomingTasks: [],
      totalTasks: 0,
      completedTasks: 0
    };
    
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);
    
    const openTasks = tasks.filter(task => task.status !== TaskStatuses.COMPLETED).length;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === TaskStatuses.COMPLETED).length;
    
    // Get overdue tasks
    const overdueTasks = tasks.filter(task => {
      if (task.status === TaskStatuses.COMPLETED) return false;
      if (!task.dueDate) return false;
      
      const dueDate = new Date(task.dueDate);
      return dueDate < now;
    });
    
    // Get upcoming tasks (due within next 7 days)
    const upcomingTasks = tasks.filter(task => {
      if (task.status === TaskStatuses.COMPLETED) return false;
      if (!task.dueDate) return false;
      
      const dueDate = new Date(task.dueDate);
      return dueDate >= now && dueDate <= nextWeek;
    });
    
    return { 
      openTasks, 
      overdueTasks, 
      upcomingTasks,
      totalTasks,
      completedTasks
    };
  };
  
  const metrics = calculateMetrics();
  
  // If no deal ID yet, show loading state
  if (!dealId) {
    return (
      <Layout 
        title="Loading Deal..." 
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
      title={dealName || "Deal Dashboard"} 
      subtitle="Due Diligence Dashboard"
    >
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <Button 
            variant="outline" 
            className="flex items-center"
            onClick={() => navigate("/deals")}
          >
            Change Deal
          </Button>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3">
          <Button variant="default" className="flex items-center">
            <PlusCircle className="h-4 w-4 mr-2" />
            New Task
          </Button>
          <Button variant="outline" className="flex items-center">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Open Tasks */}
        <MetricsCard
          title="Open Tasks"
          value={metrics.openTasks}
          badge={{ text: `${metrics.totalTasks} Tasks`, variant: "primary" }}
          progress={{
            value: metrics.completedTasks,
            max: metrics.totalTasks,
            color: "primary"
          }}
        />
        
        {/* Overdue Items */}
        <MetricsCard
          title="Overdue Items"
          value={metrics.overdueTasks.length}
          badge={{ text: "Action Needed", variant: "danger" }}
          items={metrics.overdueTasks.slice(0, 3).map(task => ({
            text: task.title,
            color: "danger"
          }))}
        />
        
        {/* Upcoming Deadlines */}
        <MetricsCard
          title="Upcoming Deadlines"
          value={metrics.upcomingTasks.length}
          badge={{ text: "This Week", variant: "warning" }}
          items={metrics.upcomingTasks.slice(0, 3).map(task => {
            // Calculate days until due
            const dueDate = new Date(task.dueDate!);
            const now = new Date();
            const diffTime = Math.abs(dueDate.getTime() - now.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            const meta = diffDays === 0 
              ? "Today" 
              : diffDays === 1 
                ? "Tomorrow" 
                : `In ${diffDays} days`;
                
            return {
              text: task.title,
              color: "warning",
              meta
            };
          })}
        />
      </div>
      
      {/* Activity Feed & Recent Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="lg:col-span-2">
          <ActivityFeed dealId={dealId} />
        </div>
        
        {/* Recent Documents & Phase Summary */}
        <div className="space-y-6">
          <RecentDocuments dealId={dealId} />
          <PhaseStatus dealId={dealId} />
        </div>
      </div>
    </Layout>
  );
}
