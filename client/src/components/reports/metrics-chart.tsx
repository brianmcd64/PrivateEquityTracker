import { useEffect, useState } from "react";
import { Task, TaskStatuses } from "@shared/schema";
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { eachMonthOfInterval, format, subMonths } from "date-fns";

interface MetricsChartProps {
  tasks: Task[];
}

export function MetricsChart({ tasks }: MetricsChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  
  useEffect(() => {
    if (!tasks.length) return;
    
    // Create monthly data points for the last 6 months
    const today = new Date();
    const sixMonthsAgo = subMonths(today, 5); // To get 6 months including current month
    
    const monthRange = eachMonthOfInterval({
      start: sixMonthsAgo,
      end: today
    });
    
    // Generate chart data
    const data = monthRange.map(month => {
      const monthStr = format(month, "MMM");
      const nextMonth = new Date(month);
      nextMonth.setMonth(month.getMonth() + 1);
      
      // Count tasks completed by this month
      const completedCount = tasks.filter(task => {
        if (task.status !== TaskStatuses.COMPLETED || !task.completedAt) return false;
        const completedDate = new Date(task.completedAt);
        return completedDate < nextMonth;
      }).length;
      
      // Total tasks that existed by this month (based on creation date)
      const totalTasksCount = tasks.filter(task => {
        const createdDate = new Date(task.createdAt);
        return createdDate < nextMonth;
      }).length;
      
      // Completion rate
      const completionRate = totalTasksCount > 0 
        ? Math.round((completedCount / totalTasksCount) * 100)
        : 0;
      
      return {
        month: monthStr,
        completed: completedCount,
        total: totalTasksCount,
        rate: completionRate
      };
    });
    
    setChartData(data);
  }, [tasks]);
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={chartData}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis yAxisId="left" />
        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
        <Tooltip 
          formatter={(value: number, name: string) => {
            return [value, name === "rate" ? "Completion Rate (%)" : name === "completed" ? "Tasks Completed" : "Total Tasks"];
          }}
        />
        <Legend />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="completed"
          stroke="#3b82f6"
          name="Tasks Completed"
          strokeWidth={2}
          activeDot={{ r: 8 }}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="total"
          stroke="#64748b"
          name="Total Tasks"
          strokeWidth={2}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="rate"
          stroke="#10b981"
          name="Completion Rate (%)"
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
