import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { InsertDeal, insertDealSchema } from "@shared/schema";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CalendarIcon } from "lucide-react";
import { format, addDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { TaskTemplateSelector } from "@/components/templates/task-template-selector";

// Extend the schema with validation
const formSchema = insertDealSchema.extend({
  name: z.string().min(3, {
    message: "Deal name must be at least 3 characters.",
  }),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function NewDealPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  
  // Define form
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      status: "open",
      startDate: undefined,
      endDate: undefined
    },
  });

  // Calculate end date when start date changes (90 days later)
  const startDate = form.watch("startDate");
  
  useEffect(() => {
    if (startDate) {
      // Calculate end date as 90 days from start date
      const calculatedEndDate = addDays(new Date(startDate), 90);
      form.setValue("endDate", calculatedEndDate);
    }
  }, [startDate, form]);
  
  // Handle template selection
  const handleTemplateSelect = useCallback((templateId: number | null) => {
    console.log("Template selected in new deal page:", templateId);
    setSelectedTemplateId(templateId);
  }, []);
  
  // Apply template to deal - this will be used directly in onSuccess of createDealMutation
  const applyTemplate = async (dealId: number, templateId: number) => {
    console.log(`Directly applying template ID ${templateId} to deal ID ${dealId}`);
    try {
      const tasksResponse = await apiRequest(
        "POST", 
        `/api/deals/${dealId}/apply-template`, 
        { templateId }
      );
      console.log("Template application response:", tasksResponse);
      
      if (Array.isArray(tasksResponse) && tasksResponse.length > 0) {
        toast({
          title: "Template Applied",
          description: `${tasksResponse.length} tasks created from template`,
        });
      } else {
        console.error("Template applied but no tasks were returned:", tasksResponse);
        toast({
          title: "Warning",
          description: "Template applied but no tasks were created",
          variant: "destructive",
        });
      }
      
      // Invalidate all relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/tasks`] });
      
      return tasksResponse;
    } catch (error) {
      console.error("Failed to apply template:", error);
      toast({
        title: "Error",
        description: `Failed to apply template: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
      throw error;
    }
  };
  
  // Define deal creation mutation
  const createDealMutation = useMutation<any, Error, InsertDeal>({
    mutationFn: async (data: InsertDeal) => {
      console.log("Creating new deal with data:", data);
      const response = await apiRequest("POST", "/api/deals", data);
      console.log("Created deal response:", response);
      return response;
    },
    onSuccess: async (createdDeal) => {
      console.log("Deal created successfully:", createdDeal);
      
      // Store the important info about the created deal in localStorage
      if (createdDeal && createdDeal.id) {
        // Update localStorage with the new deal information
        localStorage.setItem("activeDealId", createdDeal.id.toString());
        localStorage.setItem("activeDeal", JSON.stringify({
          id: createdDeal.id,
          name: createdDeal.name
        }));
        
        // If a template was selected, apply it directly here
        if (selectedTemplateId) {
          console.log(`Applying template ID ${selectedTemplateId} to new deal ID ${createdDeal.id}`);
          try {
            // Direct fetch to the server to apply the template
            const response = await fetch(`/api/deals/${createdDeal.id}/apply-template`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ templateId: selectedTemplateId }),
            });
            
            if (!response.ok) {
              throw new Error(`Template application failed: ${response.statusText}`);
            }
            
            const tasksResponse = await response.json();
            console.log("Template application response:", tasksResponse);
            
            if (Array.isArray(tasksResponse) && tasksResponse.length > 0) {
              toast({
                title: "Deal Created with Tasks",
                description: `Deal "${createdDeal.name}" created with ${tasksResponse.length} tasks from template.`,
              });
            } else {
              console.warn("Template applied but returned empty task array:", tasksResponse);
              toast({
                title: "Deal Created",
                description: "Deal created, but no tasks were created from the template.",
              });
            }
            
            // Invalidate all queries related to this deal
            queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
            queryClient.invalidateQueries({ queryKey: [`/api/deals/${createdDeal.id}`] });
            queryClient.invalidateQueries({ queryKey: [`/api/deals/${createdDeal.id}/tasks`] });
          } catch (error) {
            console.error("Failed to apply template:", error);
            toast({
              title: "Template Application Error",
              description: `Deal created but failed to apply template. Please refresh and check if tasks were created.`,
              variant: "destructive",
            });
          } finally {
            // Always navigate to deals list after deal creation
            navigate("/deals");
          }
        } else {
          console.log("No template selected");
          toast({
            title: "Success",
            description: "Deal created successfully.",
          });
          queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
          navigate("/deals");
        }
      } else {
        toast({
          title: "Success",
          description: "Deal created successfully.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
        navigate("/deals");
      }
    },
    onError: (error: Error) => {
      console.error("Failed to create deal:", error);
      toast({
        title: "Error",
        description: `Failed to create deal: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: FormData) => {
    // Convert Date objects to ISO strings for API submission
    const formattedData = {
      ...data,
      startDate: data.startDate ? data.startDate.toISOString() : undefined,
      endDate: data.endDate ? data.endDate.toISOString() : undefined
    };
    
    createDealMutation.mutate(formattedData as any);
  };

  return (
    <Layout title="Create New Deal" subtitle="Enter details for the new acquisition or investment opportunity">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Deal Information</CardTitle>
            <CardDescription>
              Fill in the basic information about the new deal. You'll be able to add tasks and details later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deal Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. TechFusion Acquisition" {...field} />
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
                      <FormLabel>Deal Status</FormLabel>
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
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Select date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date (90 days from Start Date)</FormLabel>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal bg-neutral-50",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={true}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Automatically calculated</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Task Template Selection */}
                <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-100">
                  <h3 className="text-lg font-medium mb-2">Task Templates</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Select a task template to automatically create standard tasks for this deal.
                    The due dates will be calculated based on the deal's start date.
                  </p>
                  
                  <TaskTemplateSelector
                    onTemplateSelect={handleTemplateSelect}
                    selectedTemplateId={selectedTemplateId}
                    label="Select Template"
                  />
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="mr-2"
                    onClick={() => navigate("/dashboard")}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createDealMutation.isPending}
                  >
                    {createDealMutation.isPending 
                      ? "Creating..." 
                      : "Create Deal"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}