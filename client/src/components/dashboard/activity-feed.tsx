import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ActivityLog } from "@shared/schema";

interface ActivityFeedProps {
  dealId: number;
}

export function ActivityFeed({ dealId }: ActivityFeedProps) {
  const { data: activities, isLoading, error } = useQuery<ActivityLog[]>({
    queryKey: [`/api/deals/${dealId}/activity`],
  });

  const [activityData, setActivityData] = useState<{
    userId: number;
    userName: string;
    action: string;
    details: string;
    timestamp: Date;
    documentInfo?: {
      name: string;
      size: string;
    };
  }[]>([]);

  // Simulated user data mapping for the prototype
  const users = {
    1: { name: "Sarah Johnson", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" },
    2: { name: "Michael Reynolds", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" },
    3: { name: "Amanda Lee", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" },
    4: { name: "Tom Wilson", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" },
  };

  useEffect(() => {
    if (activities) {
      const parsedActivities = activities.map((activity) => {
        const userId = activity.userId;
        const userName = users[userId as keyof typeof users]?.name || "Unknown User";
        const documentInfo = activity.entityType === "document" ? {
          name: activity.details.replace("Uploaded document: ", "") || "Document",
          size: "1.2 MB"
        } : undefined;

        return {
          userId,
          userName,
          action: activity.action,
          details: activity.details,
          timestamp: new Date(activity.timestamp),
          documentInfo
        };
      });
      
      setActivityData(parsedActivities);
    }
  }, [activities]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Activity Feed</h3>
          <div className="h-40 flex items-center justify-center">
            <p className="text-neutral-500">Loading activity feed...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Activity Feed</h3>
          <div className="h-40 flex items-center justify-center">
            <p className="text-red-500">Failed to load activity feed</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Activity Feed</h3>
        <div className="space-y-4">
          {activityData.map((activity, index) => (
            <div key={index} className={`${index < activityData.length - 1 ? 'border-b border-neutral-200 pb-4' : ''}`}>
              <div className="flex items-start">
                <Avatar className="h-8 w-8 mr-3">
                  <AvatarFallback>{activity.userName.substring(0, 2)}</AvatarFallback>
                  <AvatarImage src={users[activity.userId as keyof typeof users]?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(activity.userName)}&background=eef2ff&color=4f46e5`} alt={activity.userName} />
                </Avatar>
                <div>
                  <div className="flex items-center mb-1">
                    <span className="font-medium text-neutral-900 mr-2">{activity.userName}</span>
                    <span className="text-neutral-500 text-sm">{activity.details}</span>
                  </div>
                  <p className="text-sm text-neutral-500">
                    {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                  </p>
                  
                  {activity.documentInfo && (
                    <div className="mt-2 p-3 bg-neutral-50 rounded-md border border-neutral-200">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-red-500 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-neutral-900 line-clamp-1">{activity.documentInfo.name}</p>
                          <p className="text-xs text-neutral-500">{activity.documentInfo.size}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {activityData.length === 0 && (
            <div className="text-center py-4">
              <p className="text-neutral-500">No activity recorded yet</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
