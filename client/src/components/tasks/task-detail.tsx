import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Task, Document, User, TaskPhases, TaskCategories, TaskStatuses } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Download, Trash2, Upload, ChevronLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { RequestForm } from "./request-form";

interface TaskDetailProps {
  taskId: number;
  onBack: () => void;
}

export function TaskDetail({ taskId, onBack }: TaskDetailProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  // Load custom fields from localStorage
  const [customPhases] = useLocalStorage<string[]>("customPhases", []);
  const [customCategories] = useLocalStorage<string[]>("customCategories", []);
  const [customStatuses] = useLocalStorage<string[]>("customStatuses", []);
  
  // Fetch task details
  const { data: task, isLoading: isTaskLoading, isError: isTaskError } = useQuery<Task>({
    queryKey: [`/api/tasks/${taskId}`],
  });
  
  // Fetch documents for the task
  const { data: documents, isLoading: isDocsLoading } = useQuery<Document[]>({
    queryKey: [`/api/tasks/${taskId}/documents`],
    enabled: !!taskId,
  });
  
  // Mock users for the prototype
  const userMap: Record<number, User> = {
    1: { id: 1, username: "sarah.johnson@example.com", password: "", name: "Sarah Johnson", role: "deal_lead", specialization: null },
    2: { id: 2, username: "michael.reynolds@example.com", password: "", name: "Michael Reynolds", role: "functional_lead", specialization: "financial" },
    3: { id: 3, username: "amanda.lee@example.com", password: "", name: "Amanda Lee", role: "functional_lead", specialization: "legal" },
    4: { id: 4, username: "tom.wilson@example.com", password: "", name: "Tom Wilson", role: "functional_lead", specialization: "operations" },
  };
  
  // State for form fields
  const [formState, setFormState] = useState({
    title: "",
    description: "",
    phase: "",
    category: "",
    status: "",
    dueDate: "",
    assignedTo: 0 as number | undefined, // Using type assertion to allow undefined
  });
  
  useEffect(() => {
    if (task) {
      setFormState({
        title: task.title,
        description: task.description || "",
        phase: task.phase,
        category: task.category,
        status: task.status,
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "",
        assignedTo: task.assignedTo || 0,
      });
    }
  }, [task]);
  
  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async (updatedTask: Partial<Task>) => {
      const res = await apiRequest("PATCH", `/api/tasks/${taskId}`, updatedTask);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${task?.dealId}/tasks`] });
      
      toast({
        title: "Task updated",
        description: "The task has been successfully updated.",
      });
      
      setEditMode(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update task: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Document upload mutation (simulated for prototype)
  const uploadDocumentMutation = useMutation({
    mutationFn: async (formData: any) => {
      // In a real app, this would be a multipart/form-data upload
      // For the prototype, we're simulating it
      const doc = {
        taskId,
        fileName: formData.fileName,
        fileSize: formData.fileSize,
        fileType: formData.fileType,
        content: "Simulated file content",
        uploadedBy: user?.id || 1,
      };
      
      const res = await apiRequest("POST", "/api/documents", { ...doc, dealId: task?.dealId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/documents`] });
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${task?.dealId}/recent-documents`] });
      
      toast({
        title: "Document uploaded",
        description: "The document has been successfully uploaded.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to upload document: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    if (name === "assignedTo") {
      // Convert to number or keep as undefined/null
      setFormState((prev) => ({ 
        ...prev, 
        [name]: value ? parseInt(value) : undefined 
      }));
    } else {
      setFormState((prev) => ({ ...prev, [name]: value }));
    }
  };
  
  const handleSave = () => {
    updateTaskMutation.mutate({
      title: formState.title,
      description: formState.description,
      phase: formState.phase,
      category: formState.category,
      status: formState.status,
      dueDate: formState.dueDate ? new Date(formState.dueDate) : undefined,
      assignedTo: formState.assignedTo || undefined,
    });
  };
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Simulate document upload
    uploadDocumentMutation.mutate({
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });
    
    // Reset file input
    e.target.value = "";
  };
  
  const canEditTask = () => {
    if (!user || !task) return false;
    
    // Deal leads can edit any task
    if (user.role === "deal_lead") return true;
    
    // Functional leads can only edit tasks in their specialty
    if (user.role === "functional_lead" && user.specialization === task.category) return true;
    
    // Partners cannot edit tasks
    return false;
  };
  
  if (isTaskLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-neutral-500">Loading task details...</div>
      </div>
    );
  }
  
  if (isTaskError || !task) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-red-500">Error loading task details. The task may not exist or you don't have permission to view it.</div>
      </div>
    );
  }
  
  // Format status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case TaskStatuses.COMPLETED:
        return <span className="text-xs font-medium bg-success/10 text-success px-2 py-0.5 rounded-full">Completed</span>;
      case TaskStatuses.IN_PROGRESS:
        return <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">In Progress</span>;
      case TaskStatuses.PENDING:
        return <span className="text-xs font-medium bg-warning/10 text-warning px-2 py-0.5 rounded-full">Pending Review</span>;
      case TaskStatuses.NOT_STARTED:
        return <span className="text-xs font-medium bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded-full">Not Started</span>;
      default:
        // Check if this is a custom status from localStorage
        if (customStatuses.includes(status)) {
          // Use a default styling for custom statuses
          return (
            <span className="text-xs font-medium bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full">
              {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
            </span>
          );
        }
        return null;
    }
  };
  
  // Get file icon
  const getFileIcon = (fileType: string) => {
    const color = fileType.includes("pdf") 
      ? "text-red-500" 
      : fileType.includes("spreadsheet") || fileType.includes("excel") 
        ? "text-green-500" 
        : fileType.includes("word") 
          ? "text-blue-500" 
          : "text-yellow-500";
          
    return <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${color} mr-3`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>;
  };
  
  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-4">
        <Button variant="ghost" onClick={onBack} className="text-neutral-600 hover:text-primary flex items-center">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Checklist
        </Button>
      </div>
      
      <Card>
        <div className="border-b border-neutral-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              {editMode ? (
                <Input 
                  name="title"
                  value={formState.title}
                  onChange={handleInputChange}
                  className="text-xl font-bold"
                />
              ) : (
                <h2 className="text-xl font-bold text-neutral-900">{task.title}</h2>
              )}
              {editMode ? (
                <Textarea 
                  name="description"
                  value={formState.description}
                  onChange={handleInputChange}
                  className="mt-2"
                />
              ) : (
                <p className="text-neutral-500 mt-1">{task.description}</p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {getStatusBadge(task.status)}
              {canEditTask() && !editMode && (
                <Button variant="outline" onClick={() => setEditMode(true)}>
                  Edit
                </Button>
              )}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
          <div className="md:col-span-2 space-y-6">
            {!editMode && (
              <div>
                <h3 className="text-sm font-medium text-neutral-900 mb-2">Description</h3>
                <div className="bg-neutral-50 p-4 rounded-md border border-neutral-200 text-sm text-neutral-700">
                  <p>{task.description || "No detailed description provided."}</p>
                </div>
              </div>
            )}
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-neutral-900">Attachments</h3>
                {canEditTask() && (
                  <div className="relative">
                    <input
                      type="file"
                      id="file-upload"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={handleFileUpload}
                    />
                    <label
                      htmlFor="file-upload"
                      className="text-accent text-sm font-medium hover:text-accent-dark flex items-center cursor-pointer"
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Add Files
                    </label>
                  </div>
                )}
              </div>
              <div className="bg-neutral-50 rounded-md border border-neutral-200 divide-y divide-neutral-200">
                {isDocsLoading ? (
                  <div className="p-4 text-center text-neutral-500">Loading documents...</div>
                ) : documents && documents.length > 0 ? (
                  documents.map((doc) => (
                    <div key={doc.id} className="p-3 flex items-center justify-between">
                      <div className="flex items-center">
                        {getFileIcon(doc.fileType)}
                        <div>
                          <p className="text-sm font-medium text-neutral-900">{doc.fileName}</p>
                          <p className="text-xs text-neutral-500">
                            {formatFileSize(doc.fileSize)} • Uploaded {formatDistanceToNow(new Date(doc.uploadedAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="icon" title="Download">
                          <Download className="h-5 w-5 text-neutral-400 hover:text-neutral-600" />
                        </Button>
                        {canEditTask() && (
                          <Button variant="ghost" size="icon" title="Delete">
                            <Trash2 className="h-5 w-5 text-neutral-400 hover:text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-neutral-500">No documents attached to this task</div>
                )}
                
                {canEditTask() && (
                  <div className="p-6 border-2 border-dashed border-neutral-300 rounded-md text-center">
                    <Upload className="mx-auto h-10 w-10 text-neutral-400" />
                    <p className="mt-2 text-sm text-neutral-600">
                      Drag files here or <label htmlFor="file-upload" className="text-accent font-medium cursor-pointer">browse</label> to upload
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      PDF, Excel, Word, PowerPoint (Max 50MB)
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-neutral-900 mb-2">Activity</h3>
              <div className="bg-neutral-50 rounded-md border border-neutral-200">
                <div className="border-b border-neutral-200 p-3">
                  <div className="flex items-start">
                    <Avatar className="h-8 w-8 mr-3">
                      <AvatarFallback>SJ</AvatarFallback>
                      <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userMap[1].name)}&background=eef2ff&color=4f46e5`} alt={userMap[1].name} />
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <span className="font-medium text-neutral-900 mr-2">{userMap[1].name}</span>
                        <span className="text-neutral-500 text-sm">assigned to</span>
                        <span className="font-medium text-neutral-900 ml-2">{task.assignedTo ? userMap[task.assignedTo]?.name || "Unknown" : "Unassigned"}</span>
                      </div>
                      <p className="text-xs text-neutral-500">{formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}</p>
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex items-start">
                    <Avatar className="h-8 w-8 mr-3">
                      <AvatarFallback>SJ</AvatarFallback>
                      <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userMap[1].name)}&background=eef2ff&color=4f46e5`} alt={userMap[1].name} />
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <span className="font-medium text-neutral-900 mr-2">{userMap[1].name}</span>
                        <span className="text-neutral-500 text-sm">created this task</span>
                      </div>
                      <p className="text-xs text-neutral-500">{formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex items-start">
                <Avatar className="h-8 w-8 mr-3">
                  <AvatarFallback>{user?.name?.substring(0, 2) || "U"}</AvatarFallback>
                  <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || "User")}&background=eef2ff&color=4f46e5`} alt={user?.name || "User"} />
                </Avatar>
                <div className="flex-1">
                  <Textarea className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm" rows={2} placeholder="Add a comment..." />
                  <div className="mt-2 flex justify-end">
                    <Button variant="default" size="sm">
                      Post Comment
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-neutral-50 p-4 rounded-md border border-neutral-200">
              <h3 className="text-sm font-medium text-neutral-900 mb-3">Task Details</h3>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="phase" className="text-xs text-neutral-500 mb-1">Phase</Label>
                  {editMode ? (
                    <Select 
                      name="phase" 
                      value={formState.phase} 
                      onValueChange={(value) => handleSelectChange("phase", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select phase" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="loi_signing">LOI Signing & DD Kickoff</SelectItem>
                        <SelectItem value="planning_initial">Planning & Initial Information Requests</SelectItem>
                        <SelectItem value="document_review">Document Review & Tracker Updates</SelectItem>
                        <SelectItem value="mid_phase_review">Mid-Phase Review</SelectItem>
                        <SelectItem value="deep_dives">Deep Dives & Secondary Requests</SelectItem>
                        <SelectItem value="final_risk_review">Final Risk Review & Negotiation</SelectItem>
                        <SelectItem value="deal_closing">Deal Closing Preparation</SelectItem>
                        <SelectItem value="post_close">Post-Close Integration Planning</SelectItem>
                        
                        {/* Display custom phases */}
                        {customPhases.length > 0 && <SelectSeparator />}
                        {customPhases.map((phase) => (
                          <SelectItem key={phase} value={phase}>
                            {phase.charAt(0).toUpperCase() + phase.slice(1).replace(/_/g, ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-sm py-1.5">
                      {task.phase === "loi_signing" ? "LOI Signing & DD Kickoff" : 
                       task.phase === "planning_initial" ? "Planning & Initial Information Requests" : 
                       task.phase === "document_review" ? "Document Review & Tracker Updates" :
                       task.phase === "mid_phase_review" ? "Mid-Phase Review" :
                       task.phase === "deep_dives" ? "Deep Dives & Secondary Requests" :
                       task.phase === "final_risk_review" ? "Final Risk Review & Negotiation" :
                       task.phase === "deal_closing" ? "Deal Closing Preparation" :
                       task.phase === "post_close" ? "Post-Close Integration Planning" :
                       // Handle custom phases
                       customPhases.includes(task.phase) ? 
                         task.phase.charAt(0).toUpperCase() + task.phase.slice(1).replace(/_/g, ' ') : 
                         task.phase.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                      }
                    </div>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="category" className="text-xs text-neutral-500 mb-1">Category</Label>
                  {editMode ? (
                    <Select 
                      name="category" 
                      value={formState.category} 
                      onValueChange={(value) => handleSelectChange("category", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="operating_team">Operating Team</SelectItem>
                        <SelectItem value="seller_broker">Seller / Broker</SelectItem>
                        <SelectItem value="ir_bank">IR / Bank</SelectItem>
                        <SelectItem value="legal">Legal</SelectItem>
                        <SelectItem value="financial">Financial</SelectItem>
                        <SelectItem value="investment_committee">Investment Committee</SelectItem>
                        
                        {/* Display custom categories */}
                        {customCategories.length > 0 && <Separator className="my-1" />}
                        {customCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-sm py-1.5">
                      {task.category === "operating_team" ? "Operating Team" :
                       task.category === "seller_broker" ? "Seller / Broker" :
                       task.category === "ir_bank" ? "IR / Bank" :
                       task.category === "legal" ? "Legal" :
                       task.category === "financial" ? "Financial" :
                       task.category === "investment_committee" ? "Investment Committee" :
                       // Handle custom categories
                       customCategories.includes(task.category) ? 
                        task.category.charAt(0).toUpperCase() + task.category.slice(1).replace(/_/g, ' ') : 
                        task.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                      }
                    </div>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="status" className="text-xs text-neutral-500 mb-1">Status</Label>
                  {editMode ? (
                    <Select 
                      name="status" 
                      value={formState.status} 
                      onValueChange={(value) => handleSelectChange("status", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={TaskStatuses.NOT_STARTED}>Not Started</SelectItem>
                        <SelectItem value={TaskStatuses.IN_PROGRESS}>In Progress</SelectItem>
                        <SelectItem value={TaskStatuses.PENDING}>Pending Review</SelectItem>
                        <SelectItem value={TaskStatuses.COMPLETED}>Complete</SelectItem>
                        
                        {/* Display custom statuses */}
                        {customStatuses.length > 0 && <Separator className="my-1" />}
                        {customStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-sm py-1.5">{
                      task.status === TaskStatuses.NOT_STARTED ? "Not Started" :
                      task.status === TaskStatuses.IN_PROGRESS ? "In Progress" :
                      task.status === TaskStatuses.PENDING ? "Pending Review" :
                      task.status === TaskStatuses.COMPLETED ? "Completed" :
                      // Handle custom statuses
                      customStatuses.includes(task.status) ? 
                        task.status.charAt(0).toUpperCase() + task.status.slice(1).replace(/_/g, ' ') : 
                        task.status
                    }</div>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="dueDate" className="text-xs text-neutral-500 mb-1">Due Date</Label>
                  {editMode ? (
                    <Input 
                      type="date" 
                      name="dueDate" 
                      value={formState.dueDate} 
                      onChange={handleInputChange} 
                      className="w-full rounded-md border border-neutral-300 py-1.5 px-3 text-sm" 
                    />
                  ) : (
                    <div className="text-sm py-1.5">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}
                    </div>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="assignedTo" className="text-xs text-neutral-500 mb-1">Assigned To</Label>
                  {editMode ? (
                    <Select 
                      name="assignedTo" 
                      value={formState.assignedTo?.toString() || "unassigned"} 
                      onValueChange={(value) => handleSelectChange("assignedTo", value === "unassigned" ? "" : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {Object.values(userMap).map(user => (
                          <SelectItem key={user.id} value={user.id.toString()}>{user.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-sm py-1.5">
                      {task.assignedTo ? userMap[task.assignedTo]?.name || "Unknown" : "Unassigned"}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <Button 
                className="w-full"
                onClick={() => setShowRequestForm(true)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Log a Request
              </Button>
              
              {editMode && (
                <div className="mt-4 flex flex-col gap-2">
                  <Button 
                    variant="default" 
                    className="w-full" 
                    onClick={handleSave}
                    disabled={updateTaskMutation.isPending}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Save Changes
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => setEditMode(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
      
      {/* Request Form Dialog */}
      <RequestForm 
        isOpen={showRequestForm} 
        onClose={() => setShowRequestForm(false)} 
        taskId={taskId}
        dealId={task.dealId}
      />
    </div>
  );
}
