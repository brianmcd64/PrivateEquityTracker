import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { TaskTemplate } from "@shared/schema";

interface TaskTemplateSelectorProps {
  onTemplateSelect: (templateId: number | null) => void;
  selectedTemplateId?: number | null;
  label?: string;
}

export function TaskTemplateSelector({ 
  onTemplateSelect, 
  selectedTemplateId = null,
  label = "Task Template"
}: TaskTemplateSelectorProps) {
  const { toast } = useToast();
  const [selectedValue, setSelectedValue] = useState<string>(
    selectedTemplateId ? String(selectedTemplateId) : ""
  );
  
  // Fetch available templates
  const { data: templates, isLoading, error } = useQuery<TaskTemplate[]>({
    queryKey: ["/api/task-templates"],
    staleTime: 60 * 1000, // 1 minute
  });
  
  // When templates load, select the default template if no template is selected
  useEffect(() => {
    // Initialize with the selected template if provided
    if (selectedTemplateId) {
      setSelectedValue(String(selectedTemplateId));
      return;
    }
    
    // Otherwise, if templates are loaded, select the default
    if (templates && templates.length > 0) {
      // Find the default template
      const defaultTemplate = templates.find((template) => template.isDefault);
      
      if (defaultTemplate) {
        setSelectedValue(String(defaultTemplate.id));
        onTemplateSelect(defaultTemplate.id);
      } else {
        // If no default template, select "none"
        setSelectedValue("none");
        onTemplateSelect(null);
      }
    }
  }, [templates, selectedTemplateId, onTemplateSelect]);
  
  // Handle template selection change
  const handleSelectionChange = (value: string) => {
    console.log("Template selection changed to:", value);
    setSelectedValue(value);
    // Convert the value to a number if it's not "none", otherwise pass null
    const templateId = value && value !== "none" ? parseInt(value, 10) : null;
    console.log("Notifying parent component of template selection:", templateId);
    onTemplateSelect(templateId);
  };
  
  // Handle error in loading templates
  if (error) {
    toast({
      title: "Error loading templates",
      description: "Failed to load task templates. Please try again.",
      variant: "destructive",
    });
  }
  
  return (
    <div className="space-y-2">
      <Label htmlFor="template-selector">{label}</Label>
      {isLoading ? (
        <Skeleton className="h-10 w-full" />
      ) : (
        <Select 
          value={selectedValue} 
          onValueChange={handleSelectionChange}
        >
          <SelectTrigger id="template-selector" className="w-full">
            <SelectValue placeholder="Select a task template" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None (No tasks)</SelectItem>
            {templates && templates.map((template) => (
              <SelectItem 
                key={template.id} 
                value={template.id.toString()}
              >
                {template.name} {template.isDefault ? "(Default)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}