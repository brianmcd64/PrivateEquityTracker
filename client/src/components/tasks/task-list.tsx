import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Task, TaskPhases, TaskCategories, TaskStatuses } from "@shared/schema";
import { formatDistanceToNow, isPast, addDays } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface TaskListProps {
  dealId: number;
}

export function TaskList({ dealId }: TaskListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [phaseFilter, setPhaseFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [ownerFilter, setOwnerFilter] = useState<string>("");
  
  // Fetch all tasks for the deal
  const { data: tasks, isLoading, error } = useQuery<Task[]>({
    queryKey: [`/api/deals/${dealId}/tasks`],
  });
  
  // Fetch users to show as assignees (simplified for prototype)
  const users = [
    { id: 1, name: "Sarah Johnson" },
    { id: 2, name: "Michael Reynolds" },
    { id: 3, name: "Amanda Lee" },
    { id: 4, name: "Tom Wilson" },
  ];
  
  // Group tasks by phase
  const [groupedTasks, setGroupedTasks] = useState<Record<string, Task[]>>({});
  
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
      
      // Group by phase
      const grouped: Record<string, Task[]> = {};
      for (const task of filteredTasks) {
        if (!grouped[task.phase]) {
          grouped[task.phase] = [];
        }
        grouped[task.phase].push(task);
      }
      
      setGroupedTasks(grouped);
    }
  }, [tasks, phaseFilter, categoryFilter, statusFilter, ownerFilter]);
  
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
      case TaskPhases.LOI:
        return "bg-accent";
      case TaskPhases.DOCUMENT:
        return "bg-warning";
      case TaskPhases.DEEPDIVE:
        return "bg-success";
      case TaskPhases.FINAL:
        return "bg-danger";
      default:
        return "bg-accent";
    }
  };
  
  const getPhaseTitle = (phase: string) => {
    switch (phase) {
      case TaskPhases.LOI:
        return "LOI Phase";
      case TaskPhases.DOCUMENT:
        return "Document Review Phase";
      case TaskPhases.DEEPDIVE:
        return "Deep Dive Phase";
      case TaskPhases.FINAL:
        return "Final Analysis Phase";
      default:
        return "Unknown Phase";
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
      default:
        return null;
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
              <option value={TaskPhases.LOI}>LOI</option>
              <option value={TaskPhases.DOCUMENT}>Document Review</option>
              <option value={TaskPhases.DEEPDIVE}>Deep Dive</option>
              <option value={TaskPhases.FINAL}>Final Analysis</option>
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
              <option value={TaskCategories.FINANCIAL}>Financial</option>
              <option value={TaskCategories.LEGAL}>Legal</option>
              <option value={TaskCategories.OPERATIONS}>Operations</option>
              <option value={TaskCategories.HR}>Human Resources</option>
              <option value={TaskCategories.TECH}>Technology</option>
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
      </div>
      
      {/* Task Lists by Phase */}
      <div className="space-y-8">
        {Object.keys(groupedTasks).length > 0 ? (
          Object.entries(groupedTasks).map(([phase, tasks]) => {
            const phaseStatus = getPhaseStatus(phase);
            const allCompleted = tasks.every(task => task.status === TaskStatuses.COMPLETED);
            
            return (
              <div key={phase} className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
                <div className="bg-neutral-50 p-4 border-b border-neutral-200 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-2 h-6 ${getPhaseColor(phase)} rounded-full mr-3`}></div>
                    <h3 className="text-lg font-semibold text-neutral-900">{getPhaseTitle(phase)}</h3>
                    <span className={`ml-3 px-2 py-1 ${
                      allCompleted 
                        ? "bg-success/10 text-success" 
                        : tasks.some(t => t.status === TaskStatuses.COMPLETED)
                          ? "bg-warning/10 text-warning"
                          : "bg-neutral-100 text-neutral-500"
                    } text-xs font-medium rounded-full`}>
                      {allCompleted ? "Complete" : "In Progress"}
                    </span>
                  </div>
                  <span className="text-sm text-neutral-500">{phaseStatus.complete}/{phaseStatus.total} tasks complete</span>
                </div>
                
                <div className="divide-y divide-neutral-200">
                  {tasks.map(task => (
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
                          <span className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {users.find(u => u.id === task.assignedTo)?.name || 'Unassigned'}
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
    </div>
  );
}
