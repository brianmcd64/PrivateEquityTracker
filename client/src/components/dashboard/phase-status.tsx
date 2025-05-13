import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Task, TaskPhases, TaskStatuses } from "@shared/schema";

interface PhaseStatusProps {
  dealId: number;
}

export function PhaseStatus({ dealId }: PhaseStatusProps) {
  const { data: tasks, isLoading, error } = useQuery<Task[]>({
    queryKey: [`/api/deals/${dealId}/tasks`],
  });

  const getPhaseStatus = (phase: string) => {
    if (!tasks) return { complete: 0, total: 0, percentage: 0, status: "Not Started" };
    
    const phaseTasks = tasks.filter(task => task.phase === phase);
    const completedTasks = phaseTasks.filter(task => task.status === TaskStatuses.COMPLETED);
    
    const complete = completedTasks.length;
    const total = phaseTasks.length;
    const percentage = total ? Math.round((complete / total) * 100) : 0;
    
    let status = "Not Started";
    if (percentage === 100) status = "Complete";
    else if (percentage > 0) status = `In Progress (${percentage}%)`;
    
    return { complete, total, percentage, status };
  };

  const phases = [
    { id: TaskPhases.LOI_SIGNING, name: "LOI Signing & DD Kickoff" },
    { id: TaskPhases.PLANNING_INITIAL, name: "Planning & Initial Information Requests" },
    { id: TaskPhases.DOCUMENT_REVIEW, name: "Document Review & Tracker Updates" },
    { id: TaskPhases.MID_PHASE_REVIEW, name: "Mid-Phase Review" },
    { id: TaskPhases.DEEP_DIVES, name: "Deep Dives & Secondary Requests" },
    { id: TaskPhases.FINAL_RISK_REVIEW, name: "Final Risk Review & Negotiation" },
    { id: TaskPhases.DEAL_CLOSING, name: "Deal Closing Preparation" },
    { id: TaskPhases.POST_CLOSE, name: "Post-Close Integration Planning" }
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Phase Status</h3>
          <div className="h-40 flex items-center justify-center">
            <p className="text-neutral-500">Loading phase status...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Phase Status</h3>
          <div className="h-40 flex items-center justify-center">
            <p className="text-red-500">Failed to load phase status</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Phase Status</h3>
        <div className="space-y-4">
          {phases.map((phase) => {
            const status = getPhaseStatus(phase.id);
            return (
              <div key={phase.id}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">{phase.name}</span>
                  <span className={`text-xs font-medium ${
                    status.percentage === 100 
                      ? "text-success" 
                      : status.percentage > 0 
                        ? "text-warning" 
                        : "text-neutral-500"
                  }`}>
                    {status.status}
                  </span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div 
                    className={`${
                      status.percentage === 100 
                        ? "bg-success" 
                        : status.percentage > 0 
                          ? "bg-warning" 
                          : "bg-neutral-400"
                    } h-2 rounded-full`}
                    style={{ width: `${status.percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
