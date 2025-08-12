import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Activity, Users, Zap, Database, TrendingUp, Clock, MessageSquare, Router, FileText, BarChart3, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";

interface DashboardStats {
  activeSessions: number;
  activeWorkers: number;
  messagesProcessed: number;
  totalUsers: number;
}

interface SystemHealth {
  cpuUsage: number;
  memoryUsage: number;
  dbLoad: number;
  status: "healthy" | "warning" | "critical";
}

interface RecentActivity {
  id: string;
  type: "session_started" | "message_forwarded" | "user_registered" | "error";
  description: string;
  timestamp: string;
  userId?: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: health, isLoading: healthLoading } = useQuery<SystemHealth>({
    queryKey: ["/api/dashboard/health"],
  });

  const { data: activity, isLoading: activityLoading } = useQuery<RecentActivity[]>({
    queryKey: ["/api/dashboard/activity"],
  });

  if (statsLoading || healthLoading || activityLoading) {
    return (
      <div className="min-h-screen bg-[#121212] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-[#232323] rounded-lg p-6 shadow-lg">
                  <div className="h-4 bg-gray-600 rounded w-3/4 mb-4"></div>
                  <div className="h-8 bg-gray-600 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "session_started":
        return <Zap className="h-4 w-4 text-[#00B4D8]" />;
      case "message_forwarded":
        return <MessageSquare className="h-4 w-4 text-[#00B4D8]" />;
      case "user_registered":
        return <Users className="h-4 w-4 text-[#00B4D8]" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getHealthColor = (value: number) => {
    if (value < 50) return "text-green-400";
    if (value < 80) return "text-yellow-400";
    return "text-red-400";
  };

  const getProgressColor = (value: number) => {
    if (value < 50) return "bg-green-500";
    if (value < 80) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      case "critical":
        return <XCircle className="h-5 w-5 text-red-400" />;
      default:
        return <CheckCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-[#E0E0E0] mb-2">
            Welcome back, {user?.username || 'User'}!
          </h1>
          <p className="text-gray-400">Here's what's happening with your AutoForwardX system today.</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link href="/sources">
            <Button 
              variant="outline" 
              className="w-full bg-[#232323] border-[#333333] hover:border-[#00B4D8] hover:bg-[#00B4D8]/10 text-[#E0E0E0] hover:text-[#00B4D8] transition-all duration-200 rounded-lg shadow-lg"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Sources
            </Button>
          </Link>
          <Link href="/destinations">
            <Button 
              variant="outline" 
              className="w-full bg-[#232323] border-[#333333] hover:border-[#00B4D8] hover:bg-[#00B4D8]/10 text-[#E0E0E0] hover:text-[#00B4D8] transition-all duration-200 rounded-lg shadow-lg"
            >
              <Router className="h-4 w-4 mr-2" />
              Destinations
            </Button>
          </Link>
          <Link href="/forwarding">
            <Button 
              variant="outline" 
              className="w-full bg-[#232323] border-[#333333] hover:border-[#00B4D8] hover:bg-[#00B4D8]/10 text-[#E0E0E0] hover:text-[#00B4D8] transition-all duration-200 rounded-lg shadow-lg"
            >
              <Zap className="h-4 w-4 mr-2" />
              Rules
            </Button>
          </Link>
          <Link href="/logs">
            <Button 
              variant="outline" 
              className="w-full bg-[#232323] border-[#333333] hover:border-[#00B4D8] hover:bg-[#00B4D8]/10 text-[#E0E0E0] hover:text-[#00B4D8] transition-all duration-200 rounded-lg shadow-lg"
            >
              <FileText className="h-4 w-4 mr-2" />
              Logs
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-[#232323] border-[#333333] hover:border-[#00B4D8]/50 transition-all duration-200 shadow-lg rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-[#E0E0E0]">Active Sessions</CardTitle>
              <div className="p-2 bg-[#00B4D8]/20 rounded-lg">
                <Activity className="h-4 w-4 text-[#00B4D8]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#E0E0E0] mb-1">{stats?.activeSessions || 0}</div>
              <p className="text-xs text-gray-400">Telegram connections</p>
              <div className="mt-3 h-2 bg-gray-600 rounded-full overflow-hidden">
                <div className="h-full bg-[#00B4D8] rounded-full w-3/4 transition-all duration-300"></div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#232323] border-[#333333] hover:border-[#00B4D8]/50 transition-all duration-200 shadow-lg rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-[#E0E0E0]">Active Workers</CardTitle>
              <div className="p-2 bg-[#00B4D8]/20 rounded-lg">
                <Zap className="h-4 w-4 text-[#00B4D8]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#E0E0E0] mb-1">{stats?.activeWorkers || 0}</div>
              <p className="text-xs text-gray-400">Processing messages</p>
              <div className="mt-3 h-2 bg-gray-600 rounded-full overflow-hidden">
                <div className="h-full bg-[#00B4D8] rounded-full w-4/5 transition-all duration-300"></div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#232323] border-[#333333] hover:border-[#00B4D8]/50 transition-all duration-200 shadow-lg rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-[#E0E0E0]">Messages Today</CardTitle>
              <div className="p-2 bg-[#00B4D8]/20 rounded-lg">
                <TrendingUp className="h-4 w-4 text-[#00B4D8]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#E0E0E0] mb-1">{stats?.messagesProcessed || 0}</div>
              <p className="text-xs text-gray-400">Successfully forwarded</p>
              <div className="mt-3 h-2 bg-gray-600 rounded-full overflow-hidden">
                <div className="h-full bg-[#00B4D8] rounded-full w-2/3 transition-all duration-300"></div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#232323] border-[#333333] hover:border-[#00B4D8]/50 transition-all duration-200 shadow-lg rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-[#E0E0E0]">System Status</CardTitle>
              <div className="p-2 bg-[#00B4D8]/20 rounded-lg">
                {getStatusIcon(health?.status || "healthy")}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#E0E0E0] mb-1 capitalize">
                {health?.status || "Healthy"}
              </div>
              <p className="text-xs text-gray-400">All systems operational</p>
              <Badge 
                variant="outline" 
                className="mt-2 border-[#00B4D8]/50 text-[#00B4D8] bg-[#00B4D8]/10"
              >
                Operational
              </Badge>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* System Health */}
          <Card className="bg-[#232323] border-[#333333] hover:border-[#00B4D8]/50 transition-all duration-200 shadow-lg rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl text-[#E0E0E0]">
                <div className="p-2 bg-[#00B4D8]/20 rounded-lg">
                  <Database className="h-5 w-5 text-[#00B4D8]" />
                </div>
                System Health
              </CardTitle>
              <CardDescription className="text-gray-400">
                Real-time resource monitoring
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#E0E0E0]">CPU Usage</span>
                  <span className={`font-mono font-medium ${getHealthColor(health?.cpuUsage || 0)}`}>
                    {health?.cpuUsage || 0}%
                  </span>
                </div>
                <div className="h-3 bg-gray-600 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getProgressColor(health?.cpuUsage || 0)} rounded-full transition-all duration-500`}
                    style={{ width: `${health?.cpuUsage || 0}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#E0E0E0]">Memory Usage</span>
                  <span className={`font-mono font-medium ${getHealthColor(health?.memoryUsage || 0)}`}>
                    {health?.memoryUsage || 0}%
                  </span>
                </div>
                <div className="h-3 bg-gray-600 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getProgressColor(health?.memoryUsage || 0)} rounded-full transition-all duration-500`}
                    style={{ width: `${health?.memoryUsage || 0}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#E0E0E0]">Database Load</span>
                  <span className={`font-mono font-medium ${getHealthColor(health?.dbLoad || 0)}`}>
                    {health?.dbLoad || 0}%
                  </span>
                </div>
                <div className="h-3 bg-gray-600 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getProgressColor(health?.dbLoad || 0)} rounded-full transition-all duration-500`}
                    style={{ width: `${health?.dbLoad || 0}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="bg-[#232323] border-[#333333] hover:border-[#00B4D8]/50 transition-all duration-200 shadow-lg rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl text-[#E0E0E0]">
                <div className="p-2 bg-[#00B4D8]/20 rounded-lg">
                  <Clock className="h-5 w-5 text-[#00B4D8]" />
                </div>
                Activity Feed
              </CardTitle>
              <CardDescription className="text-gray-400">
                Latest system events and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activity && activity.length > 0 ? (
                <div className="space-y-4">
                  {activity.slice(0, 5).map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-start gap-4 p-4 bg-[#2a2a2a] rounded-lg border border-[#404040] hover:border-[#00B4D8]/30 transition-all duration-200"
                    >
                      <div className="p-2 bg-[#00B4D8]/20 rounded-lg">
                        {getActivityIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#E0E0E0] text-sm font-medium">{item.description}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(item.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="p-4 bg-[#2a2a2a] rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Activity className="h-8 w-8 text-gray-500" />
                  </div>
                  <p className="text-[#E0E0E0] font-medium">No recent activity</p>
                  <p className="text-xs text-gray-400 mt-1">Activity will appear here as your system operates</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Session Controls Footer */}
        <div className="mt-12 flex flex-wrap gap-4 justify-center">
          <Button 
            className="bg-[#00B4D8] hover:bg-[#00B4D8]/80 text-white px-6 py-2 rounded-lg transition-all duration-200 shadow-lg"
          >
            Add New Session
          </Button>
          <Button 
            variant="outline"
            className="bg-[#232323] border-[#333333] hover:border-[#00B4D8] hover:bg-[#00B4D8]/10 text-[#E0E0E0] hover:text-[#00B4D8] px-6 py-2 rounded-lg transition-all duration-200"
          >
            Pause All Sessions
          </Button>
          <Button 
            variant="outline"
            className="bg-[#232323] border-[#333333] hover:border-red-400 hover:bg-red-500/10 text-[#E0E0E0] hover:text-red-400 px-6 py-2 rounded-lg transition-all duration-200"
          >
            Stop All Sessions
          </Button>
        </div>
      </div>
    </div>
  );
}