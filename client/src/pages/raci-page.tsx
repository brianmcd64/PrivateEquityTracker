import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RaciMatrix, Task } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, Save } from "lucide-react";

export default function RaciPage() {
  const { toast } = useToast();
  const [phaseFilter, setPhaseFilter] = useState<string>("");
  const [editMode, setEditMode] = useState(false);
  const [raciData, setRaciData] = useState<Record<number, RaciMatrix>>({});
  
  // For prototype, we'll use hardcoded dealId
  const dealId = 1;
  
  // Mock users for the prototype
  const users = [
    { id: 1, name: "Sarah Johnson", role: "deal_lead" },
    { id: 2, name: "Michael Reynolds", role: "functional_lead", specialization: "financial" },
    { id: 3, name: "Amanda Lee", role: "functional_lead", specialization: "legal" },
    { id: 4, name: "Tom Wilson", role: "functional_lead", specialization: "operations" },
    { id: 5, name: "James Partner", role: "partner" },
  ];
  
  // Fetch all tasks for the deal
  const { data: tasks, isLoading: isTasksLoading } = useQuery<Task[]>({
    queryKey: [`/api/deals/${dealId}/tasks`],
  });
  
  // Filter tasks based on phase filter
  const filteredTasks = tasks?.filter(task => {
    return phaseFilter === "" || task.phase === phaseFilter;
  });
  
  // For each task, fetch its RACI matrix
  useEffect(() => {
    const fetchRaciMatrices = async () => {
      if (!tasks) return;
      
      const matrices: Record<number, RaciMatrix> = {};
      
      // For the prototype, let's create some default RACI data
      for (const task of tasks) {
        try {
          // Try to fetch from API
          const response = await fetch(`/api/tasks/${task.id}/raci`);
          
          if (response.ok) {
            const data = await response.json();
            matrices[task.id] = data;
          } else {
            // If not found, create a default one
            matrices[task.id] = {
              id: 0,
              dealId,
              taskId: task.id,
              responsible: task.assignedTo || null,
              accountable: 1, // Deal Lead by default
              consulted: [],
              informed: [5], // Partner by default
            };
          }
        } catch (error) {
          console.error("Error fetching RACI matrix:", error);
          
          // Use default
          matrices[task.id] = {
            id: 0,
            dealId,
            taskId: task.id,
            responsible: task.assignedTo || null,
            accountable: 1, // Deal Lead by default
            consulted: [],
            informed: [5], // Partner by default
          };
        }
      }
      
      setRaciData(matrices);
    };
    
    fetchRaciMatrices();
  }, [tasks, dealId]);
  
  // Save RACI mutation
  const saveRaciMutation = useMutation({
    mutationFn: async () => {
      const promises = Object.values(raciData).map(raci => 
        apiRequest("POST", "/api/raci", raci)
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: "RACI matrix saved",
        description: "The RACI assignments have been updated successfully.",
      });
      setEditMode(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to save RACI matrix: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const handleSave = () => {
    saveRaciMutation.mutate();
  };
  
  const updateRaci = (taskId: number, role: "responsible" | "accountable" | "consulted" | "informed", userId: number | null) => {
    setRaciData(prev => {
      const currentRaci = prev[taskId];
      
      if (!currentRaci) return prev;
      
      if (role === "responsible" || role === "accountable") {
        return {
          ...prev,
          [taskId]: {
            ...currentRaci,
            [role]: userId,
          }
        };
      } else {
        // For consulted and informed which are arrays
        const currentArray = currentRaci[role] as number[];
        
        // If userId is null, clear the array
        if (userId === null) {
          return {
            ...prev,
            [taskId]: {
              ...currentRaci,
              [role]: [],
            }
          };
        }
        
        // Toggle the user in the array
        const newArray = currentArray.includes(userId)
          ? currentArray.filter(id => id !== userId)
          : [...currentArray, userId];
          
        return {
          ...prev,
          [taskId]: {
            ...currentRaci,
            [role]: newArray,
          }
        };
      }
    });
  };
  
  return (
    <Layout 
      title="RACI Matrix" 
      subtitle="TechFusion Acquisition"
    >
      {/* Filters and Controls */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex items-center gap-4">
          <Select value={phaseFilter} onValueChange={setPhaseFilter}>
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center">
                <Filter className="mr-2 h-4 w-4" />
                <span>{phaseFilter ? `Phase: ${phaseFilter}` : "All Phases"}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Phases</SelectItem>
              <SelectItem value="loi">LOI</SelectItem>
              <SelectItem value="document">Document Review</SelectItem>
              <SelectItem value="deepdive">Deep Dive</SelectItem>
              <SelectItem value="final">Final Analysis</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-2">
          {editMode ? (
            <>
              <Button 
                variant="default" 
                onClick={handleSave}
                disabled={saveRaciMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setEditMode(false)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditMode(true)}>
              Edit RACI
            </Button>
          )}
        </div>
      </div>
      
      {/* RACI Matrix Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Task</TableHead>
                <TableHead className="text-center">Responsible</TableHead>
                <TableHead className="text-center">Accountable</TableHead>
                <TableHead className="text-center">Consulted</TableHead>
                <TableHead className="text-center">Informed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isTasksLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6">
                    Loading tasks...
                  </TableCell>
                </TableRow>
              ) : filteredTasks && filteredTasks.length > 0 ? (
                filteredTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    
                    {/* Responsible */}
                    <TableCell className="text-center">
                      {editMode ? (
                        <Select 
                          value={raciData[task.id]?.responsible?.toString() || ""}
                          onValueChange={(value) => updateRaci(task.id, "responsible", value ? parseInt(value) : null)}
                        >
                          <SelectTrigger className="w-full justify-center">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {users.map(user => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-sm font-medium">
                          {users.find(u => u.id === raciData[task.id]?.responsible)?.name || "None"}
                        </div>
                      )}
                    </TableCell>
                    
                    {/* Accountable */}
                    <TableCell className="text-center">
                      {editMode ? (
                        <Select 
                          value={raciData[task.id]?.accountable?.toString() || ""}
                          onValueChange={(value) => updateRaci(task.id, "accountable", value ? parseInt(value) : null)}
                        >
                          <SelectTrigger className="w-full justify-center">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {users.map(user => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="px-2 py-1 rounded bg-orange-50 text-orange-700 text-sm font-medium">
                          {users.find(u => u.id === raciData[task.id]?.accountable)?.name || "None"}
                        </div>
                      )}
                    </TableCell>
                    
                    {/* Consulted */}
                    <TableCell className="text-center">
                      {editMode ? (
                        <>
                          {users.map(user => (
                            <div key={user.id} className="flex items-center mb-1">
                              <input 
                                type="checkbox" 
                                id={`consulted-${task.id}-${user.id}`} 
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                checked={(raciData[task.id]?.consulted as number[])?.includes(user.id) || false}
                                onChange={() => updateRaci(task.id, "consulted", user.id)}
                              />
                              <label htmlFor={`consulted-${task.id}-${user.id}`} className="ml-2 text-sm text-gray-700">
                                {user.name}
                              </label>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="flex flex-wrap gap-1 justify-center">
                          {((raciData[task.id]?.consulted as number[]) || []).map(userId => (
                            <span key={userId} className="px-2 py-1 rounded bg-green-50 text-green-700 text-sm">
                              {users.find(u => u.id === userId)?.name || userId}
                            </span>
                          ))}
                          {!raciData[task.id]?.consulted || (raciData[task.id]?.consulted as number[]).length === 0 && (
                            <span className="text-gray-400">None</span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    
                    {/* Informed */}
                    <TableCell className="text-center">
                      {editMode ? (
                        <>
                          {users.map(user => (
                            <div key={user.id} className="flex items-center mb-1">
                              <input 
                                type="checkbox" 
                                id={`informed-${task.id}-${user.id}`} 
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                checked={(raciData[task.id]?.informed as number[])?.includes(user.id) || false}
                                onChange={() => updateRaci(task.id, "informed", user.id)}
                              />
                              <label htmlFor={`informed-${task.id}-${user.id}`} className="ml-2 text-sm text-gray-700">
                                {user.name}
                              </label>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="flex flex-wrap gap-1 justify-center">
                          {((raciData[task.id]?.informed as number[]) || []).map(userId => (
                            <span key={userId} className="px-2 py-1 rounded bg-purple-50 text-purple-700 text-sm">
                              {users.find(u => u.id === userId)?.name || userId}
                            </span>
                          ))}
                          {!raciData[task.id]?.informed || (raciData[task.id]?.informed as number[]).length === 0 && (
                            <span className="text-gray-400">None</span>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    No tasks found. {phaseFilter ? "Try selecting a different phase." : ""}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Legend */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold text-blue-700 mb-2">Responsible (R)</h3>
          <p className="text-sm text-gray-600">Person who performs the task. There is typically one person responsible for each task.</p>
        </Card>
        
        <Card className="p-4">
          <h3 className="font-semibold text-orange-700 mb-2">Accountable (A)</h3>
          <p className="text-sm text-gray-600">Person ultimately answerable for the task and who ensures it is completed correctly.</p>
        </Card>
        
        <Card className="p-4">
          <h3 className="font-semibold text-green-700 mb-2">Consulted (C)</h3>
          <p className="text-sm text-gray-600">People whose opinions are sought before a final decision is made or action is taken.</p>
        </Card>
        
        <Card className="p-4">
          <h3 className="font-semibold text-purple-700 mb-2">Informed (I)</h3>
          <p className="text-sm text-gray-600">People who are kept up-to-date on progress, often only when the task is complete.</p>
        </Card>
      </div>
    </Layout>
  );
}
