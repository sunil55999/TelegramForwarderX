import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Activity, Users, Zap, Database, TrendingUp, Clock, Settings, MessageSquare, Router, FileText } from "lucide-react";
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
                  <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
                  <div className="h-8 bg-gray-700 rounded w-1/2"></div>
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
        return <Zap className="h-4 w-4 text-green-400" />;
      case "message_forwarded":
        return <Activity className="h-4 w-4 text-cyan-400" />;
      case "user_registered":
        return <Users className="h-4 w-4 text-purple-400" />;
      case "error":
        return <Activity className="h-4 w-4 text-red-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getHealthColor = (value: number) => {
    if (value < 50) return "text-green-400";
    if (value < 80) return "text-yellow-400";
    return "text-red-400";
  };

  const getHealthBarColor = (value: number) => {
    if (value < 50) return "from-green-500/20 to-green-400";
    if (value < 80) return "from-yellow-500/20 to-yellow-400";
    return "from-red-500/20 to-red-400";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full mb-6 shadow-lg shadow-purple-500/25">
            <Zap className="h-10 w-10 text-white animate-pulse" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">
            Welcome back, {user?.username || 'Ninja'}! ⚡
          </h1>
          <p className="text-gray-400 text-lg">Your AutoForwardX command center is ready</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link href="/sources">
            <Button 
              variant="outline" 
              className="w-full bg-gray-800/50 border-purple-500/30 hover:border-purple-400 hover:bg-purple-500/10 text-purple-300 hover:text-purple-200 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Sources
            </Button>
          </Link>
          <Link href="/destinations">
            <Button 
              variant="outline" 
              className="w-full bg-gray-800/50 border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-500/10 text-cyan-300 hover:text-cyan-200 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25"
            >
              <Router className="h-4 w-4 mr-2" />
              Destinations
            </Button>
          </Link>
          <Link href="/forwarding">
            <Button 
              variant="outline" 
              className="w-full bg-gray-800/50 border-green-500/30 hover:border-green-400 hover:bg-green-500/10 text-green-300 hover:text-green-200 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/25"
            >
              <Zap className="h-4 w-4 mr-2" />
              Rules
            </Button>
          </Link>
          <Link href="/logs">
            <Button 
              variant="outline" 
              className="w-full bg-gray-800/50 border-orange-500/30 hover:border-orange-400 hover:bg-orange-500/10 text-orange-300 hover:text-orange-200 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/25"
            >
              <FileText className="h-4 w-4 mr-2" />
              Logs
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gray-800/50 backdrop-blur-sm border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/25 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-purple-300">Active Sessions</CardTitle>
              <div className="p-2 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition-all duration-300">
                <Activity className="h-4 w-4 text-purple-400 group-hover:scale-110 transition-transform duration-300" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-1">{stats?.activeSessions || 0}</div>
              <p className="text-xs text-purple-300/80">Telegram connections</p>
              <div className="mt-3 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full w-3/4 shadow-lg shadow-purple-500/50"></div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 backdrop-blur-sm border-cyan-500/20 hover:border-cyan-400/40 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/25 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-cyan-300">Active Workers</CardTitle>
              <div className="p-2 bg-cyan-500/20 rounded-lg group-hover:bg-cyan-500/30 transition-all duration-300">
                <Zap className="h-4 w-4 text-cyan-400 group-hover:scale-110 transition-transform duration-300 animate-pulse" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-1">{stats?.activeWorkers || 0}</div>
              <p className="text-xs text-cyan-300/80">Processing messages</p>
              <div className="mt-3 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full w-4/5 shadow-lg shadow-cyan-500/50"></div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 backdrop-blur-sm border-green-500/20 hover:border-green-400/40 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/25 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-green-300">Messages Today</CardTitle>
              <div className="p-2 bg-green-500/20 rounded-lg group-hover:bg-green-500/30 transition-all duration-300">
                <TrendingUp className="h-4 w-4 text-green-400 group-hover:scale-110 transition-transform duration-300" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-1">{stats?.messagesProcessed || 0}</div>
              <p className="text-xs text-green-300/80">Successfully forwarded</p>
              <div className="mt-3 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full w-2/3 shadow-lg shadow-green-500/50"></div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 backdrop-blur-sm border-orange-500/20 hover:border-orange-400/40 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/25 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-orange-300">System Status</CardTitle>
              <div className="p-2 bg-orange-500/20 rounded-lg group-hover:bg-orange-500/30 transition-all duration-300">
                <Database className="h-4 w-4 text-orange-400 group-hover:scale-110 transition-transform duration-300" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white mb-1 capitalize">
                {health?.status || "Unknown"}
              </div>
              <p className="text-xs text-orange-300/80">All systems operational</p>
              <Badge 
                variant="outline" 
                className="mt-2 border-orange-500/50 text-orange-300 bg-orange-500/10"
              >
                ✨ Ninja Mode Active
              </Badge>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* System Health */}
          <Card className="bg-gray-800/50 backdrop-blur-sm border-purple-500/20 hover:border-purple-400/40 transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl text-white">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Database className="h-5 w-5 text-purple-400" />
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
                  <span className="text-gray-300">CPU Usage</span>
                  <span className={`font-mono font-bold ${getHealthColor(health?.cpuUsage || 0)}`}>
                    {health?.cpuUsage || 0}%
                  </span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${getHealthBarColor(health?.cpuUsage || 0)} rounded-full transition-all duration-500 shadow-lg`}
                    style={{ width: `${health?.cpuUsage || 0}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Memory Usage</span>
                  <span className={`font-mono font-bold ${getHealthColor(health?.memoryUsage || 0)}`}>
                    {health?.memoryUsage || 0}%
                  </span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${getHealthBarColor(health?.memoryUsage || 0)} rounded-full transition-all duration-500 shadow-lg`}
                    style={{ width: `${health?.memoryUsage || 0}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Database Load</span>
                  <span className={`font-mono font-bold ${getHealthColor(health?.dbLoad || 0)}`}>
                    {health?.dbLoad || 0}%
                  </span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${getHealthBarColor(health?.dbLoad || 0)} rounded-full transition-all duration-500 shadow-lg`}
                    style={{ width: `${health?.dbLoad || 0}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="bg-gray-800/50 backdrop-blur-sm border-cyan-500/20 hover:border-cyan-400/40 transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl text-white">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <Clock className="h-5 w-5 text-cyan-400" />
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
                  {activity.slice(0, 5).map((item, index) => (
                    <div 
                      key={item.id} 
                      className="flex items-start gap-4 p-3 bg-gray-700/30 rounded-lg border border-gray-600/30 hover:border-cyan-500/50 transition-all duration-300 animate-fade-in"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="p-2 bg-gray-600/50 rounded-lg">
                        {getActivityIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-300 text-sm">{item.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(item.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="p-4 bg-gray-700/30 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Activity className="h-8 w-8 text-gray-500" />
                  </div>
                  <p className="text-gray-400">No recent activity</p>
                  <p className="text-xs text-gray-500 mt-1">Your ninja operations will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}