import { Request } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface RequestsListProps {
  requests: Request[];
}

export function RequestsList({ requests }: RequestsListProps) {
  if (!requests || requests.length === 0) {
    return <p className="text-center text-gray-500">No requests found.</p>;
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Not set";
    return format(new Date(dateString), "MMM d, yyyy");
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
    const statusMap: Record<string, { label: string, class: string }> = {
      "pending": { label: "Pending", class: "bg-gray-100 text-gray-800" },
      "sent": { label: "Sent", class: "bg-blue-100 text-blue-800" },
      "awaiting_response": { label: "Awaiting Response", class: "bg-yellow-100 text-yellow-800" },
      "answered": { label: "Answered", class: "bg-green-100 text-green-800" },
    };
    return statusMap[status] || { label: "Unknown", class: "bg-gray-100 text-gray-800" };
  };

  const formatType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  return (
    <div className="space-y-4">
      {requests.map((request) => {
        const priority = getPriorityLabel(request.priority);
        const status = getStatusLabel(request.status);
        
        return (
          <Card key={request.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{request.requestId}</h3>
                  <Badge variant="outline">{formatType(request.requestType)}</Badge>
                </div>
                <div className="flex gap-2">
                  <Badge className={priority.class}>{priority.label}</Badge>
                  <Badge className={status.class}>{status.label}</Badge>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-2">{request.details}</p>
              
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mt-3">
                <div>Recipient: <span className="font-medium">{request.recipient}</span></div>
                <div>Send Date: <span className="font-medium">{formatDate(request.sendDate)}</span></div>
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