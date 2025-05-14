import { useState, useEffect } from "react";
import { Task, TaskStatuses } from "@shared/schema";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Link } from "wouter";
import { formatDistanceToNow, isPast } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Calendar, User } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface KanbanBoardProps {
  tasks: Task[];
  onAddTask?: () => void;
  phaseFilter?: string;
  categoryFilter?: string;
  ownerFilter?: string;
}

// Mock users for the prototype
const userMap: Record<number, { name: string; role: string }> = {
  1: { name: "Sarah Johnson", role: "deal_lead" },
  2: { name: "Michael Reynolds", role: "functional_lead" },
  3: { name: "Amanda Lee", role: "functional_lead" },
  4: { name: "Tom Wilson", role: "functional_lead" },
};

export function KanbanBoard({ tasks, onAddTask, phaseFilter, categoryFilter, ownerFilter }: KanbanBoardProps) {
  const { toast } = useToast();
  const [customStatuses] = useLocalStorage<string[]>("customStatuses", []);
  
  // Combine default statuses with custom statuses
  const allStatuses = [
    TaskStatuses.NOT_STARTED,
    TaskStatuses.IN_PROGRESS,
    TaskStatuses.PENDING,
    TaskStatuses.COMPLETED,
    ...customStatuses
  ];
  
  // Filter tasks based on the provided filters
  const filteredTasks = tasks.filter(task => {
    return (
      (!phaseFilter || task.phase === phaseFilter) &&
      (!categoryFilter || task.category === categoryFilter) &&
      (!ownerFilter || (ownerFilter === "unassigned" ? !task.assignedTo : task.assignedTo === parseInt(ownerFilter)))
    );
  });
  
  // Group filtered tasks by status
  const tasksByStatus = allStatuses.reduce((groups, status) => {
    groups[status] = filteredTasks.filter(task => task.status === status);
    return groups;
  }, {} as Record<string, Task[]>);
  
  const handleTaskComplete = async (task: Task) => {
    try {
      if (task.status === TaskStatuses.COMPLETED) {
        // Uncomplete task (move back to in progress)
        await apiRequest("PATCH", `/api/tasks/${task.id}`, {
          status: TaskStatuses.IN_PROGRESS,
          completedAt: null
        });
      } else {
        // Complete task
        await apiRequest("PATCH", `/api/tasks/${task.id}`, {
          status: TaskStatuses.COMPLETED,
          completedAt: new Date()
        });
      }
      
      // Invalidate tasks query to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${task.dealId}/tasks`] });
      
      toast({
        title: task.status === TaskStatuses.COMPLETED ? "Task uncompleted" : "Task completed",
        description: `${task.title} has been ${task.status === TaskStatuses.COMPLETED ? "moved back to in progress" : "marked as complete"}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    }
  };
  
  const getStatusTitle = (status: string) => {
    switch (status) {
      case TaskStatuses.NOT_STARTED:
        return "Not Started";
      case TaskStatuses.IN_PROGRESS:
        return "In Progress";
      case TaskStatuses.PENDING:
        return "Pending Review";
      case TaskStatuses.COMPLETED:
        return "Completed";
      default:
        // Format custom status
        return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case TaskStatuses.NOT_STARTED:
        return "bg-neutral-100";
      case TaskStatuses.IN_PROGRESS:
        return "bg-blue-50";
      case TaskStatuses.PENDING:
        return "bg-yellow-50";
      case TaskStatuses.COMPLETED:
        return "bg-green-50";
      default:
        // Generate a deterministic color based on the status string
        const colors = [
          "bg-rose-50",
          "bg-purple-50",
          "bg-sky-50",
          "bg-emerald-50",
          "bg-amber-50",
          "bg-indigo-50",
        ];
        const colorIndex = status.charCodeAt(0) % colors.length;
        return colors[colorIndex];
    }
  };
  
  const getDueDateLabel = (task: Task) => {
    if (!task.dueDate) return "No due date";
    
    const dueDate = new Date(task.dueDate);
    if (isPast(dueDate) && task.status !== TaskStatuses.COMPLETED) {
      return (
        <span className="text-red-600">
          Due {formatDistanceToNow(dueDate)} ago
        </span>
      );
    }
    
    return `Due ${formatDistanceToNow(dueDate, { addSuffix: true })}`;
  };

  // Check if any filters are applied
  const hasFilters = phaseFilter || categoryFilter || ownerFilter;
  
  return (
    <div className="overflow-x-auto pb-4">
      {hasFilters && (
        <div className="mb-4 px-2 py-3 bg-neutral-50 rounded-md border border-neutral-200 text-sm flex items-center">
          <div className="text-neutral-500 font-medium">
            Filtered by: {' '}
            {phaseFilter && (
              <span className="inline-flex items-center bg-primary/10 text-primary rounded-full px-2 py-1 text-xs mr-2">
                Phase: {phaseFilter.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            )}
            {categoryFilter && (
              <span className="inline-flex items-center bg-primary/10 text-primary rounded-full px-2 py-1 text-xs mr-2">
                Category: {categoryFilter.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            )}
            {ownerFilter && (
              <span className="inline-flex items-center bg-primary/10 text-primary rounded-full px-2 py-1 text-xs mr-2">
                Owner: {ownerFilter === "unassigned" ? "Unassigned" : userMap[parseInt(ownerFilter)]?.name}
              </span>
            )}
          </div>
        </div>
      )}
      <div className="flex gap-4 min-w-max">
        {allStatuses.map(status => (
          <div key={status} className="w-[320px] flex-shrink-0">
            <div className={`p-4 rounded-t-md ${getStatusColor(status)}`}>
              <div className="flex justify-between items-center">
                <h3 className="font-medium">{getStatusTitle(status)}</h3>
                <span className="text-sm bg-white px-2 py-0.5 rounded-full">
                  {tasksByStatus[status]?.length || 0}
                </span>
              </div>
            </div>
            
            <div className="bg-neutral-50 p-4 rounded-b-md min-h-[400px]">
              {tasksByStatus[status]?.length > 0 ? (
                <div className="space-y-3">
                  {tasksByStatus[status].map(task => (
                    <Card key={task.id} className={`shadow-sm ${task.status === TaskStatuses.COMPLETED ? 'opacity-70' : ''}`}>
                      <CardHeader className="p-3 pb-0">
                        <Link href={`/task/${task.id}`} className={`text-sm font-medium text-neutral-900 ${task.status === TaskStatuses.COMPLETED ? 'line-through' : ''} hover:text-primary`}>
                          {task.title}
                        </Link>
                      </CardHeader>
                      <CardContent className="p-3 space-y-3">
                        {task.description && (
                          <p className={`text-xs text-neutral-600 ${task.status === TaskStatuses.COMPLETED ? 'line-through' : ''}`}>
                            {task.description.length > 100 ? 
                              task.description.substring(0, 100) + '...' : 
                              task.description}
                          </p>
                        )}
                        <div className="flex text-xs text-neutral-500 space-x-2">
                          <span className="inline-flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {getDueDateLabel(task)}
                          </span>
                        </div>
                      </CardContent>
                      <CardFooter className="p-3 pt-0 flex justify-between">
                        <div className="flex items-center">
                          {task.assignedTo ? (
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {userMap[task.assignedTo]?.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                              <AvatarImage 
                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userMap[task.assignedTo]?.name)}&background=eef2ff&color=4f46e5`} 
                                alt={userMap[task.assignedTo]?.name} 
                              />
                            </Avatar>
                          ) : (
                            <User className="h-4 w-4 text-neutral-400" />
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleTaskComplete(task)}
                          className="h-6 text-xs"
                        >
                          {task.status === TaskStatuses.COMPLETED ? "Reopen" : "Complete"}
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-neutral-400 text-sm">
                  <p>No tasks</p>
                  {onAddTask && status === TaskStatuses.NOT_STARTED && (
                    <Button variant="ghost" size="sm" onClick={onAddTask} className="mt-2">
                      <PlusCircle className="h-4 w-4 mr-1" />
                      Add Task
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}