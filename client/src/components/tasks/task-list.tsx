import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Task, TaskPhases, TaskCategories, TaskStatuses } from "@shared/schema";
import { formatDistanceToNow, isPast, addDays } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface TaskListProps {
  dealId: number;
  viewMode?: "phase" | "date" | "category" | "owner";
  customPhases?: string[];
  customCategories?: string[];
  customStatuses?: string[];
}

export function TaskList({ 
  dealId,
  viewMode = "phase",
  customPhases: propCustomPhases = [],
  customCategories: propCustomCategories = [],
  customStatuses: propCustomStatuses = []
}: TaskListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Load custom fields from localStorage, fallback to props if not available
  const [storedCustomPhases] = useLocalStorage<string[]>("customPhases", []);
  const [storedCustomCategories] = useLocalStorage<string[]>("customCategories", []);
  const [storedCustomStatuses] = useLocalStorage<string[]>("customStatuses", []);
  
  // Combine custom fields from props and localStorage (prefer localStorage)
  const customPhases = storedCustomPhases.length > 0 ? storedCustomPhases : propCustomPhases;
  const customCategories = storedCustomCategories.length > 0 ? storedCustomCategories : propCustomCategories;
  const customStatuses = storedCustomStatuses.length > 0 ? storedCustomStatuses : propCustomStatuses;
  const [phaseFilter, setPhaseFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [ownerFilter, setOwnerFilter] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
  // Fetch all tasks for the deal
  const { data: tasks, isLoading, error } = useQuery<Task[]>({
    queryKey: [`/api/deals/${dealId}/tasks`],
  });
  
  // Fetch users to show as assignees (simplified for prototype)
  // Use useMemo to prevent recreation on each render
  const users = useMemo(() => [
    { id: 1, name: "Sarah Johnson" },
    { id: 2, name: "Michael Reynolds" },
    { id: 3, name: "Amanda Lee" },
    { id: 4, name: "Tom Wilson" },
  ], []);
  
  // Group tasks by view mode
  const [groupedByPhase, setGroupedByPhase] = useState<Record<string, Task[]>>({});
  const [groupedByCategory, setGroupedByCategory] = useState<Record<string, Task[]>>({});
  const [groupedByOwner, setGroupedByOwner] = useState<Record<string, Task[]>>({});
  const [tasksByDate, setTasksByDate] = useState<Task[]>([]);
  
  useEffect(() => {
    if (tasks) {
      // Apply filters
      const filteredTasks = tasks.filter(task => {
        return (
          (phaseFilter === "" || task.phase === phaseFilter) &&
          (categoryFilter === "" || task.category === categoryFilter) &&
          (statusFilter === "" || task.status === statusFilter) &&
          (ownerFilter === "" || task.assignedTo === parseInt(ownerFilter))
        );
      });
      
      if (viewMode === "phase") {
        // Group by phase
        const grouped: Record<string, Task[]> = {};
        
        // Start with standard phases
        Object.values(TaskPhases).forEach(phase => {
          grouped[phase] = [];
        });
        
        // Add custom phases
        customPhases.forEach(phase => {
          if (!grouped[phase]) {
            grouped[phase] = [];
          }
        });
        
        // Sort tasks into phases
        for (const task of filteredTasks) {
          if (!grouped[task.phase]) {
            grouped[task.phase] = [];
          }
          grouped[task.phase].push(task);
        }
        
        // Remove empty phases
        Object.keys(grouped).forEach(phase => {
          if (grouped[phase].length === 0) {
            delete grouped[phase];
          }
        });
        
        setGroupedByPhase(grouped);
      } 
      else if (viewMode === "category") {
        // Group by category
        const grouped: Record<string, Task[]> = {};
        
        // Start with standard categories
        Object.values(TaskCategories).forEach(category => {
          grouped[category] = [];
        });
        
        // Add custom categories
        customCategories.forEach(category => {
          if (!grouped[category]) {
            grouped[category] = [];
          }
        });
        
        // Sort tasks into categories
        for (const task of filteredTasks) {
          if (!grouped[task.category]) {
            grouped[task.category] = [];
          }
          grouped[task.category].push(task);
        }
        
        // Remove empty categories
        Object.keys(grouped).forEach(category => {
          if (grouped[category].length === 0) {
            delete grouped[category];
          }
        });
        
        setGroupedByCategory(grouped);
      } 
      else if (viewMode === "owner") {
        // Group by owner
        const grouped: Record<string, Task[]> = {};
        
        // Initialize groups for each user
        users.forEach(user => {
          grouped[user.id.toString()] = [];
        });
        
        // Add "Unassigned" group
        grouped["unassigned"] = [];
        
        // Sort tasks by owner
        for (const task of filteredTasks) {
          const ownerId = task.assignedTo ? task.assignedTo.toString() : "unassigned";
          
          if (!grouped[ownerId]) {
            grouped[ownerId] = [];
          }
          grouped[ownerId].push(task);
        }
        
        // Remove empty owner groups
        Object.keys(grouped).forEach(ownerId => {
          if (grouped[ownerId].length === 0) {
            delete grouped[ownerId];
          }
        });
        
        setGroupedByOwner(grouped);
      } 
      else {
        // For date view, sort tasks by due date
        const sortedTasks = [...filteredTasks].sort((a, b) => {
          // Handle tasks without due dates (place at the end)
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          
          const dateA = new Date(a.dueDate).getTime();
          const dateB = new Date(b.dueDate).getTime();
          
          return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
        });
        
        setTasksByDate(sortedTasks);
      }
    }
  }, [tasks, phaseFilter, categoryFilter, statusFilter, ownerFilter, viewMode, customPhases, customCategories, sortOrder, users]);
  
  const handleTaskComplete = async (task: Task) => {
    try {
      await apiRequest("PATCH", `/api/tasks/${task.id}`, {
        status: TaskStatuses.COMPLETED,
      });
      
      // Invalidate tasks cache to refresh the list
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/tasks`] });
      
      toast({
        title: "Task completed",
        description: "The task has been marked as complete",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    }
  };
  
  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case TaskPhases.LOI_SIGNING:
        return "bg-accent";
      case TaskPhases.PLANNING_INITIAL:
        return "bg-cyan-500";
      case TaskPhases.DOCUMENT_REVIEW:
        return "bg-warning";
      case TaskPhases.MID_PHASE_REVIEW:
        return "bg-indigo-500";
      case TaskPhases.DEEP_DIVES:
        return "bg-success";
      case TaskPhases.FINAL_RISK_REVIEW:
        return "bg-danger";
      case TaskPhases.DEAL_CLOSING:
        return "bg-purple-500";
      case TaskPhases.POST_CLOSE:
        return "bg-blue-500";
      default:
        // For custom phases, return a color based on first letter to ensure consistency
        const colors = ["bg-emerald-500", "bg-cyan-500", "bg-amber-500", "bg-teal-500", "bg-indigo-500"];
        const colorIndex = phase.charCodeAt(0) % colors.length;
        return colors[colorIndex];
    }
  };
  
  const getPhaseTitle = (phase: string) => {
    switch (phase) {
      case TaskPhases.LOI_SIGNING:
        return "LOI Signing & DD Kickoff";
      case TaskPhases.PLANNING_INITIAL:
        return "Planning & Initial Information Requests";
      case TaskPhases.DOCUMENT_REVIEW:
        return "Document Review & Tracker Updates";
      case TaskPhases.MID_PHASE_REVIEW:
        return "Mid-Phase Review";
      case TaskPhases.DEEP_DIVES:
        return "Deep Dives & Secondary Requests";
      case TaskPhases.FINAL_RISK_REVIEW:
        return "Final Risk Review & Negotiation";
      case TaskPhases.DEAL_CLOSING:
        return "Deal Closing Preparation";
      case TaskPhases.POST_CLOSE:
        return "Post-Close Integration Planning";
      default:
        // For custom phases, format the phase name for display
        return phase.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
    }
  };
  
  const getPhaseStatus = (phaseId: string) => {
    if (!tasks) return { complete: 0, total: 0 };
    
    const phaseTasks = tasks.filter(task => task.phase === phaseId);
    const completedTasks = phaseTasks.filter(task => task.status === TaskStatuses.COMPLETED);
    
    return {
      complete: completedTasks.length,
      total: phaseTasks.length,
    };
  };
  
  const getStatusBadge = (task: Task) => {
    const baseStyles = "text-xs font-medium px-2 py-0.5 rounded-full";
    
    // For completed tasks
    if (task.status === TaskStatuses.COMPLETED) {
      return <span className={`${baseStyles} text-success bg-success/10`}>Completed</span>;
    }
    
    // For tasks due today or overdue
    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      
      if (isPast(dueDate) && task.status !== TaskStatuses.COMPLETED) {
        return <span className={`${baseStyles} text-danger bg-danger/10`}>Overdue</span>;
      }
      
      // Due tomorrow
      const tomorrow = addDays(new Date(), 1);
      if (dueDate <= tomorrow && dueDate > new Date() && task.status !== TaskStatuses.COMPLETED) {
        return <span className={`${baseStyles} text-warning bg-warning/10`}>Due Tomorrow</span>;
      }
    }
    
    // Default based on status
    switch (task.status) {
      case TaskStatuses.IN_PROGRESS:
        return <span className={`${baseStyles} text-primary bg-primary/10`}>In Progress</span>;
      case TaskStatuses.PENDING:
        return <span className={`${baseStyles} text-yellow-600 bg-yellow-50`}>Pending Review</span>;
      case TaskStatuses.NOT_STARTED:
        return <span className={`${baseStyles} text-neutral-600 bg-neutral-100`}>Not Started</span>;
      case TaskStatuses.BLOCKED:
        return <span className={`${baseStyles} text-red-600 bg-red-50`}>Blocked</span>;
      case TaskStatuses.DEFERRED:
        return <span className={`${baseStyles} text-purple-600 bg-purple-50`}>Deferred</span>;
      default:
        // Custom status
        if (customStatuses.includes(task.status)) {
          // Generate a deterministic color based on the status string for consistency
          const colors = [
            "text-emerald-600 bg-emerald-50",
            "text-sky-600 bg-sky-50",
            "text-amber-600 bg-amber-50",
            "text-teal-600 bg-teal-50",
            "text-indigo-600 bg-indigo-50",
            "text-rose-600 bg-rose-50"
          ];
          const colorIndex = task.status.charCodeAt(0) % colors.length;
          const formattedStatus = task.status.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
          
          return <span className={`${baseStyles} ${colors[colorIndex]}`}>{formattedStatus}</span>;
        }
        return <span className={`${baseStyles} text-neutral-600 bg-neutral-100`}>{task.status}</span>;
    }
  };
  
  const canModifyTask = (task: Task) => {
    if (!user) return false;
    
    // Deal leads can modify any task
    if (user.role === "deal_lead") return true;
    
    // Functional leads can only modify tasks in their specialty
    if (user.role === "functional_lead" && user.specialization === task.category) return true;
    
    // Partners cannot modify tasks
    return false;
  };
  
  if (isLoading) {
    return <div className="text-center py-8">Loading tasks...</div>;
  }
  
  if (error) {
    return <div className="text-center py-8 text-red-500">Error loading tasks</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
          <div className="flex-grow md:max-w-xs">
            <label htmlFor="phase-filter" className="block text-sm font-medium text-neutral-700 mb-1">Phase</label>
            <select 
              id="phase-filter" 
              className="w-full rounded-md border border-neutral-300 py-2 px-3 text-sm"
              value={phaseFilter}
              onChange={(e) => setPhaseFilter(e.target.value)}
            >
              <option value="">All Phases</option>
              {Object.entries(TaskPhases).map(([key, value]) => (
                <option key={value} value={value}>
                  {key.split('_').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                  ).join(' ')}
                </option>
              ))}
              {customPhases.map(phase => (
                <option key={phase} value={phase}>{phase.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}</option>
              ))}
            </select>
          </div>
          
          <div className="flex-grow md:max-w-xs">
            <label htmlFor="category-filter" className="block text-sm font-medium text-neutral-700 mb-1">Category</label>
            <select 
              id="category-filter" 
              className="w-full rounded-md border border-neutral-300 py-2 px-3 text-sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value={TaskCategories.OPERATING_TEAM}>Operating Team</option>
              <option value={TaskCategories.SELLER_BROKER}>Seller / Broker</option>
              <option value={TaskCategories.IR_BANK}>IR / Bank</option>
              <option value={TaskCategories.LEGAL}>Legal</option>
              <option value={TaskCategories.FINANCIAL}>Financial</option>
              <option value={TaskCategories.INVESTMENT_COMMITTEE}>Investment Committee</option>
              {customCategories.map(category => (
                <option key={category} value={category}>{category.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}</option>
              ))}
            </select>
          </div>
          
          <div className="flex-grow md:max-w-xs">
            <label htmlFor="status-filter" className="block text-sm font-medium text-neutral-700 mb-1">Status</label>
            <select 
              id="status-filter" 
              className="w-full rounded-md border border-neutral-300 py-2 px-3 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value={TaskStatuses.NOT_STARTED}>Not Started</option>
              <option value={TaskStatuses.IN_PROGRESS}>In Progress</option>
              <option value={TaskStatuses.PENDING}>Pending Review</option>
              <option value={TaskStatuses.COMPLETED}>Complete</option>
              <option value={TaskStatuses.BLOCKED}>Blocked</option>
              <option value={TaskStatuses.DEFERRED}>Deferred</option>
              {customStatuses.map(status => (
                <option key={status} value={status}>{status.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}</option>
              ))}
            </select>
          </div>
          
          <div className="flex-grow md:max-w-xs">
            <label htmlFor="owner-filter" className="block text-sm font-medium text-neutral-700 mb-1">Owner</label>
            <select 
              id="owner-filter" 
              className="w-full rounded-md border border-neutral-300 py-2 px-3 text-sm"
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
            >
              <option value="">All Owners</option>
              {users.map(user => (
                <option key={user.id} value={user.id.toString()}>{user.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        {viewMode === "date" && (
          <div className="mt-4 flex items-center">
            <label className="block text-sm font-medium text-neutral-700 mr-2">Sort Order:</label>
            <Button 
              variant={sortOrder === "asc" ? "default" : "outline"} 
              size="sm"
              className="mr-2"
              onClick={() => setSortOrder("asc")}
            >
              Earliest First
            </Button>
            <Button 
              variant={sortOrder === "desc" ? "default" : "outline"} 
              size="sm"
              onClick={() => setSortOrder("desc")}
            >
              Latest First
            </Button>
          </div>
        )}
      </div>
      
      {/* Render Tasks by View Mode */}
      {viewMode === "phase" ? (
        // Tasks Lists by Phase
        <div className="space-y-8">
          {Object.keys(groupedByPhase).length > 0 ? (
            Object.entries(groupedByPhase).map(([phase, phaseTasks]) => {
              const phaseStatus = getPhaseStatus(phase);
              const allCompleted = phaseTasks.every(task => task.status === TaskStatuses.COMPLETED);
              
              return (
                <div key={phase} className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
                  <div className="bg-neutral-50 p-4 border-b border-neutral-200 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-2 h-6 ${getPhaseColor(phase)} rounded-full mr-3`}></div>
                      <h3 className="text-lg font-semibold text-neutral-900">{getPhaseTitle(phase)}</h3>
                      <span className={`ml-3 px-2 py-1 ${
                        allCompleted 
                          ? "bg-success/10 text-success" 
                          : phaseTasks.some(t => t.status === TaskStatuses.COMPLETED)
                            ? "bg-warning/10 text-warning"
                            : "bg-neutral-100 text-neutral-500"
                      } text-xs font-medium rounded-full`}>
                        {allCompleted ? "Complete" : "In Progress"}
                      </span>
                    </div>
                    <span className="text-sm text-neutral-500">{phaseStatus.complete}/{phaseStatus.total} tasks complete</span>
                  </div>
                  
                  <div className="divide-y divide-neutral-200">
                    {phaseTasks.map(task => (
                      <div key={task.id} className="p-4 flex items-start">
                        <Checkbox 
                          id={`task-${task.id}`}
                          checked={task.status === TaskStatuses.COMPLETED}
                          disabled={!canModifyTask(task) || task.status === TaskStatuses.COMPLETED}
                          onCheckedChange={() => handleTaskComplete(task)}
                          className="mt-1 h-4 w-4 text-accent border-neutral-300 rounded focus:ring-accent"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <Link href={`/task/${task.id}`}>
                              <a className={`text-sm font-medium text-neutral-900 ${task.status === TaskStatuses.COMPLETED ? 'line-through' : ''} hover:text-primary`}>
                                {task.title}
                              </a>
                            </Link>
                            {getStatusBadge(task)}
                          </div>
                          <div className={`mt-1 text-sm text-neutral-500 ${task.status === TaskStatuses.COMPLETED ? 'line-through' : ''}`}>
                            {task.description}
                          </div>
                          <div className="mt-2 flex items-center text-xs text-neutral-500">
                            <span className="flex items-center mr-4">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {task.status === TaskStatuses.COMPLETED ? (
                                `Completed on ${task.completedAt ? new Date(task.completedAt).toLocaleDateString() : 'N/A'}`
                              ) : (
                                task.dueDate ? (
                                  isPast(new Date(task.dueDate)) ? (
                                    <span className="text-danger">
                                      Due {formatDistanceToNow(new Date(task.dueDate))} ago
                                    </span>
                                  ) : (
                                    `Due ${formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}`
                                  )
                                ) : 'No due date'
                              )}
                            </span>
                            <span className="flex items-center mr-4">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              {users.find(u => u.id === task.assignedTo)?.name || 'Unassigned'}
                            </span>
                            <span className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                              {task.category.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-neutral-500">No tasks found matching the current filters</p>
              {(phaseFilter || categoryFilter || statusFilter || ownerFilter) && (
                <button 
                  className="mt-2 text-primary hover:text-primary-dark text-sm font-medium"
                  onClick={() => {
                    setPhaseFilter("");
                    setCategoryFilter("");
                    setStatusFilter("");
                    setOwnerFilter("");
                  }}
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      ) : viewMode === "category" ? (
        // Tasks Lists by Category
        <div className="space-y-8">
          {Object.keys(groupedByCategory).length > 0 ? (
            Object.entries(groupedByCategory).map(([category, categoryTasks]) => {
              const allCompleted = categoryTasks.every(task => task.status === TaskStatuses.COMPLETED);
              const completedCount = categoryTasks.filter(task => task.status === TaskStatuses.COMPLETED).length;
              
              // Get a consistent color for the category
              const colors = ["bg-teal-500", "bg-indigo-500", "bg-amber-500", "bg-emerald-500", "bg-fuchsia-500", "bg-cyan-500"];
              const colorIndex = category.charCodeAt(0) % colors.length;
              const categoryColor = colors[colorIndex];
              
              return (
                <div key={category} className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
                  <div className="bg-neutral-50 p-4 border-b border-neutral-200 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-2 h-6 ${categoryColor} rounded-full mr-3`}></div>
                      <h3 className="text-lg font-semibold text-neutral-900">
                        {category.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}
                      </h3>
                      <span className={`ml-3 px-2 py-1 ${
                        allCompleted 
                          ? "bg-success/10 text-success" 
                          : categoryTasks.some(t => t.status === TaskStatuses.COMPLETED)
                            ? "bg-warning/10 text-warning"
                            : "bg-neutral-100 text-neutral-500"
                      } text-xs font-medium rounded-full`}>
                        {allCompleted ? "Complete" : "In Progress"}
                      </span>
                    </div>
                    <span className="text-sm text-neutral-500">{completedCount}/{categoryTasks.length} tasks complete</span>
                  </div>
                  
                  <div className="divide-y divide-neutral-200">
                    {categoryTasks.map(task => (
                      <div key={task.id} className="p-4 flex items-start">
                        <Checkbox 
                          id={`task-${task.id}`}
                          checked={task.status === TaskStatuses.COMPLETED}
                          disabled={!canModifyTask(task) || task.status === TaskStatuses.COMPLETED}
                          onCheckedChange={() => handleTaskComplete(task)}
                          className="mt-1 h-4 w-4 text-accent border-neutral-300 rounded focus:ring-accent"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <Link href={`/task/${task.id}`}>
                              <a className={`text-sm font-medium text-neutral-900 ${task.status === TaskStatuses.COMPLETED ? 'line-through' : ''} hover:text-primary`}>
                                {task.title}
                              </a>
                            </Link>
                            {getStatusBadge(task)}
                          </div>
                          <div className={`mt-1 text-sm text-neutral-500 ${task.status === TaskStatuses.COMPLETED ? 'line-through' : ''}`}>
                            {task.description}
                          </div>
                          <div className="mt-2 flex items-center text-xs text-neutral-500">
                            <span className="flex items-center mr-4">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {task.status === TaskStatuses.COMPLETED ? (
                                `Completed on ${task.completedAt ? new Date(task.completedAt).toLocaleDateString() : 'N/A'}`
                              ) : (
                                task.dueDate ? (
                                  isPast(new Date(task.dueDate)) ? (
                                    <span className="text-danger">
                                      Due {formatDistanceToNow(new Date(task.dueDate))} ago
                                    </span>
                                  ) : (
                                    `Due ${formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}`
                                  )
                                ) : 'No due date'
                              )}
                            </span>
                            <span className="flex items-center mr-4">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              {users.find(u => u.id === task.assignedTo)?.name || 'Unassigned'}
                            </span>
                            <span className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              {getPhaseTitle(task.phase)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-neutral-500">No tasks found matching the current filters</p>
              {(phaseFilter || categoryFilter || statusFilter || ownerFilter) && (
                <button 
                  className="mt-2 text-primary hover:text-primary-dark text-sm font-medium"
                  onClick={() => {
                    setPhaseFilter("");
                    setCategoryFilter("");
                    setStatusFilter("");
                    setOwnerFilter("");
                  }}
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      ) : viewMode === "owner" ? (
        // Tasks Lists by Owner
        <div className="space-y-8">
          {Object.keys(groupedByOwner).length > 0 ? (
            Object.entries(groupedByOwner).map(([ownerId, ownerTasks]) => {
              // Get owner info
              let ownerName = "Unassigned";
              let ownerColor = "bg-gray-400";
              
              if (ownerId !== "unassigned") {
                const owner = users.find(u => u.id.toString() === ownerId);
                if (owner) {
                  ownerName = owner.name;
                  // Get a consistent color for the owner
                  const colors = ["bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-orange-500", "bg-green-500", "bg-yellow-500"];
                  const colorIndex = owner.name.charCodeAt(0) % colors.length;
                  ownerColor = colors[colorIndex];
                }
              }
              
              const allCompleted = ownerTasks.every(task => task.status === TaskStatuses.COMPLETED);
              const completedCount = ownerTasks.filter(task => task.status === TaskStatuses.COMPLETED).length;
              
              return (
                <div key={ownerId} className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
                  <div className="bg-neutral-50 p-4 border-b border-neutral-200 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-2 h-6 ${ownerColor} rounded-full mr-3`}></div>
                      <h3 className="text-lg font-semibold text-neutral-900">
                        {ownerName}
                      </h3>
                      <span className={`ml-3 px-2 py-1 ${
                        allCompleted 
                          ? "bg-success/10 text-success" 
                          : ownerTasks.some(t => t.status === TaskStatuses.COMPLETED)
                            ? "bg-warning/10 text-warning"
                            : "bg-neutral-100 text-neutral-500"
                      } text-xs font-medium rounded-full`}>
                        {allCompleted ? "Complete" : "In Progress"}
                      </span>
                    </div>
                    <span className="text-sm text-neutral-500">{completedCount}/{ownerTasks.length} tasks complete</span>
                  </div>
                  
                  <div className="divide-y divide-neutral-200">
                    {ownerTasks.map(task => (
                      <div key={task.id} className="p-4 flex items-start">
                        <Checkbox 
                          id={`task-${task.id}`}
                          checked={task.status === TaskStatuses.COMPLETED}
                          disabled={!canModifyTask(task) || task.status === TaskStatuses.COMPLETED}
                          onCheckedChange={() => handleTaskComplete(task)}
                          className="mt-1 h-4 w-4 text-accent border-neutral-300 rounded focus:ring-accent"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <Link href={`/task/${task.id}`}>
                              <a className={`text-sm font-medium text-neutral-900 ${task.status === TaskStatuses.COMPLETED ? 'line-through' : ''} hover:text-primary`}>
                                {task.title}
                              </a>
                            </Link>
                            {getStatusBadge(task)}
                          </div>
                          <div className={`mt-1 text-sm text-neutral-500 ${task.status === TaskStatuses.COMPLETED ? 'line-through' : ''}`}>
                            {task.description}
                          </div>
                          <div className="mt-2 flex items-center text-xs text-neutral-500">
                            <span className="flex items-center mr-4">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {task.status === TaskStatuses.COMPLETED ? (
                                `Completed on ${task.completedAt ? new Date(task.completedAt).toLocaleDateString() : 'N/A'}`
                              ) : (
                                task.dueDate ? (
                                  isPast(new Date(task.dueDate)) ? (
                                    <span className="text-danger">
                                      Due {formatDistanceToNow(new Date(task.dueDate))} ago
                                    </span>
                                  ) : (
                                    `Due ${formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}`
                                  )
                                ) : 'No due date'
                              )}
                            </span>
                            <span className="flex items-center mr-4">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              {getPhaseTitle(task.phase)}
                            </span>
                            <span className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                              {task.category.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-neutral-500">No tasks found matching the current filters</p>
              {(phaseFilter || categoryFilter || statusFilter || ownerFilter) && (
                <button 
                  className="mt-2 text-primary hover:text-primary-dark text-sm font-medium"
                  onClick={() => {
                    setPhaseFilter("");
                    setCategoryFilter("");
                    setStatusFilter("");
                    setOwnerFilter("");
                  }}
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        // Tasks list sorted by date
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
          <div className="bg-neutral-50 p-4 border-b border-neutral-200">
            <h3 className="text-lg font-semibold text-neutral-900">Tasks by Due Date</h3>
          </div>
          
          <div className="divide-y divide-neutral-200">
            {tasksByDate.length > 0 ? (
              tasksByDate.map(task => (
                <div key={task.id} className="p-4 flex items-start">
                  <Checkbox 
                    id={`task-${task.id}`}
                    checked={task.status === TaskStatuses.COMPLETED}
                    disabled={!canModifyTask(task) || task.status === TaskStatuses.COMPLETED}
                    onCheckedChange={() => handleTaskComplete(task)}
                    className="mt-1 h-4 w-4 text-accent border-neutral-300 rounded focus:ring-accent"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <Link 
                        href={`/task/${task.id}`}
                        className={`text-sm font-medium text-neutral-900 ${task.status === TaskStatuses.COMPLETED ? 'line-through' : ''} hover:text-primary`}
                      >
                        {task.title}
                      </Link>
                      <div className="flex items-center mt-1 sm:mt-0">
                        <span className="text-xs bg-neutral-100 text-neutral-700 rounded-full px-2 py-1 mr-2">
                          {getPhaseTitle(task.phase)}
                        </span>
                        {getStatusBadge(task)}
                      </div>
                    </div>
                    <div className={`mt-1 text-sm text-neutral-500 ${task.status === TaskStatuses.COMPLETED ? 'line-through' : ''}`}>
                      {task.description}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-y-2 text-xs text-neutral-500">
                      <span className="flex items-center mr-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {task.status === TaskStatuses.COMPLETED ? (
                          `Completed on ${task.completedAt ? new Date(task.completedAt).toLocaleDateString() : 'N/A'}`
                        ) : (
                          task.dueDate ? (
                            isPast(new Date(task.dueDate)) ? (
                              <span className="text-danger">
                                Due {formatDistanceToNow(new Date(task.dueDate))} ago
                              </span>
                            ) : (
                              `Due ${formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}`
                            )
                          ) : 'No due date'
                        )}
                      </span>
                      <span className="flex items-center mr-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {users.find(u => u.id === task.assignedTo)?.name || 'Unassigned'}
                      </span>
                      <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        {task.category.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <p className="text-neutral-500">No tasks found matching the current filters</p>
                {(phaseFilter || categoryFilter || statusFilter || ownerFilter) && (
                  <button 
                    className="mt-2 text-primary hover:text-primary-dark text-sm font-medium"
                    onClick={() => {
                      setPhaseFilter("");
                      setCategoryFilter("");
                      setStatusFilter("");
                      setOwnerFilter("");
                    }}
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
