import { useEffect, useState } from "react";
import { Task, TaskStatuses } from "@shared/schema";
import { format, formatDistanceToNow } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";
import { Link } from "wouter";

interface OverdueTasksListProps {
  tasks: Task[];
  users: { id: number; name: string; role: string; specialization?: string | null }[];
}

export function OverdueTasksList({ tasks, users }: OverdueTasksListProps) {
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  
  useEffect(() => {
    if (!tasks.length) return;
    
    // Get all overdue tasks
    const overdueList = tasks.filter(task => {
      if (task.status === TaskStatuses.COMPLETED) return false;
      if (!task.dueDate) return false;
      return new Date(task.dueDate) < new Date();
    });
    
    // Sort by due date (oldest first)
    const sortedList = overdueList.sort((a, b) => {
      if (!a.dueDate || !b.dueDate) return 0;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
    
    setOverdueTasks(sortedList);
  }, [tasks]);
  
  // Get assignee name from user id
  const getAssigneeName = (userId: number | null | undefined) => {
    if (!userId) return "Unassigned";
    const user = users.find(u => u.id === userId);
    return user ? user.name : "Unknown";
  };
  
  // Get category display name
  const getCategoryName = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };
  
  if (!overdueTasks.length) {
    return (
      <div className="text-center p-6 text-neutral-500">
        No overdue tasks found. Great job!
      </div>
    );
  }
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Task Name</TableHead>
          <TableHead>Assignee</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead>Overdue</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {overdueTasks.map(task => (
          <TableRow key={task.id}>
            <TableCell className="font-medium">{task.title}</TableCell>
            <TableCell>{getAssigneeName(task.assignedTo)}</TableCell>
            <TableCell>
              <Badge variant="outline">{getCategoryName(task.category)}</Badge>
            </TableCell>
            <TableCell>{task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "No due date"}</TableCell>
            <TableCell className="text-red-500 font-medium">
              {task.dueDate ? formatDistanceToNow(new Date(task.dueDate), { addSuffix: false }) : "N/A"}
            </TableCell>
            <TableCell>
              <Link href={`/task/${task.id}`}>
                <Button variant="ghost" size="sm" title="View Task">
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
