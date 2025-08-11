import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Crown, Zap, Users, Activity, TrendingUp, Gauge, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionPlan {
  id: string;
  userId: string;
  planType: string;
  planStatus: string;
  maxSessions: number;
  maxForwardingPairs: number;
  currentSessions: number;
  currentPairs: number;
  priority: number;
  startDate: string;
  expiryDate?: string | null;
  createdAt: string;
  updatedAt: string;
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

interface UserActivityLog {
  id: string;
  userId: string;
  activityType: string;
  endpoint: string | null;
  requestCount: number;
  windowStart: string;
  windowEnd: string;
  hourlyLimit: number;
  dailyLimit: number;
  createdAt: string;
}

export default function SubscriptionDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedUserId] = useState("user-1"); // In real app, this would come from auth context

  // Fetch current user's subscription plan
  const { data: currentPlan, isLoading: planLoading } = useQuery<SubscriptionPlan>({
    queryKey: ['/api/subscription-plans', selectedUserId],
    enabled: !!selectedUserId,
  });

  // Fetch queue metrics
  const { data: queueMetrics, isLoading: queueLoading } = useQuery<QueueMetrics>({
    queryKey: ['/api/task-queue/metrics'],
  });

  // Fetch user activity stats
  const { data: activityStats = [], isLoading: activityLoading } = useQuery<UserActivityLog[]>({
    queryKey: ['/api/user-activity', selectedUserId, 'stats'],
    enabled: !!selectedUserId,
  });

  // Create subscription plan mutation (for new users)
  const createPlanMutation = useMutation({
    mutationFn: async (planType: string) => {
      const response = await fetch('/api/subscription-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          planType,
          planStatus: 'active',
          maxSessions: planType === 'elite' ? 5 : planType === 'pro' ? 3 : 1,
          maxForwardingPairs: planType === 'free' ? 5 : 999999,
          priority: planType === 'elite' ? 3 : planType === 'pro' ? 2 : 1,
          startDate: new Date(),
          expiryDate: null,
          currentSessions: 0,
          currentPairs: 0,
        }),
      });
      if (!response.ok) throw new Error('Failed to create plan');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription-plans', selectedUserId] });
      toast({ title: "Success", description: "Subscription plan created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create subscription plan", variant: "destructive" });
    },
  });

  // Check rate limit mutation
  const checkRateLimitMutation = useMutation({
    mutationFn: async (activityType: string) => {
      const response = await fetch(`/api/user-activity/${selectedUserId}/check-rate-limit?activityType=${activityType}`);
      if (!response.ok) throw new Error('Failed to check rate limit');
      return response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Rate Limit Check", 
        description: data.withinLimit ? "Within rate limits" : "Rate limit exceeded",
        variant: data.withinLimit ? "default" : "destructive"
      });
    },
  });

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'elite': return <Crown className="w-5 h-5 text-purple-600" />;
      case 'pro': return <Zap className="w-5 h-5 text-blue-600" />;
      default: return <Users className="w-5 h-5 text-gray-600" />;
    }
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'elite': return 'bg-gradient-to-r from-purple-600 to-purple-700';
      case 'pro': return 'bg-gradient-to-r from-blue-600 to-blue-700';
      default: return 'bg-gradient-to-r from-gray-600 to-gray-700';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getUsagePercentage = (current: number, max: number) => {
    return Math.min((current / max) * 100, 100);
  };

  if (planLoading || queueLoading || activityLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="subscription-dashboard-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">My Subscription</h1>
          <p className="text-muted-foreground">Manage your plan, monitor usage, and track activity</p>
        </div>
        {!currentPlan && (
          <div className="flex gap-2">
            <Button onClick={() => createPlanMutation.mutate('free')} variant="outline" data-testid="button-create-free">
              Start Free
            </Button>
            <Button onClick={() => createPlanMutation.mutate('pro')} data-testid="button-create-pro">
              Upgrade to Pro
            </Button>
          </div>
        )}
      </div>

      {currentPlan ? (
        <>
          {/* Current Plan Card */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <div className={`${getPlanColor(currentPlan.planType)} text-white p-6`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getPlanIcon(currentPlan.planType)}
                  <div>
                    <h2 className="text-2xl font-bold capitalize">{currentPlan.planType} Plan</h2>
                    <p className="text-white/80">Active since {formatDate(currentPlan.startDate)}</p>
                  </div>
                </div>
                <Badge 
                  variant="secondary" 
                  className="bg-white/20 text-white border-white/30"
                  data-testid={`badge-plan-${currentPlan.planType}`}
                >
                  Priority {currentPlan.priority}
                </Badge>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Telegram Sessions</span>
                      <span className="text-sm text-muted-foreground">
                        {currentPlan.currentSessions}/{currentPlan.maxSessions}
                      </span>
                    </div>
                    <Progress 
                      value={getUsagePercentage(currentPlan.currentSessions, currentPlan.maxSessions)} 
                      className="h-2"
                      data-testid="progress-sessions"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Forwarding Pairs</span>
                      <span className="text-sm text-muted-foreground">
                        {currentPlan.currentPairs}/{currentPlan.maxForwardingPairs === 999999 ? '∞' : currentPlan.maxForwardingPairs}
                      </span>
                    </div>
                    <Progress 
                      value={currentPlan.maxForwardingPairs === 999999 ? 5 : getUsagePercentage(currentPlan.currentPairs, currentPlan.maxForwardingPairs)} 
                      className="h-2"
                      data-testid="progress-pairs"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">High-speed message processing</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Advanced filtering & regex rules</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">24/7 monitoring & alerts</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Queue Priority</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-queue-priority">
                  #{currentPlan.priority}
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentPlan.planType === 'elite' ? 'Highest priority' : 
                   currentPlan.planType === 'pro' ? 'High priority' : 'Standard priority'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Queue Status</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" data-testid="text-queue-status">
                  {queueMetrics?.pending || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Tasks in queue
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Rate Limits</CardTitle>
                <Gauge className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600" data-testid="text-rate-limits">
                  {currentPlan.planType === 'elite' ? '500/h' : 
                   currentPlan.planType === 'pro' ? '300/h' : '100/h'}
                </div>
                <p className="text-xs text-muted-foreground">
                  API requests/hour
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analytics */}
          <Tabs defaultValue="usage" className="space-y-4">
            <TabsList>
              <TabsTrigger value="usage">Usage Details</TabsTrigger>
              <TabsTrigger value="activity">Activity Log</TabsTrigger>
              <TabsTrigger value="queue">Queue Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="usage">
              <Card>
                <CardHeader>
                  <CardTitle>Resource Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-3">Session Allocation</h4>
                      <div className="space-y-3">
                        {Array.from({ length: currentPlan.maxSessions }, (_, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className={`w-3 h-3 rounded-full ${i < currentPlan.currentSessions ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <span className="text-sm">
                              Session {i + 1} {i < currentPlan.currentSessions ? '(Active)' : '(Available)'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Plan Benefits</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <div className="font-medium text-blue-900">Max Sessions</div>
                          <div className="text-2xl font-bold text-blue-600">{currentPlan.maxSessions}</div>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-lg">
                          <div className="font-medium text-purple-900">Forwarding Pairs</div>
                          <div className="text-2xl font-bold text-purple-600">
                            {currentPlan.maxForwardingPairs === 999999 ? '∞' : currentPlan.maxForwardingPairs}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => checkRateLimitMutation.mutate('api_request')}
                      disabled={checkRateLimitMutation.isPending}
                      data-testid="button-check-rate-limit"
                    >
                      Check Rate Limit
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {activityStats.length > 0 ? (
                    <div className="space-y-3">
                      {activityStats.slice(0, 10).map((activity) => (
                        <div key={activity.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium">{activity.activityType.replace('_', ' ').toUpperCase()}</div>
                            <div className="text-sm text-muted-foreground">
                              {activity.endpoint || 'System activity'}
                            </div>
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            <div>{activity.requestCount} requests</div>
                            <div>{formatDate(activity.createdAt)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No recent activity recorded
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="queue">
              <Card>
                <CardHeader>
                  <CardTitle>Queue Performance</CardTitle>
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

                  <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 text-purple-700 mb-2">
                      <Crown className="w-4 h-4" />
                      <span className="font-semibold">Priority Queue Benefits</span>
                    </div>
                    <p className="text-sm text-purple-600">
                      {currentPlan.planType === 'elite' 
                        ? 'Your tasks receive highest priority processing with near-instant execution.'
                        : currentPlan.planType === 'pro'
                        ? 'Your tasks receive high priority processing with reduced wait times.'
                        : 'Your tasks are processed in standard queue order.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Subscription Plan</h3>
            <p className="text-muted-foreground mb-6">
              Get started with a subscription plan to access AutoForwardX features
            </p>
            <div className="flex justify-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => createPlanMutation.mutate('free')}
                disabled={createPlanMutation.isPending}
              >
                Start Free Plan
              </Button>
              <Button 
                onClick={() => createPlanMutation.mutate('pro')}
                disabled={createPlanMutation.isPending}
              >
                Get Pro Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}