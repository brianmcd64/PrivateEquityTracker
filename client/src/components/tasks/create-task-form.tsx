import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { InsertTask, TaskPhases, TaskCategories, TaskStatuses } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface CreateTaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  dealId: number;
}

export function CreateTaskForm({ isOpen, onClose, dealId }: CreateTaskFormProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [phase, setPhase] = useState<string>(TaskPhases.LOI);
  const [category, setCategory] = useState<string>(TaskCategories.FINANCIAL);
  const [status, setStatus] = useState<string>(TaskStatuses.NOT_STARTED);
  const [priority, setPriority] = useState<number>(2);
  const [assignedTo, setAssignedTo] = useState<number | undefined>(undefined);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mock users data (for prototype)
  const users = [
    { id: 1, name: "Sarah Johnson", role: "deal_lead" },
    { id: 2, name: "Michael Reynolds", role: "functional_lead", specialization: "financial" },
    { id: 3, name: "Amanda Lee", role: "functional_lead", specialization: "legal" },
    { id: 4, name: "Tom Wilson", role: "functional_lead", specialization: "operations" },
  ];

  // Helper to define correct types for the Insert mutation
  type TaskApiResponse = any; // Replace with actual API response type if known
  
  // Handle form submission
  const mutation = useMutation<TaskApiResponse, Error, InsertTask>({
    mutationFn: async (data: InsertTask) => {
      return apiRequest("POST", "/api/tasks", data);
    },
    onSuccess: () => {
      // Invalidate the tasks query to refresh the list
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/tasks`] });
      
      toast({
        title: "Task created",
        description: "The task has been created successfully.",
      });
      
      // Close the dialog and reset the form
      onClose();
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating task",
        description: error.message || "An error occurred while creating the task.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPhase(TaskPhases.LOI);
    setCategory(TaskCategories.FINANCIAL);
    setStatus(TaskStatuses.NOT_STARTED);
    setPriority(2);
    setAssignedTo(undefined);
    setDueDate(null);
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!title.trim()) {
      newErrors.title = "Title is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Create a modified InsertTask type that matches what the API expects
    const taskData = {
      dealId,
      title,
      description,
      phase,
      category,
      status,
      priority,
      assignedTo,
      // Convert Date to ISO string for the database
      dueDate: dueDate instanceof Date ? dueDate.toISOString() : null,
    } as InsertTask;
    
    mutation.mutate(taskData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Enter task title"
              className={errors.title ? "border-red-500" : ""}
            />
            {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
          </div>
          
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Provide details about the task" 
              className="h-24" 
            />
          </div>
          
          {/* Phase, Category and Status Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Phase */}
            <div className="space-y-2">
              <Label htmlFor="phase">Phase</Label>
              <Select value={phase} onValueChange={setPhase}>
                <SelectTrigger>
                  <SelectValue placeholder="Select phase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TaskPhases.LOI}>LOI</SelectItem>
                  <SelectItem value={TaskPhases.DOCUMENT}>Document Review</SelectItem>
                  <SelectItem value={TaskPhases.DEEPDIVE}>Deep Dive</SelectItem>
                  <SelectItem value={TaskPhases.FINAL}>Final Analysis</SelectItem>
                  <SelectItem value={TaskPhases.INTEGRATION}>Integration</SelectItem>
                  <SelectItem value={TaskPhases.POST_CLOSE}>Post-Close</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TaskCategories.FINANCIAL}>Financial</SelectItem>
                  <SelectItem value={TaskCategories.LEGAL}>Legal</SelectItem>
                  <SelectItem value={TaskCategories.OPERATIONS}>Operations</SelectItem>
                  <SelectItem value={TaskCategories.HR}>Human Resources</SelectItem>
                  <SelectItem value={TaskCategories.TECH}>Technology</SelectItem>
                  <SelectItem value={TaskCategories.TAX}>Tax</SelectItem>
                  <SelectItem value={TaskCategories.STRATEGY}>Strategy</SelectItem>
                  <SelectItem value={TaskCategories.COMPLIANCE}>Compliance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TaskStatuses.NOT_STARTED}>Not Started</SelectItem>
                  <SelectItem value={TaskStatuses.IN_PROGRESS}>In Progress</SelectItem>
                  <SelectItem value={TaskStatuses.PENDING}>Pending Review</SelectItem>
                  <SelectItem value={TaskStatuses.COMPLETED}>Completed</SelectItem>
                  <SelectItem value={TaskStatuses.BLOCKED}>Blocked</SelectItem>
                  <SelectItem value={TaskStatuses.DEFERRED}>Deferred</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Priority and Assigned To */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={priority.toString()} 
                onValueChange={(value) => setPriority(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Low</SelectItem>
                  <SelectItem value="2">Medium</SelectItem>
                  <SelectItem value="3">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Assigned To */}
            <div className="space-y-2">
              <Label htmlFor="assignedTo">Assigned To</Label>
              <Select 
                value={assignedTo?.toString() || ""} 
                onValueChange={(value) => setAssignedTo(value ? parseInt(value) : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full pl-3 text-left font-normal ${!dueDate && "text-muted-foreground"}`}
                >
                  {dueDate ? (
                    format(dueDate, "PPP")
                  ) : (
                    <span>Select a date</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                {/* Using Calendar component with a type assertion for compatibility */}
                <Calendar
                  mode="single"
                  selected={dueDate as any}
                  onSelect={(date: Date | undefined) => setDueDate(date || null)}
                  disabled={(date) => date < new Date("1900-01-01")}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}