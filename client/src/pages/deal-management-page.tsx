import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Deal, insertDealSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { addDays, format } from "date-fns";
import { Plus, MoreHorizontal, Edit2, Trash2, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Extend the schema with validation
const formSchema = insertDealSchema.extend({
  name: z.string().min(3, {
    message: "Deal name must be at least 3 characters.",
  }),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function DealManagementPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentDeal, setCurrentDeal] = useState<Deal | null>(null);
  
  // Fetch all deals
  const { data: deals = [], isLoading, error } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });
  
  // Define form
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      status: "active",
      startDate: undefined,
      endDate: undefined
    },
  });
  
  // Update form values when currentDeal changes
  useEffect(() => {
    if (currentDeal) {
      form.reset({
        name: currentDeal.name,
        status: currentDeal.status,
        startDate: currentDeal.startDate ? new Date(currentDeal.startDate) : undefined,
        endDate: currentDeal.endDate ? new Date(currentDeal.endDate) : undefined
      });
    }
  }, [currentDeal, form]);
  
  // Calculate end date when start date changes (90 days later)
  const startDate = form.watch("startDate");
  
  useEffect(() => {
    if (startDate) {
      // Calculate end date as 90 days from start date
      const calculatedEndDate = addDays(new Date(startDate), 90);
      form.setValue("endDate", calculatedEndDate);
    }
  }, [startDate, form]);
  
  // Update deal mutation
  const updateDealMutation = useMutation({
    mutationFn: async (data: { id: number, dealData: any }) => {
      return await apiRequest("PATCH", `/api/deals/${data.id}`, data.dealData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Deal updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      setEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update deal: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Handle open edit dialog
  const handleEditDeal = (deal: Deal) => {
    setCurrentDeal(deal);
    setEditDialogOpen(true);
  };
  
  // Form submission handler
  const onSubmit = (data: FormData) => {
    if (!currentDeal) return;
    
    // Convert Date objects to ISO strings for API submission
    const formattedData = {
      ...data,
      startDate: data.startDate ? data.startDate.toISOString() : undefined,
      endDate: data.endDate ? data.endDate.toISOString() : undefined
    };
    
    updateDealMutation.mutate({ 
      id: currentDeal.id, 
      dealData: formattedData 
    });
  };
  
  // Update deal status mutation (separate from full edit)
  const updateDealStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest("PATCH", `/api/deals/${id}`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Deal status updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update deal: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Handle status change
  const handleStatusChange = (id: number, status: string) => {
    updateDealStatusMutation.mutate({ id, status });
  };
  
  // Set as active deal
  const handleSetActive = (dealId: number) => {
    // Store the active deal ID in localStorage
    localStorage.setItem("activeDealId", dealId.toString());
    
    toast({
      title: "Active Deal Set",
      description: "You are now working on this deal.",
    });
    
    // Navigate to dashboard
    navigate("/dashboard");
  };

  // Function to determine the badge color based on status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>;
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Layout 
      title="Deal Management" 
      subtitle="View and manage all deals in your portfolio"
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-neutral-600">
            {deals.length} {deals.length === 1 ? "deal" : "deals"} in total
          </p>
        </div>
        <Button onClick={() => navigate("/deals/new")}>
          <Plus className="h-4 w-4 mr-2" /> New Deal
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>All Deals</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <p className="text-neutral-500">Loading deals...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-500 rounded-md">
              Error loading deals. Please try again.
            </div>
          ) : deals.length === 0 ? (
            <div className="text-center p-8">
              <p className="text-neutral-500 mb-4">No deals found</p>
              <Button 
                variant="outline" 
                onClick={() => navigate("/deals/new")}
              >
                Create your first deal
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deal Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.map((deal) => (
                    <TableRow key={deal.id}>
                      <TableCell className="font-medium">{deal.name}</TableCell>
                      <TableCell>{getStatusBadge(deal.status)}</TableCell>
                      <TableCell>
                        {deal.startDate 
                          ? format(new Date(deal.startDate), "MMM d, yyyy") 
                          : "Not set"}
                      </TableCell>
                      <TableCell>
                        {deal.endDate 
                          ? format(new Date(deal.endDate), "MMM d, yyyy") 
                          : "Not set"}
                      </TableCell>
                      <TableCell>
                        {deal.createdAt 
                          ? format(new Date(deal.createdAt), "MMM d, yyyy") 
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleSetActive(deal.id)}>
                              Set as Active Deal
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditDeal(deal)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit Deal
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(deal.id, "active")}
                              disabled={deal.status === "active"}
                            >
                              Mark as Active
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(deal.id, "completed")}
                              disabled={deal.status === "completed"}
                            >
                              Mark as Completed
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(deal.id, "cancelled")}
                              disabled={deal.status === "cancelled"}
                            >
                              Mark as Cancelled
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Edit Deal Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Deal</DialogTitle>
            <DialogDescription>
              Make changes to the deal details. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deal Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter deal name" {...field} />
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
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
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
              
              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateDealMutation.isPending}
                >
                  {updateDealMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}