import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Deal } from "@shared/schema";
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
import { format } from "date-fns";
import { Plus, MoreHorizontal, Edit2, Trash2 } from "lucide-react";

export default function DealManagementPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Fetch all deals
  const { data: deals = [], isLoading, error } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });
  
  // Update deal status mutation
  const updateDealMutation = useMutation({
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
    updateDealMutation.mutate({ id, status });
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
    </Layout>
  );
}