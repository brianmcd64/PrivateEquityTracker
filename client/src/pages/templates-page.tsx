import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  TaskTemplate, 
  TaskTemplateItem, 
  TaskPhases, 
  TaskCategories, 
  insertTaskTemplateSchema, 
  insertTaskTemplateItemSchema 
} from "@shared/schema";
import { Layout } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Edit, Trash2 } from "lucide-react";

// Form schema for template creation
const templateFormSchema = insertTaskTemplateSchema.extend({
  name: z.string().min(3, { message: "Template name must be at least 3 characters" }),
  description: z.string().optional(),
  isDefault: z.preprocess(
    (val) => val === true || val === 'true',
    z.boolean().default(false)
  )
});

// Form schema for template item creation
const templateItemFormSchema = insertTaskTemplateItemSchema.extend({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  description: z.string().optional(),
  phase: z.string({ required_error: "Please select a phase" }),
  category: z.string({ required_error: "Please select a category" }),
  daysFromStart: z.coerce.number().min(0, { message: "Days must be a positive number" }).max(180, { message: "Days should be less than 180" })
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;
type TemplateItemFormValues = z.infer<typeof templateItemFormSchema>;

export default function TemplatesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [isCreateItemOpen, setIsCreateItemOpen] = useState(false);
  const [isEditTemplate, setIsEditTemplate] = useState(false);
  const [isEditItem, setIsEditItem] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TaskTemplateItem | null>(null);

  // Fetch templates
  const {
    data: templates,
    isLoading: templatesLoading,
    error: templatesError
  } = useQuery<TaskTemplate[]>({
    queryKey: ["/api/task-templates"],
  });

  // Fetch template items for selected template
  const {
    data: templateItems,
    isLoading: itemsLoading,
    error: itemsError,
    refetch: refetchItems
  } = useQuery<TaskTemplateItem[]>({
    queryKey: ["/api/task-templates", selectedTemplate?.id, "items"],
    enabled: !!selectedTemplate,
    initialData: [] as TaskTemplateItem[],
    queryFn: async () => {
      if (!selectedTemplate) return [] as TaskTemplateItem[];
      console.log(`Fetching items for template ID: ${selectedTemplate.id}`);
      const response = await apiRequest("GET", `/api/task-templates/${selectedTemplate.id}/items`);
      console.log("Items response:", response);
      if (response && Array.isArray(response)) {
        return response as TaskTemplateItem[];
      }
      return [] as TaskTemplateItem[];
    },
    refetchOnWindowFocus: false
  });

  // Template form
  const templateForm = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      isDefault: false,
    },
  });

  // Template item form
  const templateItemForm = useForm<TemplateItemFormValues>({
    resolver: zodResolver(templateItemFormSchema),
    defaultValues: {
      title: "",
      description: "",
      phase: Object.values(TaskPhases)[0],
      category: Object.values(TaskCategories)[0],
      daysFromStart: 0,
      assignedTo: undefined,
    },
  });

  // Update forms when editing existing templates/items
  useEffect(() => {
    if (isEditTemplate && selectedTemplate) {
      templateForm.reset({
        name: selectedTemplate.name,
        description: selectedTemplate.description || "",
        isDefault: selectedTemplate.isDefault || false,
      });
    } else if (!isEditTemplate) {
      templateForm.reset({
        name: "",
        description: "",
        isDefault: false,
      });
    }
  }, [isEditTemplate, selectedTemplate, templateForm]);

  useEffect(() => {
    if (isEditItem && selectedItem) {
      templateItemForm.reset({
        title: selectedItem.title,
        description: selectedItem.description || "",
        phase: selectedItem.phase,
        category: selectedItem.category,
        daysFromStart: selectedItem.daysFromStart,
        assignedTo: selectedItem.assignedTo,
      });
    } else if (!isEditItem) {
      templateItemForm.reset({
        title: "",
        description: "",
        phase: Object.values(TaskPhases)[0],
        category: Object.values(TaskCategories)[0],
        daysFromStart: 0,
        assignedTo: undefined,
      });
    }
  }, [isEditItem, selectedItem, templateItemForm]);

  // Mutations
  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormValues) => {
      return await apiRequest("POST", "/api/task-templates", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Template created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/task-templates"] });
      setIsCreateTemplateOpen(false);
      templateForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create template: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TemplateFormValues }) => {
      return await apiRequest("PATCH", `/api/task-templates/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Template updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/task-templates"] });
      setIsCreateTemplateOpen(false);
      setIsEditTemplate(false);
      templateForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update template: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/task-templates/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/task-templates"] });
      setSelectedTemplate(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete template: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const createTemplateItemMutation = useMutation({
    mutationFn: async (data: TemplateItemFormValues & { templateId: number }) => {
      console.log("Creating template item with data:", data);
      
      // Validate the data before sending to ensure we have required fields
      if (!data.title) {
        throw new Error("Title is required");
      }
      if (!data.phase) {
        throw new Error("Phase is required");
      }
      if (!data.category) {
        throw new Error("Category is required");
      }
      if (typeof data.templateId !== 'number') {
        throw new Error("Template ID is required");
      }
      
      // Ensure daysFromStart is a number before sending
      const formattedData = {
        ...data,
        daysFromStart: Number(data.daysFromStart)
      };
      
      console.log("Formatted data with numeric daysFromStart:", formattedData);
      
      // Using fetch directly with credentials to ensure cookies are sent
      const response = await fetch("/api/task-template-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formattedData)
      });
      
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorText = await response.text();
          console.error("Server error response:", errorText);
          errorMessage = `${errorMessage} - ${errorText}`;
        } catch (err) {
          console.error("Could not parse error response:", err);
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log("Template item creation result:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("Template item created successfully:", data);
      toast({
        title: "Success",
        description: "Template item created successfully",
      });
      
      // Close dialog and reset form
      setIsCreateItemOpen(false);
      templateItemForm.reset({
        title: "",
        description: "",
        phase: Object.values(TaskPhases)[0],
        category: Object.values(TaskCategories)[0],
        daysFromStart: 0,
        assignedTo: undefined,
      });
      
      // Manually refetch items instead of just invalidating cache
      if (selectedTemplate) {
        console.log("Refetching items after creation");
        // First invalidate the cache
        queryClient.invalidateQueries({ 
          queryKey: ["/api/task-templates", selectedTemplate.id, "items"] 
        });
        // Then explicitly refetch
        setTimeout(() => refetchItems(), 500);
      }
    },
    onError: (error: Error) => {
      console.error("Template item creation error:", error);
      toast({
        title: "Error",
        description: `Failed to create template item: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateTemplateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TemplateItemFormValues }) => {
      // Ensure daysFromStart is a number
      const formattedData = {
        ...data,
        daysFromStart: Number(data.daysFromStart)
      };
      console.log("Updating with formatted data:", formattedData);
      return await apiRequest("PATCH", `/api/task-template-items/${id}`, formattedData);
    },
    onSuccess: (data) => {
      console.log("Template item updated successfully:", data);
      toast({
        title: "Success",
        description: "Template item updated successfully",
      });
      
      // Close dialog and reset form states
      setIsCreateItemOpen(false);
      setIsEditItem(false);
      setSelectedItem(null);
      templateItemForm.reset();
      
      // Manually refetch items instead of just invalidating cache
      if (selectedTemplate) {
        console.log("Refetching items after update");
        // First invalidate the cache
        queryClient.invalidateQueries({ 
          queryKey: ["/api/task-templates", selectedTemplate.id, "items"] 
        });
        // Then explicitly refetch
        setTimeout(() => refetchItems(), 500);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update template item: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteTemplateItemMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/task-template-items/${id}`);
    },
    onSuccess: (data) => {
      console.log("Template item deleted successfully:", data);
      toast({
        title: "Success",
        description: "Template item deleted successfully",
      });
      
      // Manually refetch items instead of just invalidating cache
      if (selectedTemplate) {
        console.log("Refetching items after deletion");
        // First invalidate the cache
        queryClient.invalidateQueries({ 
          queryKey: ["/api/task-templates", selectedTemplate.id, "items"] 
        });
        // Then explicitly refetch
        setTimeout(() => refetchItems(), 500);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete template item: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Form submission handlers
  const onTemplateSubmit = (values: TemplateFormValues) => {
    if (isEditTemplate && selectedTemplate) {
      updateTemplateMutation.mutate({ id: selectedTemplate.id, data: values });
    } else {
      createTemplateMutation.mutate(values);
    }
  };

  const onTemplateItemSubmit = (values: TemplateItemFormValues) => {
    if (!selectedTemplate) {
      console.error("No template selected");
      toast({
        title: "Error",
        description: "No template selected. Please select a template first.",
        variant: "destructive",
      });
      return;
    }

    console.log("Submitting template item with values:", values);
    console.log("Selected template:", selectedTemplate);
    console.log("Is edit mode:", isEditItem);
    console.log("Selected item:", selectedItem);
    
    // Ensure daysFromStart is a number
    const formattedValues = {
      ...values,
      daysFromStart: Number(values.daysFromStart)
    };
    
    console.log("Formatted values with numeric daysFromStart:", formattedValues);
    
    try {
      if (isEditItem && selectedItem) {
        console.log("Updating existing template item");
        updateTemplateItemMutation.mutate({ id: selectedItem.id, data: formattedValues });
      } else {
        console.log("Creating new template item for template ID:", selectedTemplate.id);
        const dataToSubmit = {
          ...formattedValues,
          templateId: selectedTemplate.id,
        };
        console.log("Data to submit:", dataToSubmit);
        createTemplateItemMutation.mutate(dataToSubmit);
      }
    } catch (error) {
      console.error("Error in form submission:", error);
      toast({
        title: "Error",
        description: "An error occurred while saving the task. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Function to open template edit dialog
  const handleEditTemplate = (template: TaskTemplate) => {
    setSelectedTemplate(template);
    setIsEditTemplate(true);
    setIsCreateTemplateOpen(true);
  };

  // Function to open template item edit dialog
  const handleEditItem = (item: TaskTemplateItem) => {
    console.log("Edit item clicked:", item);
    setSelectedItem(item);
    setIsEditItem(true);
    
    // Reset form with existing values before opening dialog
    templateItemForm.reset({
      title: item.title,
      description: item.description || "",
      phase: item.phase,
      category: item.category,
      daysFromStart: item.daysFromStart,
      assignedTo: item.assignedTo,
    });
    
    // Open dialog after form reset
    setIsCreateItemOpen(true);
  };

  // Function to handle template selection
  const handleTemplateSelect = (template: TaskTemplate) => {
    console.log("Selected template:", template);
    setSelectedTemplate(template);
    
    // Force refetch of items for this template
    setTimeout(() => {
      console.log("Refreshing items for newly selected template");
      queryClient.invalidateQueries({ 
        queryKey: ["/api/task-templates", template.id, "items"] 
      });
      refetchItems();
    }, 100);
  };

  // Function to confirm template deletion
  const handleDeleteTemplate = (template: TaskTemplate) => {
    if (window.confirm(`Are you sure you want to delete the template "${template.name}"?`)) {
      deleteTemplateMutation.mutate(template.id);
    }
  };

  // Function to confirm template item deletion
  const handleDeleteItem = (item: TaskTemplateItem) => {
    if (window.confirm(`Are you sure you want to delete the item "${item.title}"?`)) {
      deleteTemplateItemMutation.mutate(item.id);
    }
  };

  // Show error if templates failed to load
  if (templatesError) {
    return (
      <Layout title="Task Templates" subtitle="Manage task templates for projects">
        <div className="max-w-6xl mx-auto">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>Failed to load templates</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-red-500">{(templatesError as Error).message}</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Task Templates" subtitle="Manage task templates for projects">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Templates List */}
          <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Templates</CardTitle>
                <CardDescription>Select a template to manage</CardDescription>
              </div>
              <Dialog open={isCreateTemplateOpen} onOpenChange={setIsCreateTemplateOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="sm" 
                    onClick={() => {
                      setIsEditTemplate(false);
                      templateForm.reset();
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" /> New
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>
                      {isEditTemplate ? "Edit Template" : "Create New Template"}
                    </DialogTitle>
                    <DialogDescription>
                      {isEditTemplate
                        ? "Update the template properties"
                        : "Define a new task template for projects"}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...templateForm}>
                    <form 
                      onSubmit={templateForm.handleSubmit(onTemplateSubmit)} 
                      className="space-y-4"
                    >
                      <FormField
                        control={templateForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Template Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g. Standard Due Diligence" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={templateForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter template description" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={templateForm.control}
                        name="isDefault"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Default Template</FormLabel>
                              <FormDescription>
                                Set as the default template for new projects
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsCreateTemplateOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={
                            createTemplateMutation.isPending || 
                            updateTemplateMutation.isPending
                          }
                        >
                          {createTemplateMutation.isPending || updateTemplateMutation.isPending
                            ? "Saving..."
                            : isEditTemplate ? "Update Template" : "Create Template"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                {templatesLoading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Loading templates...
                  </div>
                ) : templates && templates.length > 0 ? (
                  <div className="space-y-2">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className={`p-3 rounded-md cursor-pointer flex justify-between items-center 
                          ${selectedTemplate?.id === template.id 
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-muted"
                          }`}
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <div>
                          <p className="font-medium">{template.name}</p>
                          {template.isDefault && (
                            <span className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-sm">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${
                              selectedTemplate?.id === template.id 
                                ? "hover:bg-primary-foreground/20 text-primary-foreground" 
                                : "hover:bg-muted-foreground/20"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTemplate(template);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${
                              selectedTemplate?.id === template.id 
                                ? "hover:bg-primary-foreground/20 text-primary-foreground" 
                                : "hover:bg-muted-foreground/20"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTemplate(template);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    No templates found. Create your first template.
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Template Items */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>
                  {selectedTemplate ? `Tasks in "${selectedTemplate.name}"` : "Template Tasks"}
                </CardTitle>
                <CardDescription>
                  {selectedTemplate 
                    ? "Manage tasks in this template" 
                    : "Select a template to manage its tasks"}
                </CardDescription>
              </div>
              {selectedTemplate ? (
                <Button 
                  size="sm" 
                  onClick={() => {
                    setIsEditItem(false);
                    templateItemForm.reset({
                      title: "",
                      description: "",
                      phase: Object.values(TaskPhases)[0],
                      category: Object.values(TaskCategories)[0],
                      daysFromStart: 0,
                      assignedTo: undefined
                    });
                    setIsCreateItemOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Task
                </Button>
              ) : (
                <Button size="sm" disabled>
                  <Plus className="h-4 w-4 mr-1" /> Add Task
                </Button>
              )}
              
              <Dialog 
                open={isCreateItemOpen} 
                onOpenChange={setIsCreateItemOpen}
              >
                  <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                      <DialogTitle>
                        {isEditItem ? "Edit Task" : "Add Task to Template"}
                      </DialogTitle>
                      <DialogDescription>
                        {selectedTemplate && (
                          <>
                            {isEditItem 
                              ? "Update this task in the template" 
                              : `Add a new task to ${selectedTemplate.name}`}
                          </>
                        )}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...templateItemForm}>
                      <form
                        id="template-item-form" 
                        className="space-y-4"
                      >
                        <FormField
                          control={templateItemForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Task Title</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g. Financial Analysis" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={templateItemForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Enter task description" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={templateItemForm.control}
                            name="phase"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phase</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select phase" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {Object.entries(TaskPhases).map(([key, value]) => (
                                      <SelectItem key={value} value={value}>
                                        {key.replace(/_/g, " ")}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={templateItemForm.control}
                            name="category"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Category</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {Object.entries(TaskCategories).map(([key, value]) => (
                                      <SelectItem key={value} value={value}>
                                        {key.replace(/_/g, " ")}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={templateItemForm.control}
                          name="daysFromStart"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Days from Project Start</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min={0}
                                  max={180}
                                  {...field}
                                  onChange={(e) => {
                                    // Ensure we're setting a number value
                                    const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                    field.onChange(value);
                                  }}
                                  value={field.value || 0}
                                />
                              </FormControl>
                              <FormDescription>
                                The due date will be calculated as this many days after the project start date
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsCreateItemOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="button" 
                            disabled={
                              createTemplateItemMutation.isPending || 
                              updateTemplateItemMutation.isPending
                            }
                            onClick={() => {
                              // Get values from form
                              const formData = templateItemForm.getValues();
                              console.log("Form data to submit:", formData);
                              
                              if (!selectedTemplate) {
                                toast({
                                  title: "Error",
                                  description: "No template selected",
                                  variant: "destructive",
                                });
                                return;
                              }
                              
                              if (!formData.title) {
                                toast({
                                  title: "Error",
                                  description: "Title is required",
                                  variant: "destructive",
                                });
                                return;
                              }
                              
                              if (isEditItem && selectedItem) {
                                // Update existing item - ensure daysFromStart is a number
                                updateTemplateItemMutation.mutate({
                                  id: selectedItem.id,
                                  data: {
                                    ...formData,
                                    daysFromStart: Number(formData.daysFromStart)
                                  }
                                });
                              } else {
                                // Create new item - ensure daysFromStart is a number
                                const createData = {
                                  ...formData,
                                  templateId: selectedTemplate.id,
                                  daysFromStart: Number(formData.daysFromStart)
                                };
                                console.log("Creating item with data:", createData);
                                createTemplateItemMutation.mutate(createData);
                              }
                            }}
                          >
                            {createTemplateItemMutation.isPending || updateTemplateItemMutation.isPending
                              ? "Saving..."
                              : isEditItem ? "Update Task" : "Add Task"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
              {!selectedTemplate ? (
                <div className="py-16 text-center text-muted-foreground">
                  <p>Select a template from the list to manage its tasks</p>
                </div>
              ) : itemsLoading ? (
                <div className="py-8 text-center text-muted-foreground">
                  Loading tasks...
                </div>
              ) : (() => {
                console.log("Rendering template items section. Items:", templateItems);
                console.log("Is array:", Array.isArray(templateItems));
                console.log("Length:", templateItems?.length || 0);
                return templateItems && Array.isArray(templateItems) && templateItems.length > 0;
              })() ? (
                <Table>
                  <TableCaption>
                    Tasks sorted by days from project start
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Phase</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Days from Start</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templateItems.map((item: TaskTemplateItem) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.title}
                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {item.description}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {Object.keys(TaskPhases).find(
                            (key) => TaskPhases[key as keyof typeof TaskPhases] === item.phase
                          )?.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell>
                          {Object.keys(TaskCategories).find(
                            (key) => TaskCategories[key as keyof typeof TaskCategories] === item.category
                          )?.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.daysFromStart}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditItem(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDeleteItem(item)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-16 text-center text-muted-foreground">
                  <p>No tasks found in this template</p>
                  <p className="text-sm mt-1">
                    Click "Add Task" to create your first task
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}