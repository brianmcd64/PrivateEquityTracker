import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Task, Document, Request } from "@shared/schema";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { CreateRequestForm } from "@/components/requests/create-request-form";
import { RequestsList } from "@/components/requests/requests-list";

// Simple component for document list
function DocumentList({ documents }: { documents: Document[] }) {
  if (!documents || documents.length === 0) {
    return <p className="text-center text-gray-500">No documents found.</p>;
  }
  
  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <Card key={doc.id} className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">{doc.fileName}</h3>
              <p className="text-sm text-gray-500">
                {doc.fileSize} bytes
              </p>
            </div>
            <Button size="sm" variant="outline">Download</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

interface TaskDetailViewProps {
  taskId: number;
}

export function TaskDetailView({ taskId }: TaskDetailViewProps) {
  const [activeTab, setActiveTab] = useState("details");
  const queryClient = useQueryClient();

  // Fetch task data
  const { data: task, isLoading, error } = useQuery<Task>({
    queryKey: [`/api/tasks/${taskId}`],
  });

  // Fetch documents for this task
  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: [`/api/tasks/${taskId}/documents`],
    enabled: !!taskId,
  });

  // Fetch requests for this task
  const { data: requests = [] } = useQuery<Request[]>({
    queryKey: [`/api/tasks/${taskId}/requests`],
    enabled: !!taskId,
  });
  
  // Function to refresh requests data
  const refreshRequests = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/requests`] });
  };

  if (isLoading) {
    return <div className="text-center p-4">Loading task details...</div>;
  }

  if (error || !task) {
    return <div className="text-center p-4 text-red-500">Error loading task data</div>;
  }

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      "not_started": "bg-gray-200 text-gray-800",
      "in_progress": "bg-blue-200 text-blue-800",
      "completed": "bg-green-200 text-green-800",
      "blocked": "bg-red-200 text-red-800",
      "deferred": "bg-yellow-200 text-yellow-800",
    };
    return statusMap[status] || "bg-gray-200 text-gray-800";
  };

  const formatPhase = (phase: string) => {
    return phase.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const formatCategory = (category: string) => {
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-bold">{task.title}</CardTitle>
            <CardDescription>
              Deal: {task.dealId} | Phase: {formatPhase(task.phase)} | Category: {formatCategory(task.category)}
            </CardDescription>
          </div>
          <Badge className={getStatusColor(task.status)}>
            {task.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
          </Badge>
        </div>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mx-6">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="requests">Requests ({requests.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="p-0">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Description</h3>
                <p className="mt-1">{task.description || "No description provided."}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Due Date</h3>
                  <p className="mt-1">{task.dueDate ? format(new Date(task.dueDate), 'PPP') : "No due date set"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Assigned To</h3>
                  <p className="mt-1">{task.assignedTo || "Unassigned"}</p>
                </div>
              </div>
              
              {task.completedAt && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Completed On</h3>
                  <p className="mt-1">{format(new Date(task.completedAt), 'PPP')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </TabsContent>
        
        <TabsContent value="documents" className="p-0">
          <CardContent className="pt-6">
            {documents.length > 0 ? (
              <DocumentList documents={documents} />
            ) : (
              <p className="text-center py-4 text-gray-500">No documents attached to this task.</p>
            )}
          </CardContent>
        </TabsContent>
        
        <TabsContent value="requests" className="p-0">
          <CardContent className="pt-6">
            {requests.length > 0 ? (
              <RequestsList requests={requests} onUpdateRequest={refreshRequests} />
            ) : (
              <p className="text-center py-4 text-gray-500">No requests created for this task.</p>
            )}
          </CardContent>
        </TabsContent>
      </Tabs>
      
      <CardFooter className="flex justify-between pt-6 border-t">
        <Button variant="outline">Edit Task</Button>
        <CreateRequestForm task={task} onComplete={refreshRequests} />
      </CardFooter>
    </Card>
  );
}