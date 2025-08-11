import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Server, Activity, AlertTriangle, Crown, Zap, Gauge, Pause, Play, Ban } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserWithPlan {
  id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  plan?: {
    id: string;
    planType: string;
    planStatus: string;
    maxSessions: number;
    maxForwardingPairs: number;
    currentSessions: number;
    currentPairs: number;
    priority: number;
  };
}

interface WorkerMetrics {
  id: string;
  workerId: string;
  tasksCompleted: number;
  tasksInQueue: number;
  averageTaskTime: number;
  currentRamUsage: number;
  peakRamUsage: number;
  cpuLoad: number;
  sessionCapacity: number;
  currentSessions: number;
  isHealthy: boolean;
  needsScaling: boolean;
  timestamp: string;
}

interface QueueMetrics {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  delayed: number;
  averageWaitTime: number;
  priorityBreakdown: {
    high: number;
    medium: number;
    low: number;
  };
}

export default function AdminDashboard() {
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [newPlan, setNewPlan] = useState<string>("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all users with their plans
  const { data: users = [], isLoading: usersLoading } = useQuery<UserWithPlan[]>({
    queryKey: ['/api/admin/users'],
  });

  // Fetch worker metrics
  const { data: workerMetrics = [], isLoading: workersLoading } = useQuery<WorkerMetrics[]>({
    queryKey: ['/api/worker-metrics'],
  });

  // Fetch queue metrics
  const { data: queueMetrics, isLoading: queueLoading } = useQuery<QueueMetrics>({
    queryKey: ['/api/task-queue/metrics'],
  });

  // Fetch scaling needs
  const { data: scalingNeeds = [] } = useQuery<WorkerMetrics[]>({
    queryKey: ['/api/worker-metrics/scaling-needs'],
  });

  // Change user plan mutation
  const changeUserPlanMutation = useMutation({
    mutationFn: async ({ userId, newPlan }: { userId: string; newPlan: string }) => {
      const response = await fetch(`/api/admin/users/${userId}/change-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPlan }),
      });
      if (!response.ok) throw new Error('Failed to change plan');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "Success", description: "User plan changed successfully" });
      setSelectedUser("");
      setNewPlan("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to change user plan", variant: "destructive" });
    },
  });

  // Force stop user sessions mutation
  const forceStopSessionsMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/users/${userId}/force-stop-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to force stop sessions');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "Success", description: "User sessions force stopped" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to force stop sessions", variant: "destructive" });
    },
  });

  const getPlanBadgeColor = (planType: string) => {
    switch (planType) {
      case 'elite': return 'bg-purple-100 text-purple-800';
      case 'pro': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'elite': return <Crown className="w-3 h-3" />;
      case 'pro': return <Zap className="w-3 h-3" />;
      default: return <Users className="w-3 h-3" />;
    }
  };

  const formatBytes = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  const formatDuration = (ms: number) => {
    return (ms / 1000).toFixed(2) + 's';
  };

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="admin-dashboard-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users, workers, and system resources</p>
        </div>
        <Badge variant="outline" className="text-purple-600 border-purple-200">
          <Crown className="w-4 h-4 mr-1" />
          Admin Access
        </Badge>
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-users">
              {users.length}
            </div>
            <div className="text-xs text-muted-foreground">
              {users.filter(u => u.isActive).length} active
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Workers</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-workers">
              {workerMetrics.filter(w => w.isHealthy).length}
            </div>
            <div className="text-xs text-muted-foreground">
              {scalingNeeds.length} need scaling
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Queue Tasks</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-queue-tasks">
              {queueMetrics?.total || 0}
            </div>
            <div className="text-xs text-muted-foreground">
              {queueMetrics?.pending || 0} pending
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-system-health">
              GOOD
            </div>
            <div className="text-xs text-muted-foreground">
              All systems operational
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="workers">Worker Metrics</TabsTrigger>
          <TabsTrigger value="queue">Task Queue</TabsTrigger>
          <TabsTrigger value="resources">Resource Monitor</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <div className="flex gap-4">
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger className="w-[200px]" data-testid="select-user">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={newPlan} onValueChange={setNewPlan}>
                  <SelectTrigger className="w-[150px]" data-testid="select-plan">
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="elite">Elite</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => selectedUser && newPlan && changeUserPlanMutation.mutate({ userId: selectedUser, newPlan })}
                  disabled={!selectedUser || !newPlan || changeUserPlanMutation.isPending}
                  data-testid="button-change-plan"
                >
                  Change Plan
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => selectedUser && forceStopSessionsMutation.mutate(selectedUser)}
                  disabled={!selectedUser || forceStopSessionsMutation.isPending}
                  data-testid="button-force-stop"
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Force Stop
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`user-card-${user.id}`}>
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-semibold">{user.username}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                      <Badge className={getPlanBadgeColor(user.plan?.planType || 'free')}>
                        {getPlanIcon(user.plan?.planType || 'free')}
                        <span className="ml-1">{user.plan?.planType || 'free'}</span>
                      </Badge>
                      {!user.isActive && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div>Sessions: {user.plan?.currentSessions || 0}/{user.plan?.maxSessions || 1}</div>
                      <div>Pairs: {user.plan?.currentPairs || 0}/{user.plan?.maxForwardingPairs || 5}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Worker Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workerMetrics.map((worker) => (
                  <div key={worker.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`worker-card-${worker.workerId}`}>
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-semibold">{worker.workerId}</div>
                        <div className="text-sm text-muted-foreground">
                          Sessions: {worker.currentSessions}/{worker.sessionCapacity}
                        </div>
                      </div>
                      <Badge className={worker.isHealthy ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {worker.isHealthy ? 'Healthy' : 'Unhealthy'}
                      </Badge>
                      {worker.needsScaling && (
                        <Badge className="bg-orange-100 text-orange-800">Needs Scaling</Badge>
                      )}
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div>RAM: {formatBytes(worker.currentRamUsage)}</div>
                      <div>CPU: {worker.cpuLoad}%</div>
                      <div>Tasks: {worker.tasksCompleted}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Task Queue Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              {queueMetrics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{queueMetrics.pending}</div>
                    <div className="text-sm text-blue-600">Pending</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{queueMetrics.processing}</div>
                    <div className="text-sm text-yellow-600">Processing</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{queueMetrics.completed}</div>
                    <div className="text-sm text-green-600">Completed</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{queueMetrics.failed}</div>
                    <div className="text-sm text-red-600">Failed</div>
                  </div>
                </div>
              )}
              
              {queueMetrics && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-2">Priority Breakdown</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-purple-50 rounded">
                      <div className="font-bold text-purple-600">{queueMetrics.priorityBreakdown.high}</div>
                      <div className="text-sm text-purple-600">High Priority</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded">
                      <div className="font-bold text-blue-600">{queueMetrics.priorityBreakdown.medium}</div>
                      <div className="text-sm text-blue-600">Medium Priority</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <div className="font-bold text-gray-600">{queueMetrics.priorityBreakdown.low}</div>
                      <div className="text-sm text-gray-600">Low Priority</div>
                    </div>
                  </div>
                  <div className="mt-4 text-center text-sm text-muted-foreground">
                    Average Wait Time: {formatDuration(queueMetrics.averageWaitTime)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resource Monitoring</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Worker Resources</h4>
                  <div className="space-y-3">
                    {workerMetrics.slice(0, 5).map((worker) => (
                      <div key={worker.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <span className="text-sm font-medium">{worker.workerId}</span>
                        <div className="flex gap-2">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {formatBytes(worker.currentRamUsage)} RAM
                          </span>
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            {worker.cpuLoad}% CPU
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Scaling Status</h4>
                  {scalingNeeds.length > 0 ? (
                    <div className="space-y-2">
                      {scalingNeeds.map((worker) => (
                        <div key={worker.id} className="p-3 bg-orange-50 border-l-4 border-orange-500 rounded">
                          <div className="font-medium text-orange-800">{worker.workerId}</div>
                          <div className="text-sm text-orange-600">
                            {worker.needsScaling ? 'Needs Scaling' : 'High Load'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-green-50 text-green-800 rounded text-center">
                      All workers operating within capacity
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}