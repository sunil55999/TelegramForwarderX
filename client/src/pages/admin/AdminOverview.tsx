import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Server, 
  Activity, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Database
} from "lucide-react";
import { DashboardStats, SystemHealth, ActivityItem } from "@shared/schema";

export default function AdminOverview() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: health, isLoading: healthLoading } = useQuery<SystemHealth>({
    queryKey: ["/api/dashboard/health"],
  });

  const { data: activity, isLoading: activityLoading } = useQuery<ActivityItem[]>({
    queryKey: ["/api/dashboard/activity"],
  });

  const getStatusColor = (value: number, thresholds: { warning: number; danger: number }) => {
    if (value >= thresholds.danger) return "text-red-600";
    if (value >= thresholds.warning) return "text-yellow-600";
    return "text-green-600";
  };

  const getStatusBadge = (value: number, thresholds: { warning: number; danger: number }) => {
    if (value >= thresholds.danger) return <Badge variant="destructive">Critical</Badge>;
    if (value >= thresholds.warning) return <Badge variant="secondary">Warning</Badge>;
    return <Badge variant="default" className="bg-green-100 text-green-800">Normal</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Overview</h1>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats?.totalUsers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Registered system users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Workers</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats?.activeWorkers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Online worker processes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats?.activeSessions || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Connected Telegram sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats?.messagesToday || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Messages processed today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>System Health</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">CPU Usage</span>
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-bold ${getStatusColor(health?.cpuUsage || 0, { warning: 70, danger: 90 })}`}>
                  {healthLoading ? "..." : `${health?.cpuUsage || 0}%`}
                </span>
                {!healthLoading && getStatusBadge(health?.cpuUsage || 0, { warning: 70, danger: 90 })}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Memory Usage</span>
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-bold ${getStatusColor(health?.memoryUsage || 0, { warning: 80, danger: 95 })}`}>
                  {healthLoading ? "..." : `${health?.memoryUsage || 0}%`}
                </span>
                {!healthLoading && getStatusBadge(health?.memoryUsage || 0, { warning: 80, danger: 95 })}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">RAM Usage</span>
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-bold ${getStatusColor(health?.ramUsage || 0, { warning: 75, danger: 90 })}`}>
                  {healthLoading ? "..." : `${health?.ramUsage || 0}%`}
                </span>
                {!healthLoading && getStatusBadge(health?.ramUsage || 0, { warning: 75, danger: 90 })}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Database Load</span>
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-bold ${getStatusColor(health?.dbLoad || 0, { warning: 60, danger: 85 })}`}>
                  {healthLoading ? "..." : `${health?.dbLoad || 0}%`}
                </span>
                {!healthLoading && getStatusBadge(health?.dbLoad || 0, { warning: 60, danger: 85 })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Recent System Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {activityLoading ? (
                <div className="text-sm text-gray-500">Loading activity...</div>
              ) : activity?.length ? (
                activity.slice(0, 8).map((item) => (
                  <div key={item.id} className="flex items-start space-x-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="flex-shrink-0 mt-1">
                      {item.type === "error" ? (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      ) : item.type === "success" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : item.type === "warning" ? (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {item.message}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.component} • {new Date(item.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">No recent activity</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}