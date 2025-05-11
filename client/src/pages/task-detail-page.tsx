import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { TaskDetail } from "@/components/tasks/task-detail";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [taskId, setTaskId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      const parsedId = parseInt(id);
      if (isNaN(parsedId)) {
        setError("Invalid task ID");
        toast({
          title: "Error",
          description: "Invalid task ID",
          variant: "destructive",
        });
      } else {
        setTaskId(parsedId);
      }
    } else {
      setError("No task ID provided");
      toast({
        title: "Error",
        description: "No task ID provided",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  }, [id, toast]);

  const handleBack = () => {
    navigate("/checklist");
  };

  if (isLoading) {
    return (
      <Layout title="Task Details" subtitle="Loading...">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error || !taskId) {
    return (
      <Layout title="Error" subtitle="Task not found">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-red-500 text-center">
            <p className="text-lg font-semibold">{error || "Unknown error"}</p>
            <button
              onClick={() => navigate("/checklist")}
              className="mt-4 text-primary hover:underline"
            >
              Return to Checklist
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Task Details" subtitle="TechFusion Acquisition">
      <TaskDetail taskId={taskId} onBack={handleBack} />
    </Layout>
  );
}
