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
              className="w-full btn-secondary h-12 text-sm font-semibold"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Sources
            </Button>
          </Link>
          <Link href="/destinations">
            <Button 
              variant="outline" 
              className="w-full btn-secondary h-12 text-sm font-semibold"
            >
              <Router className="h-4 w-4 mr-2" />
              Destinations
            </Button>
          </Link>
          <Link href="/forwarding">
            <Button 
              variant="outline" 
              className="w-full btn-secondary h-12 text-sm font-semibold"
            >
              <Zap className="h-4 w-4 mr-2" />
              Rules
            </Button>
          </Link>
          <Link href="/logs">
            <Button 
              variant="outline" 
              className="w-full btn-secondary h-12 text-sm font-semibold"
            >
              <FileText className="h-4 w-4 mr-2" />
              Logs
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="card-professional">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-[#E0E0E0]">Active Sessions</CardTitle>
              <div className="p-3 bg-[#00B4D8]/20 rounded-lg">
                <Activity className="h-5 w-5 text-[#00B4D8]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#00B4D8] mb-2">{stats?.activeSessions || 0}</div>
              <p className="text-sm text-gray-400 mb-4">Telegram connections</p>
              <div className="progress-bar">
                <div className="progress-fill healthy" style={{ width: '75%' }}></div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-professional">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-[#E0E0E0]">Active Workers</CardTitle>
              <div className="p-3 bg-[#00B4D8]/20 rounded-lg">
                <Zap className="h-5 w-5 text-[#00B4D8]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#00B4D8] mb-2">{stats?.activeWorkers || 0}</div>
              <p className="text-sm text-gray-400 mb-4">Processing messages</p>
              <div className="progress-bar">
                <div className="progress-fill healthy" style={{ width: '80%' }}></div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-professional">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-[#E0E0E0]">Messages Today</CardTitle>
              <div className="p-3 bg-[#00B4D8]/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-[#00B4D8]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#00B4D8] mb-2">{stats?.messagesProcessed || 0}</div>
              <p className="text-sm text-gray-400 mb-4">Successfully forwarded</p>
              <div className="progress-bar">
                <div className="progress-fill healthy" style={{ width: '60%' }}></div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-professional">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-[#E0E0E0]">System Status</CardTitle>
              <div className="p-3 bg-[#00B4D8]/20 rounded-lg">
                {getStatusIcon(health?.status || "healthy")}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#00B4D8] mb-2 capitalize">
                {health?.status || "Healthy"}
              </div>
              <p className="text-sm text-gray-400 mb-4">All systems operational</p>
              <div className={`status-indicator ${health?.status === 'healthy' ? 'status-healthy' : health?.status === 'warning' ? 'status-warning' : 'status-critical'}`}>
                {getStatusIcon(health?.status || "healthy")}
                Operational
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* System Health */}
          <Card className="card-professional">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl font-semibold text-[#00B4D8]">
                <div className="p-3 bg-[#00B4D8]/20 rounded-lg">
                  <Database className="h-6 w-6 text-[#00B4D8]" />
                </div>
                System Health
              </CardTitle>
              <CardDescription className="text-gray-400 text-base">
                Real-time resource monitoring
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[#E0E0E0] font-medium">CPU Usage</span>
                  <span className={`font-mono font-bold text-lg ${getHealthColor(health?.cpuUsage || 0)}`}>
                    {health?.cpuUsage || 0}%
                  </span>
                </div>
                <div className="progress-bar">
                  <div 
                    className={`progress-fill ${(health?.cpuUsage || 0) < 50 ? 'healthy' : (health?.cpuUsage || 0) < 80 ? 'warning' : 'critical'}`}
                    style={{ width: `${health?.cpuUsage || 0}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[#E0E0E0] font-medium">Memory Usage</span>
                  <span className={`font-mono font-bold text-lg ${getHealthColor(health?.memoryUsage || 0)}`}>
                    {health?.memoryUsage || 0}%
                  </span>
                </div>
                <div className="progress-bar">
                  <div 
                    className={`progress-fill ${(health?.memoryUsage || 0) < 50 ? 'healthy' : (health?.memoryUsage || 0) < 80 ? 'warning' : 'critical'}`}
                    style={{ width: `${health?.memoryUsage || 0}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[#E0E0E0] font-medium">Database Load</span>
                  <span className={`font-mono font-bold text-lg ${getHealthColor(health?.dbLoad || 0)}`}>
                    {health?.dbLoad || 0}%
                  </span>
                </div>
                <div className="progress-bar">
                  <div 
                    className={`progress-fill ${(health?.dbLoad || 0) < 50 ? 'healthy' : (health?.dbLoad || 0) < 80 ? 'warning' : 'critical'}`}
                    style={{ width: `${health?.dbLoad || 0}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="card-professional">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl font-semibold text-[#00B4D8]">
                <div className="p-3 bg-[#00B4D8]/20 rounded-lg">
                  <Clock className="h-6 w-6 text-[#00B4D8]" />
                </div>
                Activity Feed
              </CardTitle>
              <CardDescription className="text-gray-400 text-base">
                Latest system events and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activity && activity.length > 0 ? (
                <div className="space-y-3">
                  {activity.slice(0, 5).map((item, index) => (
                    <div 
                      key={item.id} 
                      className={`activity-item fade-in-up ${item.type === 'session_started' || item.type === 'message_forwarded' ? 'success' : item.type === 'error' ? 'error' : ''}`}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-[#00B4D8]/20 rounded-lg flex-shrink-0">
                          {getActivityIcon(item.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[#E0E0E0] font-medium">{item.description}</p>
                          <p className="text-sm text-gray-400 mt-1">
                            {new Date(item.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="p-6 bg-[#2a2a2a] rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                    <Activity className="h-10 w-10 text-gray-500" />
                  </div>
                  <h3 className="text-[#E0E0E0] font-semibold text-lg mb-2">No recent activity</h3>
                  <p className="text-gray-400">Activity will appear here as your system operates</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Session Controls Footer */}
        <div className="mt-12 flex flex-wrap gap-4 justify-center">
          <Button className="btn-primary">
            Add New Session
          </Button>
          <Button className="btn-secondary">
            Pause All Sessions
          </Button>
          <Button 
            variant="outline"
            className="bg-transparent border-2 border-red-500 text-red-400 hover:bg-red-500 hover:text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300"
          >
            Stop All Sessions
          </Button>
        </div>
      </div>
    </div>
  );
}