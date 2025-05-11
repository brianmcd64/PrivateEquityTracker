import { useEffect, useState } from "react";
import { Task, TaskStatuses, User } from "@shared/schema";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from "recharts";

interface WorkloadChartProps {
  tasks: Task[];
  users: { id: number; name: string; role: string; specialization?: string | null }[];
}

export function WorkloadChart({ tasks, users }: WorkloadChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  
  useEffect(() => {
    if (!tasks.length || !users.length) return;
    
    // Create workload data for each user
    const userWorkloads = users.map(user => {
      // All tasks assigned to this user
      const assignedTasks = tasks.filter(task => task.assignedTo === user.id);
      
      // Completed tasks
      const completedTasks = assignedTasks.filter(task => task.status === TaskStatuses.COMPLETED);
      
      // In progress tasks
      const inProgressTasks = assignedTasks.filter(task => task.status === TaskStatuses.IN_PROGRESS);
      
      // Not started tasks
      const notStartedTasks = assignedTasks.filter(task => 
        task.status === TaskStatuses.NOT_STARTED || task.status === TaskStatuses.PENDING
      );
      
      // Overdue tasks
      const overdueTasks = assignedTasks.filter(task => {
        if (task.status === TaskStatuses.COMPLETED) return false;
        if (!task.dueDate) return false;
        return new Date(task.dueDate) < new Date();
      });
      
      return {
        name: user.name.split(' ')[0], // Just first name for better display
        role: user.role,
        total: assignedTasks.length,
        completed: completedTasks.length,
        inProgress: inProgressTasks.length,
        notStarted: notStartedTasks.length,
        overdue: overdueTasks.length
      };
    });
    
    // Sort by total number of tasks
    const sortedData = userWorkloads.sort((a, b) => b.total - a.total);
    
    setChartData(sortedData);
  }, [tasks, users]);
  
  // Colors for the stacked bars
  const colors = {
    completed: "#10b981", // green
    inProgress: "#3b82f6", // blue
    notStarted: "#64748b", // gray
    overdue: "#ef4444" // red
  };
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 10, right: 30, left: 70, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
        <XAxis type="number" />
        <YAxis 
          dataKey="name" 
          type="category" 
          scale="band" 
          tickLine={false}
          tick={{ fontSize: 12 }}
        />
        <Tooltip 
          formatter={(value: number, name: string) => {
            const displayNames = {
              completed: "Completed",
              inProgress: "In Progress",
              notStarted: "Not Started",
              overdue: "Overdue"
            };
            return [value, displayNames[name as keyof typeof displayNames] || name];
          }}
          labelFormatter={(label) => {
            const user = chartData.find(item => item.name === label);
            return `${user?.name} (${user?.role.split('_').map((word: string) => 
              word.charAt(0).toUpperCase() + word.slice(1)).join(' ')})`;
          }}
        />
        <Legend />
        <Bar dataKey="completed" stackId="a" name="Completed" fill={colors.completed} />
        <Bar dataKey="inProgress" stackId="a" name="In Progress" fill={colors.inProgress} />
        <Bar dataKey="notStarted" stackId="a" name="Not Started" fill={colors.notStarted} />
        <Bar dataKey="overdue" stackId="a" name="Overdue" fill={colors.overdue} />
      </BarChart>
    </ResponsiveContainer>
  );
}
