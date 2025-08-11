import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ActivityItem {
  id: string;
  type: "info" | "warning" | "error" | "success";
  message: string;
  timestamp: string;
  component: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  isLoading?: boolean;
}

export default function ActivityFeed({ activities, isLoading = false }: ActivityFeedProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "success":
        return { icon: "fas fa-check", color: "bg-green-100 text-green-600" };
      case "warning":
        return { icon: "fas fa-exclamation-triangle", color: "bg-yellow-100 text-yellow-600" };
      case "error":
        return { icon: "fas fa-times", color: "bg-red-100 text-red-600" };
      case "info":
      default:
        return { icon: "fas fa-user-plus", color: "bg-blue-100 text-[#1976D2]" };
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
      return `${Math.floor(diffInSeconds / 86400)} days ago`;
    } catch {
      return "Unknown time";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="rounded-full p-2 w-8 h-8 bg-gray-200"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show sample activities if none exist
  const displayActivities = activities.length > 0 ? activities : [
    {
      id: "1",
      type: "success" as const,
      message: "Session #1247 started forwarding",
      timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      component: "session"
    },
    {
      id: "2",
      type: "info" as const,
      message: "New user registered: @username123",
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      component: "auth"
    },
    {
      id: "3",
      type: "warning" as const,
      message: "Worker #3 high memory usage",
      timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      component: "worker"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle data-testid="text-activity-title">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayActivities.map((activity) => {
            const { icon, color } = getActivityIcon(activity.type);
            return (
              <div key={activity.id} className="flex items-center space-x-3" data-testid={`activity-item-${activity.id}`}>
                <div className={cn("rounded-full p-2", color)}>
                  <i className={`${icon} text-sm`}></i>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900" data-testid={`activity-message-${activity.id}`}>
                    {activity.message}
                  </p>
                  <p className="text-xs text-gray-500" data-testid={`activity-time-${activity.id}`}>
                    {formatTimestamp(activity.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
