import { Request, RequestStatuses } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { EditRequestForm } from "./edit-request-form";
import { CheckCircle, Send, Clock } from "lucide-react";

interface RequestsListProps {
  requests: Request[];
  onUpdateRequest?: () => void;
}

export function RequestsList({ requests, onUpdateRequest }: RequestsListProps) {
  if (!requests || requests.length === 0) {
    return <p className="text-center text-gray-500">No requests found.</p>;
  }

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "Not set";
    const dateObj = date instanceof Date ? date : new Date(date);
    return format(dateObj, "MMM d, yyyy");
  };

  const getPriorityLabel = (priority: number) => {
    const priorityMap: Record<number, { label: string, class: string }> = {
      1: { label: "Low", class: "bg-blue-100 text-blue-800" },
      2: { label: "Medium", class: "bg-yellow-100 text-yellow-800" },
      3: { label: "High", class: "bg-red-100 text-red-800" },
    };
    return priorityMap[priority] || { label: "Unknown", class: "bg-gray-100 text-gray-800" };
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, { label: string, class: string, icon: React.ReactNode }> = {
      [RequestStatuses.PENDING]: { 
        label: "Pending", 
        class: "bg-gray-100 text-gray-800",
        icon: <Clock className="h-3 w-3 mr-1" />
      },
      [RequestStatuses.SENT]: { 
        label: "Sent", 
        class: "bg-blue-100 text-blue-800",
        icon: <Send className="h-3 w-3 mr-1" />
      },
      [RequestStatuses.AWAITING_RESPONSE]: { 
        label: "Awaiting Response", 
        class: "bg-yellow-100 text-yellow-800",
        icon: <Clock className="h-3 w-3 mr-1" />
      },
      [RequestStatuses.ANSWERED]: { 
        label: "Answered", 
        class: "bg-green-100 text-green-800",
        icon: <CheckCircle className="h-3 w-3 mr-1" />
      },
    };
    return statusMap[status] || { 
      label: "Unknown", 
      class: "bg-gray-100 text-gray-800",
      icon: null
    };
  };

  const formatType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };
  
  // Sort requests by priority, then by status (answered last)
  const sortedRequests = [...requests].sort((a, b) => {
    // First sort by status - answered requests at the bottom
    if (a.status === RequestStatuses.ANSWERED && b.status !== RequestStatuses.ANSWERED) return 1;
    if (a.status !== RequestStatuses.ANSWERED && b.status === RequestStatuses.ANSWERED) return -1;
    
    // Then sort by priority (higher priority first)
    return b.priority - a.priority;
  });

  return (
    <div className="space-y-4">
      {sortedRequests.map((request) => {
        const priority = getPriorityLabel(request.priority);
        const status = getStatusLabel(request.status);
        
        return (
          <Card key={request.id} className={`overflow-hidden ${request.status === RequestStatuses.ANSWERED ? 'border-green-200 bg-green-50' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{request.requestId}</h3>
                  <Badge variant="outline">{formatType(request.requestType)}</Badge>
                </div>
                <div className="flex gap-2 items-center">
                  <Badge className={priority.class}>{priority.label}</Badge>
                  <Badge className={status.class}>
                    <div className="flex items-center">
                      {status.icon}
                      {status.label}
                    </div>
                  </Badge>
                  <EditRequestForm 
                    request={request} 
                    onComplete={onUpdateRequest}
                    trigger={
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <span className="sr-only">Edit</span>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                          <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>
                          <path d="m15 5 4 4"></path>
                        </svg>
                      </Button>
                    }
                  />
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-2">{request.details}</p>
              
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mt-3">
                <div>Recipient: <span className="font-medium">{request.recipient}</span></div>
                <div>Created: <span className="font-medium">{formatDate(request.createdAt)}</span></div>
              </div>
              
              {request.response && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm font-medium">Response:</p>
                  <p className="text-sm">{request.response}</p>
                  <p className="text-xs text-gray-500 mt-1">Received: {formatDate(request.responseDate)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}