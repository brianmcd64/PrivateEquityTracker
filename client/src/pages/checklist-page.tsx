import { useState } from "react";
import { Layout } from "@/components/layout";
import { TaskList } from "@/components/tasks/task-list";
import { Button } from "@/components/ui/button";
import { PlusCircle, Settings2, ListFilter } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ChecklistPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // For prototype, we'll use a hardcoded dealId
  const dealId = 1;
  
  // View mode state
  const [viewMode, setViewMode] = useState<"phase" | "date" | "category">("phase");

  // Customize dialogs
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);
  const [manageCustomFieldsOpen, setManageCustomFieldsOpen] = useState(false);
  
  // Custom fields management
  const [customPhases, setCustomPhases] = useState<string[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [customStatuses, setCustomStatuses] = useState<string[]>([]);
  
  // New custom field
  const [newCustomFieldType, setNewCustomFieldType] = useState<"phase" | "category" | "status">("phase");
  const [newCustomFieldValue, setNewCustomFieldValue] = useState("");
  
  const handleAddTask = () => {
    // In a production app, this would open a form to create a new task
    toast({
      title: "Feature not implemented",
      description: "Task creation form would appear here in the full application.",
    });
  };
  
  const handleAddCustomField = () => {
    if (newCustomFieldValue.trim() === "") {
      toast({
        title: "Invalid value",
        description: "Please enter a value for the custom field",
        variant: "destructive"
      });
      return;
    }
    
    const formattedValue = newCustomFieldValue.toLowerCase().replace(/\s+/g, '_');
    
    switch (newCustomFieldType) {
      case "phase":
        if (!customPhases.includes(formattedValue)) {
          setCustomPhases([...customPhases, formattedValue]);
          toast({
            title: "Custom Phase Added",
            description: `Added new phase: ${newCustomFieldValue}`
          });
        } else {
          toast({
            title: "Duplicate value",
            description: "This phase already exists",
            variant: "destructive"
          });
        }
        break;
      case "category":
        if (!customCategories.includes(formattedValue)) {
          setCustomCategories([...customCategories, formattedValue]);
          toast({
            title: "Custom Category Added",
            description: `Added new category: ${newCustomFieldValue}`
          });
        } else {
          toast({
            title: "Duplicate value",
            description: "This category already exists",
            variant: "destructive"
          });
        }
        break;
      case "status":
        if (!customStatuses.includes(formattedValue)) {
          setCustomStatuses([...customStatuses, formattedValue]);
          toast({
            title: "Custom Status Added",
            description: `Added new status: ${newCustomFieldValue}`
          });
        } else {
          toast({
            title: "Duplicate value",
            description: "This status already exists",
            variant: "destructive"
          });
        }
        break;
    }
    
    setNewCustomFieldValue("");
  };
  
  const removeCustomField = (type: "phase" | "category" | "status", value: string) => {
    switch (type) {
      case "phase":
        setCustomPhases(customPhases.filter(p => p !== value));
        break;
      case "category":
        setCustomCategories(customCategories.filter(c => c !== value));
        break;
      case "status":
        setCustomStatuses(customStatuses.filter(s => s !== value));
        break;
    }
    
    toast({
      title: "Custom Field Removed",
      description: `Removed ${type}: ${value}`
    });
  };
  
  // Only deal leads and functional leads can add tasks or customize fields
  const canAddTask = user && (user.role === "deal_lead" || user.role === "functional_lead");
  
  return (
    <Layout 
      title="Due Diligence Checklist" 
      subtitle="TechFusion Acquisition"
    >
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col sm:flex-row gap-3 mb-4 md:mb-0">
          {/* View Mode Selector */}
          <Select value={viewMode} onValueChange={(value) => setViewMode(value as "phase" | "date" | "category")}>
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center">
                <ListFilter className="mr-2 h-4 w-4" />
                <span>View: {
                  viewMode === "phase" ? "By Phase" : 
                  viewMode === "category" ? "By Category" : 
                  "By Date"
                }</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="phase">View by Phase</SelectItem>
              <SelectItem value="category">View by Category</SelectItem>
              <SelectItem value="date">View by Date</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Customize Fields Button */}
          {canAddTask && (
            <Dialog open={customizeDialogOpen} onOpenChange={setCustomizeDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Customize Fields
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Customize Checklist Options</DialogTitle>
                  <DialogDescription>
                    Configure custom fields for your due diligence process
                  </DialogDescription>
                </DialogHeader>
                
                <div className="py-4">
                  <Tabs defaultValue="phases">
                    <TabsList className="grid grid-cols-3 mb-4">
                      <TabsTrigger value="phases">Phases</TabsTrigger>
                      <TabsTrigger value="categories">Categories</TabsTrigger>
                      <TabsTrigger value="statuses">Statuses</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="phases" className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="add-phase">Add Custom Phase</Label>
                        <div className="flex gap-2">
                          <Input 
                            id="add-phase" 
                            placeholder="Enter phase name"
                            value={newCustomFieldType === "phase" ? newCustomFieldValue : ""}
                            onChange={(e) => {
                              setNewCustomFieldType("phase");
                              setNewCustomFieldValue(e.target.value);
                            }}
                          />
                          <Button onClick={handleAddCustomField}>Add</Button>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Current Custom Phases</h4>
                        {customPhases.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No custom phases added yet</p>
                        ) : (
                          <div className="space-y-2">
                            {customPhases.map(phase => (
                              <div key={phase} className="flex justify-between items-center bg-neutral-50 p-2 rounded">
                                <span className="text-sm">{phase}</span>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => removeCustomField("phase", phase)}
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="categories" className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="add-category">Add Custom Category</Label>
                        <div className="flex gap-2">
                          <Input 
                            id="add-category" 
                            placeholder="Enter category name"
                            value={newCustomFieldType === "category" ? newCustomFieldValue : ""}
                            onChange={(e) => {
                              setNewCustomFieldType("category");
                              setNewCustomFieldValue(e.target.value);
                            }}
                          />
                          <Button onClick={handleAddCustomField}>Add</Button>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Current Custom Categories</h4>
                        {customCategories.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No custom categories added yet</p>
                        ) : (
                          <div className="space-y-2">
                            {customCategories.map(category => (
                              <div key={category} className="flex justify-between items-center bg-neutral-50 p-2 rounded">
                                <span className="text-sm">{category}</span>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => removeCustomField("category", category)}
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="statuses" className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="add-status">Add Custom Status</Label>
                        <div className="flex gap-2">
                          <Input 
                            id="add-status" 
                            placeholder="Enter status name"
                            value={newCustomFieldType === "status" ? newCustomFieldValue : ""}
                            onChange={(e) => {
                              setNewCustomFieldType("status");
                              setNewCustomFieldValue(e.target.value);
                            }}
                          />
                          <Button onClick={handleAddCustomField}>Add</Button>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Current Custom Statuses</h4>
                        {customStatuses.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No custom statuses added yet</p>
                        ) : (
                          <div className="space-y-2">
                            {customStatuses.map(status => (
                              <div key={status} className="flex justify-between items-center bg-neutral-50 p-2 rounded">
                                <span className="text-sm">{status}</span>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => removeCustomField("status", status)}
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
                
                <DialogFooter>
                  <Button onClick={() => setCustomizeDialogOpen(false)}>
                    Done
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
        
        {canAddTask && (
          <Button variant="default" onClick={handleAddTask}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        )}
      </div>
      
      <TaskList 
        dealId={dealId} 
        viewMode={viewMode} 
        customPhases={customPhases}
        customCategories={customCategories}
        customStatuses={customStatuses}
      />
    </Layout>
  );
}
