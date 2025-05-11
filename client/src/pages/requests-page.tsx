import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, ExternalLink, Filter } from "lucide-react";
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
import { Request, RequestStatuses } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function RequestsPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  
  // For prototype, we'll use hardcoded dealId
  const dealId = 1;
  
  // Fetch all requests for the deal
  const { data: requests, isLoading, error } = useQuery<Request[]>({
    queryKey: [`/api/deals/${dealId}/requests`],
  });
  
  // Filter requests based on search term and status filter
  const filteredRequests = requests?.filter(request => {
    const matchesSearch = 
      searchTerm === "" || 
      request.requestId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.details.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === "" || request.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  // New request button click handler
  const handleNewRequest = () => {
    toast({
      title: "Feature not implemented",
      description: "Request creation form would appear here in the full application.",
    });
  };
  
  // Render status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case RequestStatuses.PENDING:
        return <Badge variant="outline" className="text-amber-500 border-amber-200 bg-amber-50">Pending</Badge>;
      case RequestStatuses.SENT:
        return <Badge variant="outline" className="text-blue-500 border-blue-200 bg-blue-50">Sent</Badge>;
      case RequestStatuses.AWAITING_RESPONSE:
        return <Badge variant="outline" className="text-purple-500 border-purple-200 bg-purple-50">Awaiting Response</Badge>;
      case RequestStatuses.ANSWERED:
        return <Badge variant="outline" className="text-green-500 border-green-200 bg-green-50">Answered</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Get recipient display name
  const getRecipientName = (recipient: string) => {
    switch (recipient) {
      case "seller": return "Seller Team";
      case "management": return "Management Team";
      case "advisor": return "Financial Advisor";
      case "legal": return "Legal Team";
      default: return recipient;
    }
  };
  
  // Format priority
  const formatPriority = (priority: number) => {
    switch (priority) {
      case 1: return "Low";
      case 2: return "Medium";
      case 3: return "High";
      default: return "Unknown";
    }
  };

  return (
    <Layout 
      title="Requests & Q&A" 
      subtitle="TechFusion Acquisition"
    >
      {/* Filters and Search */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search requests..."
              className="w-full sm:w-[300px] pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <div className="flex items-center">
                <Filter className="mr-2 h-4 w-4" />
                <span>{statusFilter ? `Status: ${statusFilter}` : "All Statuses"}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value={RequestStatuses.PENDING}>Pending</SelectItem>
              <SelectItem value={RequestStatuses.SENT}>Sent</SelectItem>
              <SelectItem value={RequestStatuses.AWAITING_RESPONSE}>Awaiting Response</SelectItem>
              <SelectItem value={RequestStatuses.ANSWERED}>Answered</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button onClick={handleNewRequest}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Request
        </Button>
      </div>
      
      {/* Requests Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request ID</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Task</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6">
                    Loading requests...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-red-500">
                    Error loading requests
                  </TableCell>
                </TableRow>
              ) : filteredRequests && filteredRequests.length > 0 ? (
                filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.requestId}</TableCell>
                    <TableCell className="max-w-xs truncate" title={request.details}>
                      {request.details}
                    </TableCell>
                    <TableCell>{renderStatusBadge(request.status)}</TableCell>
                    <TableCell>{getRecipientName(request.recipient)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`
                          ${request.priority === 3 ? 'text-red-500 border-red-200 bg-red-50' : 
                            request.priority === 2 ? 'text-amber-500 border-amber-200 bg-amber-50' : 
                            'text-green-500 border-green-200 bg-green-50'}
                        `}
                      >
                        {formatPriority(request.priority)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}</TableCell>
                    <TableCell>
                      <Link href={`/task/${request.taskId}`}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    No requests found. {searchTerm || statusFilter ? "Try changing your filters." : ""}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Layout>
  );
}
