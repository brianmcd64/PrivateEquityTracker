import { useState, useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Request, RequestTypes, RequestStatuses } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Schema for the request form
const requestEditSchema = z.object({
  requestType: z.string(),
  details: z.string().min(10, "Details must be at least 10 characters"),
  status: z.string(),
  recipient: z.string(),
  priority: z.coerce.number().int().min(1).max(3),
  response: z.string().optional().nullable(),
});

type RequestEditValues = z.infer<typeof requestEditSchema>;

interface EditRequestFormProps {
  request: Request;
  onComplete?: () => void;
  trigger?: React.ReactNode;
}

export function EditRequestForm({ request, onComplete, trigger }: EditRequestFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Create form with existing request values
  const form = useForm<RequestEditValues>({
    resolver: zodResolver(requestEditSchema),
    defaultValues: {
      requestType: request.requestType,
      details: request.details,
      status: request.status,
      recipient: request.recipient,
      priority: request.priority,
      response: request.response,
    },
  });
  
  // Update request mutation
  const updateRequestMutation = useMutation({
    mutationFn: async (data: RequestEditValues) => {
      return apiRequest("PATCH", `/api/requests/${request.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Request updated",
        description: "The request has been successfully updated.",
      });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${request.taskId}/requests`] });
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${request.dealId}/requests`] });
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${request.dealId}/activity`] });
      
      // Close dialog and call onComplete if provided
      setIsOpen(false);
      if (onComplete) {
        onComplete();
      }
    },
    onError: (error) => {
      console.error("Error updating request:", error);
      toast({
        title: "Error updating request",
        description: error.message || "An error occurred while updating the request.",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: RequestEditValues) => {
    console.log("Updating request data:", data);
    updateRequestMutation.mutate(data);
  };

  // Convert to "ANSWERED" status - with response provided
  const markAsAnswered = () => {
    form.setValue("status", RequestStatuses.ANSWERED);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline" size="sm">Edit</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Edit Request {request.requestId}</DialogTitle>
          <DialogDescription>
            Update request details or change its status.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="requestType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Request Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select request type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={RequestTypes.INFORMATION}>Information</SelectItem>
                      <SelectItem value={RequestTypes.CLARIFICATION}>Clarification</SelectItem>
                      <SelectItem value={RequestTypes.DOCUMENT}>Document</SelectItem>
                      <SelectItem value={RequestTypes.MEETING}>Meeting</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Details</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter request details..." 
                      className="min-h-[80px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={RequestStatuses.PENDING}>Pending</SelectItem>
                      <SelectItem value={RequestStatuses.SENT}>Sent</SelectItem>
                      <SelectItem value={RequestStatuses.AWAITING_RESPONSE}>Awaiting Response</SelectItem>
                      <SelectItem value={RequestStatuses.ANSWERED}>Answered</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="recipient"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select recipient" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="seller">Seller</SelectItem>
                      <SelectItem value="management">Management</SelectItem>
                      <SelectItem value="advisor">Advisor</SelectItem>
                      <SelectItem value="legal">Legal</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))} 
                    defaultValue={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">Low</SelectItem>
                      <SelectItem value="2">Medium</SelectItem>
                      <SelectItem value="3">High</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Response field - only shown if status is "answered" or already has a response */}
            {(form.watch("status") === RequestStatuses.ANSWERED || request.response) && (
              <FormField
                control={form.control}
                name="response"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Response</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter the response received..." 
                        className="min-h-[80px]" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <div className="pt-4 flex justify-between">
              <Button
                type="button"
                variant="outline" 
                onClick={markAsAnswered}
              >
                Mark as Answered
              </Button>
              
              <div className="space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateRequestMutation.isPending}
                >
                  {updateRequestMutation.isPending ? "Updating..." : "Update Request"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}