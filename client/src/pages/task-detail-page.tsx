import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Task } from "@shared/schema";
import { Layout } from "@/components/layout";
import { TaskDetailView } from "@/components/tasks/task-detail-view";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const taskId = id; // Map the id parameter for clarity
  const [, navigate] = useLocation();
  
  // Fetch task data to get the deal ID for navigation
  const { data: task, isLoading, error } = useQuery<Task>({
    queryKey: [`/api/tasks/${taskId}`],
    enabled: !!taskId,
  });
  
  // Navigate back to the deal page
  const handleBack = () => {
    if (task?.dealId) {
      navigate(`/deal/${task.dealId}`);
    } else {
      navigate("/deals");
    }
  };
  
  // Render error message if task not found
  if (error) {
    return (
      <Layout title="Task Details">
        <Card className="max-w-3xl mx-auto">
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-red-500">Error Loading Task</h2>
              <p className="mt-2 text-gray-600">The task you're looking for could not be found.</p>
              <Button onClick={() => navigate("/deals")} className="mt-4">
                Back to Deals
              </Button>
            </div>
          </CardContent>
        </Card>
      </Layout>
    );
  }
  
  return (
    <Layout 
      title={
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            className="mr-2 h-8 w-8 p-0" 
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span>Task Details</span>
        </div>
      }
      subtitle={isLoading ? "Loading..." : task?.title}
    >
      <div className="max-w-3xl mx-auto">
        {isLoading ? (
          <div className="text-center py-8">Loading task details...</div>
        ) : taskId ? (
          <TaskDetailView taskId={parseInt(taskId)} />
        ) : (
          <div className="text-center py-8 text-red-500">Task ID not provided</div>
        )}
      </div>
    </Layout>
  );
}