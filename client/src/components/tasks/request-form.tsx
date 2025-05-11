import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { RequestTypes, RequestStatuses } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload } from "lucide-react";
import { format } from "date-fns";

interface RequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number;
  dealId: number;
}

export function RequestForm({ isOpen, onClose, taskId, dealId }: RequestFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Form state
  const [formState, setFormState] = useState({
    requestId: `FR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
    requestType: RequestTypes.INFORMATION,
    details: "",
    recipient: "seller",
    sendDate: format(new Date(), "yyyy-MM-dd"),
    priority: "2",
  });
  
  // Create request mutation
  const createRequestMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/requests", {
        taskId,
        dealId,
        requestId: formState.requestId,
        requestType: formState.requestType,
        details: formState.details,
        status: RequestStatuses.PENDING,
        recipient: formState.recipient,
        sendDate: new Date(formState.sendDate),
        priority: parseInt(formState.priority),
        createdBy: user?.id || 1,
      });
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/requests`] });
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/requests`] });
      
      toast({
        title: "Request created",
        description: "The request has been successfully created.",
      });
      
      // Reset form and close dialog
      setFormState({
        requestId: `FR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        requestType: RequestTypes.INFORMATION,
        details: "",
        recipient: "seller",
        sendDate: format(new Date(), "yyyy-MM-dd"),
        priority: "2",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create request: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormState((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formState.details.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide request details",
        variant: "destructive",
      });
      return;
    }
    
    createRequestMutation.mutate();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log a Request</DialogTitle>
          <DialogDescription>
            Create a new request for information or documents
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="request-id">Request ID</Label>
                <Input
                  id="request-id"
                  name="requestId"
                  value={formState.requestId}
                  onChange={handleInputChange}
                  placeholder="FR-2023-001"
                />
                <p className="text-xs text-neutral-500">A unique identifier for this request</p>
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="request-type">Request Type</Label>
                <Select
                  name="requestType"
                  value={formState.requestType}
                  onValueChange={(value) => handleSelectChange("requestType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={RequestTypes.INFORMATION}>Information Request</SelectItem>
                    <SelectItem value={RequestTypes.CLARIFICATION}>Clarification</SelectItem>
                    <SelectItem value={RequestTypes.DOCUMENT}>Document Request</SelectItem>
                    <SelectItem value={RequestTypes.MEETING}>Meeting Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="request-details">Request Details</Label>
              <Textarea
                id="request-details"
                name="details"
                value={formState.details}
                onChange={handleInputChange}
                rows={4}
                placeholder="Describe what you need..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="recipient">Recipient</Label>
                <Select
                  name="recipient"
                  value={formState.recipient}
                  onValueChange={(value) => handleSelectChange("recipient", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seller">Seller Team</SelectItem>
                    <SelectItem value="management">Management Team</SelectItem>
                    <SelectItem value="advisor">Financial Advisor</SelectItem>
                    <SelectItem value="legal">Legal Team</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="send-date">Send Date</Label>
                <Input
                  id="send-date"
                  name="sendDate"
                  type="date"
                  value={formState.sendDate}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="priority">Priority</Label>
                <span id="priority-value" className="text-sm text-neutral-500">
                  {formState.priority === "1" ? "Low" : formState.priority === "2" ? "Medium" : "High"}
                </span>
              </div>
              <Input
                id="priority"
                name="priority"
                type="range"
                min="1"
                max="3"
                value={formState.priority}
                onChange={handleInputChange}
                className="w-full"
              />
              <div className="mt-1 flex justify-between text-xs text-neutral-500">
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
              </div>
            </div>
            
            <div className="space-y-1">
              <Label>Attachments</Label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-neutral-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-neutral-400" />
                  <div className="flex text-sm text-neutral-600">
                    <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-accent hover:text-accent-dark">
                      <span>Upload a file</span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-neutral-500">PDF, Word, Excel up to 10MB</p>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createRequestMutation.isPending}>
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
