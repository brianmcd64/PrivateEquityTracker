import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { TaskList } from "@/components/tasks/task-list";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { CreateTaskForm } from "@/components/tasks/create-task-form";
import { Button } from "@/components/ui/button";
import { PlusCircle, Settings2, ListFilter, Kanban, List, ChevronRight, Briefcase } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Deal, Task } from "@shared/schema";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";

import { useLocalStorage } from "@/hooks/use-local-storage";

// Mock users for the prototype
const userMap: Record<number, { name: string; role: string }> = {
  1: { name: "Sarah Johnson", role: "deal_lead" },
  2: { name: "Michael Reynolds", role: "functional_lead" },
  3: { name: "Amanda Lee", role: "functional_lead" },
  4: { name: "Tom Wilson", role: "functional_lead" },
};

export default function ChecklistPage() {
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Deal state (from localStorage)
  const [dealId, setDealId] = useState<number | null>(null);
  const [dealName, setDealName] = useState<string>("");
  
  // Custom fields state from localStorage
  const [customPhases, setCustomPhases] = useLocalStorage<string[]>("customPhases", []);
  const [customCategories, setCustomCategories] = useLocalStorage<string[]>("customCategories", []);
  const [customStatuses, setCustomStatuses] = useLocalStorage<string[]>("customStatuses", []);
  
  // Create task dialog state
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const handleAddTask = () => setIsCreateTaskOpen(true);
  const handleCloseCreateTask = () => setIsCreateTaskOpen(false);
  
  // Get active deal from localStorage on component mount
  useEffect(() => {
    const storedDeal = localStorage.getItem("activeDeal");
    if (storedDeal) {
      try {
        const parsedDeal = JSON.parse(storedDeal);
        setDealId(parsedDeal.id);
        setDealName(parsedDeal.name);
      } catch (e) {
        console.error("Failed to parse active deal from localStorage");
        // Don't redirect, let the component handle the null dealId case
      }
    }
    // Don't redirect to deals page anymore, we'll show a message instead
  }, []);
  
  // Fetch deal details to ensure they're up to date
  const { data: deal } = useQuery<Deal>({
    queryKey: dealId ? [`/api/deals/${dealId}`] : ['skip-deal-query'],
    enabled: !!dealId,
  });
  
  // Update state when deal data is loaded
  useEffect(() => {
    if (deal) {
      setDealName(deal.name);
    }
  }, [deal]);
  
  // View mode state for list organization
  const [viewMode, setViewMode] = useState<"phase" | "date" | "category" | "owner">("phase");
  
  // Filter states
  const [phaseFilter, setPhaseFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [ownerFilter, setOwnerFilter] = useState<string>("");
  
  // View type toggle (list vs kanban)
  const [viewType, setViewType] = useState<"list" | "kanban">("list");
  
  // Fetch all tasks for the deal (needed for kanban view)
  const { data: tasks } = useQuery<Task[]>({
    queryKey: dealId ? [`/api/deals/${dealId}/tasks`] : ['skip-tasks-query'],
    enabled: !!dealId,
  });

  // Customize dialogs
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);
  const [manageCustomFieldsOpen, setManageCustomFieldsOpen] = useState(false);
  
  // New custom field handling
  const [newCustomFieldType, setNewCustomFieldType] = useState<"phase" | "category" | "status">("phase");
  const [newCustomFieldValue, setNewCustomFieldValue] = useState("");
  
  const handleAddCustomField = () => {
    if (!newCustomFieldValue.trim()) {
      toast({
        title: "Error",
        description: "Field name cannot be empty",
        variant: "destructive",
      });
      return;
    }
    
    // Check for duplicates
    let existingFields: string[] = [];
    
    if (newCustomFieldType === "phase") {
      existingFields = [...customPhases];
    } else if (newCustomFieldType === "category") {
      existingFields = [...customCategories];
    } else if (newCustomFieldType === "status") {
      existingFields = [...customStatuses];
    }
    
    if (existingFields.includes(newCustomFieldValue)) {
      toast({
        title: "Error",
        description: `A ${newCustomFieldType} with this name already exists`,
        variant: "destructive",
      });
      return;
    }
    
    // Add the new field
    if (newCustomFieldType === "phase") {
      setCustomPhases([...customPhases, newCustomFieldValue]);
    } else if (newCustomFieldType === "category") {
      setCustomCategories([...customCategories, newCustomFieldValue]);
    } else if (newCustomFieldType === "status") {
      setCustomStatuses([...customStatuses, newCustomFieldValue]);
    }
    
    setNewCustomFieldValue("");
    
    toast({
      title: "Custom Field Added",
      description: `Added ${newCustomFieldType}: ${newCustomFieldValue}`
    });
  };
  
  const removeCustomField = (type: "phase" | "category" | "status", value: string) => {
    if (type === "phase") {
      setCustomPhases(customPhases.filter(phase => phase !== value));
    } else if (type === "category") {
      setCustomCategories(customCategories.filter(category => category !== value));
    } else if (type === "status") {
      setCustomStatuses(customStatuses.filter(status => status !== value));
    }
    
    toast({
      title: "Custom Field Removed",
      description: `Removed ${type}: ${value}`
    });
  };
  
  // Only deal leads and functional leads can add tasks or customize fields
  const canAddTask = user && (user.role === "deal_lead" || user.role === "functional_lead");
  
  // Fetch all deals for selection if no deal is active
  const { data: allDeals = [] } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  // Filter for active deals only
  const activeDeals = allDeals.filter(deal => deal.status === "active");
  
  // If no deal ID yet, show deal selection interface
  if (!dealId) {
    return (
      <Layout 
        title="Due Diligence Checklist" 
        subtitle="Please select a deal to view its checklist"
      >
        <div className="flex flex-col items-center justify-center h-64 max-w-md mx-auto">
          <p className="text-neutral-500 mb-4">
            No active deal selected. Please select a deal from the list below:
          </p>
          
          {activeDeals.length === 0 ? (
            <div className="text-center">
              <p className="text-neutral-500 mb-2">No active deals available.</p>
              <Button 
                variant="outline" 
                onClick={() => navigate("/deals")}
              >
                <Briefcase className="h-4 w-4 mr-2" />
                Go to Deal Management
              </Button>
            </div>
          ) : (
            <div className="w-full space-y-2 bg-white p-4 rounded-lg border border-neutral-200">
              {activeDeals.map(deal => (
                <button
                  key={deal.id}
                  onClick={() => {
                    // Set active deal
                    setDealId(deal.id);
                    setDealName(deal.name);
                    
                    // Save to localStorage
                    localStorage.setItem("activeDeal", JSON.stringify({
                      id: deal.id,
                      name: deal.name,
                      status: deal.status
                    }));
                  }}
                  className="w-full text-left p-3 rounded-md hover:bg-neutral-50 border border-neutral-200 flex justify-between items-center"
                >
                  <span className="font-medium">{deal.name}</span>
                  <ChevronRight className="h-4 w-4 text-neutral-400" />
                </button>
              ))}
            </div>
          )}
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title="Due Diligence Checklist" 
      subtitle={dealName}
    >
      {/* Single-line toolbar layout */}
      <div className="flex justify-between items-center mt-6 mb-10">
        {/* Toggle Buttons (centered) */}
        <div className="flex-1 flex justify-center">
          <div className="bg-neutral-100 p-0.5 rounded-md flex">
            <Button 
              variant={viewType === "list" ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setViewType("list")}
              className="rounded-sm px-5"
            >
              <List className="h-4 w-4 mr-2" />
              List
            </Button>
            <Button 
              variant={viewType === "kanban" ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setViewType("kanban")}
              className="rounded-sm px-5"
            >
              <Kanban className="h-4 w-4 mr-2" />
              Board
            </Button>
          </div>
        </div>
        
        {/* Right-aligned buttons container */}
        <div className="flex items-center gap-3">
          {/* View Mode Selector (shown in both list and kanban views) */}
          <Select value={viewMode} onValueChange={(value) => setViewMode(value as "phase" | "date" | "category" | "owner")}>
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center">
                <ListFilter className="mr-2 h-4 w-4" />
                <span>View: {
                  viewMode === "phase" ? "By Phase" : 
                  viewMode === "category" ? "By Category" : 
                  viewMode === "owner" ? "By Owner" : 
                  "By Date"
                }</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="phase">View by Phase</SelectItem>
              <SelectItem value="category">View by Category</SelectItem>
              <SelectItem value="owner">View by Owner</SelectItem>
              <SelectItem value="date">View by Date</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Additional Filters */}
          {viewMode === "phase" && (
            <Select value={phaseFilter} onValueChange={setPhaseFilter}>
              <SelectTrigger className="w-[180px]">
                <span>{phaseFilter ? "Phase: " + phaseFilter.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : "All Phases"}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Phases</SelectItem>
                <SelectItem value="loi_signing">LOI Signing & DD Kickoff</SelectItem>
                <SelectItem value="planning_initial">Planning & Initial Information Requests</SelectItem>
                <SelectItem value="document_review">Document Review & Tracker Updates</SelectItem>
                <SelectItem value="mid_phase_review">Mid-Phase Review</SelectItem>
                <SelectItem value="deep_dives">Deep Dives & Secondary Requests</SelectItem>
                <SelectItem value="final_risk_review">Final Risk Review & Negotiation</SelectItem>
                <SelectItem value="deal_closing">Deal Closing Preparation</SelectItem>
                <SelectItem value="post_close">Post-Close Integration Planning</SelectItem>
                {customPhases.map(phase => (
                  <SelectItem key={phase} value={phase}>{phase.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {viewMode === "category" && (
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <span>{categoryFilter ? "Category: " + categoryFilter.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : "All Categories"}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                <SelectItem value="operating_team">Operating Team</SelectItem>
                <SelectItem value="seller_broker">Seller / Broker</SelectItem>
                <SelectItem value="ir_bank">IR / Bank</SelectItem>
                <SelectItem value="legal">Legal</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
                <SelectItem value="investment_committee">Investment Committee</SelectItem>
                {customCategories.map(category => (
                  <SelectItem key={category} value={category}>{category.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {viewMode === "owner" && (
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger className="w-[180px]">
                <span>{ownerFilter ? (ownerFilter === "unassigned" ? "Unassigned" : "Owner: " + userMap[parseInt(ownerFilter)]?.name) : "All Owners"}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Owners</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                <SelectItem value="1">Sarah Johnson</SelectItem>
                <SelectItem value="2">Michael Reynolds</SelectItem>
                <SelectItem value="3">Amanda Lee</SelectItem>
                <SelectItem value="4">Tom Wilson</SelectItem>
              </SelectContent>
            </Select>
          )}
          
          {/* Customize Button */}
          {canAddTask && (
            <Dialog open={customizeDialogOpen} onOpenChange={setCustomizeDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Customize
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Customize Fields</DialogTitle>
                  <DialogDescription>
                    Add and manage custom fields for this due diligence checklist.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Tabs defaultValue="phase">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="phase">Phases</TabsTrigger>
                      <TabsTrigger value="category">Categories</TabsTrigger>
                      <TabsTrigger value="status">Statuses</TabsTrigger>
                    </TabsList>
                    <TabsContent value="phase" className="mt-4 space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Add New Phase</h4>
                        <div className="flex space-x-2">
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
                    <TabsContent value="category" className="mt-4 space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Add New Category</h4>
                        <div className="flex space-x-2">
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
                    <TabsContent value="status" className="mt-4 space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Add New Status</h4>
                        <div className="flex space-x-2">
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

          {/* Add Task Button */}
          {canAddTask && (
            <Button variant="default" onClick={handleAddTask} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white">
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          )}
        </div>
      </div>
      
      {/* Render either the TaskList or KanbanBoard based on view type */}
      {viewType === "list" ? (
        <TaskList 
          dealId={dealId} 
          viewMode={viewMode} 
          customPhases={customPhases}
          customCategories={customCategories}
          customStatuses={customStatuses}
        />
      ) : (
        <KanbanBoard 
          tasks={tasks || []} 
          onAddTask={canAddTask ? handleAddTask : undefined}
        />
      )}
      
      {/* Create Task Dialog */}
      {dealId && (
        <CreateTaskForm 
          isOpen={isCreateTaskOpen} 
          onClose={handleCloseCreateTask}
          dealId={dealId}
        />
      )}
    </Layout>
  );
}