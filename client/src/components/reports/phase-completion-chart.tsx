import { useEffect, useState } from "react";
import { Task, TaskPhases, TaskStatuses } from "@shared/schema";
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

interface PhaseCompletionChartProps {
  tasks: Task[];
}

export function PhaseCompletionChart({ tasks }: PhaseCompletionChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  
  useEffect(() => {
    if (!tasks.length) return;
    
    // Define phases in the desired order
    const phaseOrder = [
      TaskPhases.LOI_SIGNING,
      TaskPhases.PLANNING_INITIAL,
      TaskPhases.DOCUMENT_REVIEW,
      TaskPhases.MID_PHASE_REVIEW,
      TaskPhases.DEEP_DIVES,
      TaskPhases.FINAL_RISK_REVIEW,
      TaskPhases.DEAL_CLOSING
    ];
    
    // Create data for each phase
    const phaseData = phaseOrder.map(phase => {
      // All tasks in this phase
      const phaseTasks = tasks.filter(task => task.phase === phase);
      
      // Count by status
      const completedCount = phaseTasks.filter(task => task.status === TaskStatuses.COMPLETED).length;
      const inProgressCount = phaseTasks.filter(task => task.status === TaskStatuses.IN_PROGRESS).length;
      const pendingCount = phaseTasks.filter(task => task.status === TaskStatuses.PENDING).length;
      const notStartedCount = phaseTasks.filter(task => task.status === TaskStatuses.NOT_STARTED).length;
      const blockedCount = phaseTasks.filter(task => task.status === TaskStatuses.BLOCKED).length;
      const deferredCount = phaseTasks.filter(task => task.status === TaskStatuses.DEFERRED).length;
      
      // Calculate completion percentage
      const totalTasks = phaseTasks.length;
      const completionPercentage = totalTasks > 0 
        ? Math.round((completedCount / totalTasks) * 100) 
        : 0;
      
      // Get friendly phase name
      const phaseName = 
        phase === TaskPhases.LOI_SIGNING ? "LOI Signing" :
        phase === TaskPhases.PLANNING_INITIAL ? "Initial Planning" :
        phase === TaskPhases.DOCUMENT_REVIEW ? "Document Review" :
        phase === TaskPhases.MID_PHASE_REVIEW ? "Mid-Phase Review" :
        phase === TaskPhases.DEEP_DIVES ? "Deep Dives" :
        phase === TaskPhases.FINAL_RISK_REVIEW ? "Final Risk Review" :
        phase === TaskPhases.DEAL_CLOSING ? "Deal Closing" :
        phase === TaskPhases.POST_CLOSE ? "Post Close" :
        "Custom";
      
      return {
        phase: phaseName,
        phaseId: phase,
        completed: completedCount,
        inProgress: inProgressCount,
        pending: pendingCount,
        notStarted: notStartedCount,
        blocked: blockedCount,
        deferred: deferredCount,
        total: totalTasks,
        completionRate: completionPercentage
      };
    });
    
    setChartData(phaseData);
  }, [tasks]);
  
  // Colors for the stacked bars
  const colors = {
    completed: "#10b981", // green
    inProgress: "#3b82f6", // blue
    pending: "#f59e0b", // yellow
    notStarted: "#64748b", // gray
    blocked: "#ef4444", // red
    deferred: "#a78bfa" // purple
  };
  
  // Generate phase-specific color
  const getPhaseColor = (phaseId: string) => {
    switch (phaseId) {
      case TaskPhases.LOI_SIGNING:
        return "#3b82f6"; // blue
      case TaskPhases.PLANNING_INITIAL:
        return "#8b5cf6"; // purple
      case TaskPhases.DOCUMENT_REVIEW:
        return "#f59e0b"; // yellow
      case TaskPhases.MID_PHASE_REVIEW:
        return "#ec4899"; // pink
      case TaskPhases.DEEP_DIVES:
        return "#10b981"; // green
      case TaskPhases.FINAL_RISK_REVIEW:
        return "#ef4444"; // red
      case TaskPhases.DEAL_CLOSING:
        return "#06b6d4"; // cyan
      case TaskPhases.POST_CLOSE:
        return "#84cc16"; // lime
      default:
        return "#64748b"; // gray
    }
  };
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="phase" />
        <YAxis yAxisId="left" orientation="left" />
        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
        <Tooltip 
          formatter={(value: number, name: string) => {
            const displayNames = {
              completed: "Completed",
              inProgress: "In Progress",
              pending: "Pending Review",
              notStarted: "Not Started",
              completionRate: "Completion Rate"
            };
            return [name === "completionRate" ? `${value}%` : value, displayNames[name as keyof typeof displayNames] || name];
          }}
        />
        <Legend />
        <Bar yAxisId="left" dataKey="completed" stackId="a" name="Completed" fill={colors.completed} />
        <Bar yAxisId="left" dataKey="inProgress" stackId="a" name="In Progress" fill={colors.inProgress} />
        <Bar yAxisId="left" dataKey="pending" stackId="a" name="Pending Review" fill={colors.pending} />
        <Bar yAxisId="left" dataKey="notStarted" stackId="a" name="Not Started" fill={colors.notStarted} />
        <Bar yAxisId="right" dataKey="completionRate" name="Completion Rate (%)" fill="#111827">
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getPhaseColor(entry.phaseId)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
