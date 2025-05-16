import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Task, Document, Request, TaskStatuses, TaskPhases, TaskCategories } from "@shared/schema";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { CreateRequestForm } from "@/components/requests/create-request-form";
import { RequestsList } from "@/components/requests/requests-list";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

// Task edit form schema
const taskEditSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.string(),
  phase: z.string(),
  category: z.string(),
  dueDate: z.string().optional(),
  assignedTo: z.number().optional(),
});

type TaskEditValues = z.infer<typeof taskEditSchema>;

interface TaskDetailViewProps {
  taskId: number;
}

// Edit Task Dialog Component
function EditTaskDialog({ task, onComplete }: { task: Task, onComplete: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Convert task.dueDate to YYYY-MM-DD format for the date input
  const formatDateForInput = (dateString: string | null | undefined) => {
    if (!dateString) return "";
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };
  
  // Form setup
  const form = useForm<TaskEditValues>({
    resolver: zodResolver(taskEditSchema),
    defaultValues: {
      title: task.title,
      description: task.description || "",
      status: task.status,
      phase: task.phase,
      category: task.category,
      dueDate: formatDateForInput(task.dueDate),
      assignedTo: task.assignedTo || undefined,
    },
  });
  
  // Debug the form submission
  console.log("Task original values:", {
    title: task.title,
    description: task.description,
    status: task.status,
    phase: task.phase,
    category: task.category,
    dueDate: task.dueDate,
    assignedTo: task.assignedTo
  });
  
  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async (data: TaskEditValues) => {
      // Log the data being sent
      console.log("Submitting task update:", data);
      
      // Make sure dueDate is in the proper format
      const formattedData = {
        ...data,
        // Keep dueDate as is - it's already a string from the form
      };
      
      console.log("Formatted data for submission:", formattedData);
      return apiRequest("PATCH", `/api/tasks/${task.id}`, formattedData);
    },
    onSuccess: () => {
      toast({
        title: "Task updated",
        description: "The task has been successfully updated.",
      });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${task.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${task.dealId}/tasks`] });
      
      // Close dialog and call onComplete if provided
      setIsOpen(false);
      if (onComplete) {
        onComplete();
      }
    },
    onError: (error: any) => {
      console.error("Error updating task:", error);
      // Show more detailed error message if available
      const errorMsg = error.errors ? JSON.stringify(error.errors) : "Please try again.";
      toast({
        title: "Error updating task",
        description: `There was an error updating the task: ${errorMsg}`,
        variant: "destructive",
      });
    },
  });
  
  // Form submission handler
  const onSubmit = (data: TaskEditValues) => {
    updateTaskMutation.mutate(data);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Edit Task</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={TaskStatuses.NOT_STARTED}>Not Started</SelectItem>
                        <SelectItem value={TaskStatuses.IN_PROGRESS}>In Progress</SelectItem>
                        <SelectItem value={TaskStatuses.COMPLETED}>Completed</SelectItem>
                        <SelectItem value={TaskStatuses.BLOCKED}>Blocked</SelectItem>
                        <SelectItem value={TaskStatuses.DEFERRED}>Deferred</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phase"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phase</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select phase" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={TaskPhases.LOI_SIGNING}>LOI Signing</SelectItem>
                        <SelectItem value={TaskPhases.PLANNING_INITIAL}>Planning Initial</SelectItem>
                        <SelectItem value={TaskPhases.DOCUMENT_REVIEW}>Document Review</SelectItem>
                        <SelectItem value={TaskPhases.MID_PHASE_REVIEW}>Mid Phase Review</SelectItem>
                        <SelectItem value={TaskPhases.DEEP_DIVES}>Deep Dives</SelectItem>
                        <SelectItem value={TaskPhases.FINAL_RISK_REVIEW}>Final Risk Review</SelectItem>
                        <SelectItem value={TaskPhases.DEAL_CLOSING}>Deal Closing</SelectItem>
                        <SelectItem value={TaskPhases.POST_CLOSE}>Post Close</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={TaskCategories.OPERATING_TEAM}>Operating Team</SelectItem>
                      <SelectItem value={TaskCategories.SELLER_BROKER}>Seller Broker</SelectItem>
                      <SelectItem value={TaskCategories.IR_BANK}>IR Bank</SelectItem>
                      <SelectItem value={TaskCategories.LEGAL}>Legal</SelectItem>
                      <SelectItem value={TaskCategories.FINANCIAL}>Financial</SelectItem>
                      <SelectItem value={TaskCategories.INVESTMENT_COMMITTEE}>Investment Committee</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateTaskMutation.isPending}>
                {updateTaskMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
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
          <div className="flex items-center gap-3">
            <Badge className={getStatusColor(task.status)}>
              {task.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </Badge>
            <EditTaskDialog task={task} onComplete={() => queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] })} />
          </div>
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
      
      <CardFooter className="flex justify-end pt-6 border-t">
        <CreateRequestForm task={task} onComplete={refreshRequests} />
      </CardFooter>
    </Card>
  );
}