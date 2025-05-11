import { useState } from "react";
import { Layout } from "@/components/layout";
import { TaskList } from "@/components/tasks/task-list";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function ChecklistPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // For prototype, we'll use a hardcoded dealId
  const dealId = 1;
  
  const handleAddTask = () => {
    // In a production app, this would open a form to create a new task
    toast({
      title: "Feature not implemented",
      description: "Task creation form would appear here in the full application.",
    });
  };
  
  // Only deal leads and functional leads can add tasks
  const canAddTask = user && (user.role === "deal_lead" || user.role === "functional_lead");
  
  return (
    <Layout 
      title="Due Diligence Checklist" 
      subtitle="TechFusion Acquisition"
    >
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-end">
        {canAddTask && (
          <Button variant="default" onClick={handleAddTask}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        )}
      </div>
      
      <TaskList dealId={dealId} />
    </Layout>
  );
}
