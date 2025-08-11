import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, Clock, RefreshCw, Shield, Database, Activity, Archive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SessionFailure {
  id: string;
  accountId: string;
  failureType: string;
  errorMessage: string;
  severity: "low" | "medium" | "high" | "critical";
  isResolved: boolean;
  resolvedAt?: Date;
  createdAt: Date;
  metadata?: Record<string, any>;
}

interface SessionHealthReport {
  accountId: string;
  healthScore: number;
  status: "healthy" | "warning" | "critical";
  uptime: number;
  lastFailure?: Date;
  totalFailures: number;
  resolvedFailures: number;
  activeIssues: number;
  recommendations: string[];
}

interface SessionBackup {
  id: string;
  accountId: string;
  backupData: Record<string, any>;
  backupType: "manual" | "automatic" | "pre_failure";
  size: number;
  createdAt: Date;
  isValid: boolean;
}

interface ReauthRequest {
  id: string;
  accountId: string;
  userId: string;
  reason: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  createdAt: Date;
  completedAt?: Date;
  attempts: number;
  maxAttempts: number;
}

export default function SessionResilience() {
  const [selectedAccountId, setSelectedAccountId] = useState("account-1");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for session failures
  const { data: failures = [], isLoading: failuresLoading } = useQuery({
    queryKey: ["/api/sessions", selectedAccountId, "failures"],
    enabled: !!selectedAccountId,
  });

  // Query for session health report
  const { data: healthReport, isLoading: healthLoading } = useQuery({
    queryKey: ["/api/sessions", selectedAccountId, "health"],
    enabled: !!selectedAccountId,
  });

  // Query for session backups
  const { data: backups = [], isLoading: backupsLoading } = useQuery({
    queryKey: ["/api/sessions", selectedAccountId, "backups"],
    enabled: !!selectedAccountId,
  });

  // Query for active reauth requests
  const { data: reauthRequests = [], isLoading: reauthLoading } = useQuery({
    queryKey: ["/api/auth/reauth/user", "user-1"],
  });

  // Mark failure as resolved mutation
  const resolveFailureMutation = useMutation({
    mutationFn: async (failureId: string) => {
      const response = await apiRequest("POST", `/api/sessions/failures/${failureId}/resolve`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions/failures", selectedAccountId] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions/health", selectedAccountId] });
      toast({
        title: "Success",
        description: "Failure marked as resolved",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resolve failure",
        variant: "destructive",
      });
    },
  });

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/sessions/${selectedAccountId}/backup`, {
        backupType: "manual",
        backupData: { timestamp: Date.now(), manual: true },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions/backups", selectedAccountId] });
      toast({
        title: "Success",
        description: "Backup created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create backup",
        variant: "destructive",
      });
    },
  });

  // Restore from backup mutation
  const restoreBackupMutation = useMutation({
    mutationFn: async (backupId: string) => {
      const response = await apiRequest("POST", `/api/sessions/${selectedAccountId}/restore/${backupId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions/health", selectedAccountId] });
      toast({
        title: "Success",
        description: "Session restored from backup",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to restore from backup",
        variant: "destructive",
      });
    },
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "low":
        return <Badge variant="outline" className="border-green-500 text-green-600">Low</Badge>;
      case "medium":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Medium</Badge>;
      case "high":
        return <Badge variant="outline" className="border-orange-500 text-orange-600">High</Badge>;
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      default:
        return <Badge variant="secondary">{severity}</Badge>;
    }
  };

  const getHealthStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Healthy</Badge>;
      case "warning":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><AlertCircle className="w-3 h-3 mr-1" />Warning</Badge>;
      case "critical":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Critical</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getReauthStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="border-blue-500 text-blue-600"><RefreshCw className="w-3 h-3 mr-1" />In Progress</Badge>;
      case "completed":
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case "failed":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (failuresLoading || healthLoading || backupsLoading || reauthLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Session Resilience</h1>
          <p className="text-gray-600 dark:text-gray-400">Monitor session health, manage failures, and handle recovery</p>
        </div>
        <div className="flex gap-4">
          <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="account-1">Account 1</SelectItem>
              <SelectItem value="account-2">Account 2</SelectItem>
              <SelectItem value="account-3">Account 3</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => createBackupMutation.mutate()} disabled={createBackupMutation.isPending}>
            <Database className="w-4 h-4 mr-2" />
            Create Backup
          </Button>
        </div>
      </div>

      {/* Health Overview */}
      {healthReport && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Health Score</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(healthReport as any)?.healthScore || 0}%</div>
              <Progress value={(healthReport as any)?.healthScore || 0} className="mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="mt-2">{getHealthStatusBadge((healthReport as any)?.status || "unknown")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uptime</CardTitle>
              <Clock className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{((healthReport as any)?.uptime || 0).toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Issues</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{(healthReport as any)?.activeIssues || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="failures" className="space-y-4">
        <TabsList>
          <TabsTrigger value="failures">Session Failures</TabsTrigger>
          <TabsTrigger value="backups">Backups & Recovery</TabsTrigger>
          <TabsTrigger value="reauth">Re-Authentication</TabsTrigger>
          <TabsTrigger value="health">Health Report</TabsTrigger>
        </TabsList>

        <TabsContent value="failures" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Session Failures</CardTitle>
              <CardDescription>
                Monitor and resolve session failures for improved reliability
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Failure Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Error Message</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(failures as any[]).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No session failures found. Your sessions are running smoothly!
                      </TableCell>
                    </TableRow>
                  ) : (
                    (failures as any[]).map((failure: SessionFailure) => (
                      <TableRow key={failure.id}>
                        <TableCell className="font-medium">{failure.failureType}</TableCell>
                        <TableCell>{getSeverityBadge(failure.severity)}</TableCell>
                        <TableCell className="max-w-md truncate">{failure.errorMessage}</TableCell>
                        <TableCell>{new Date(failure.createdAt).toLocaleString()}</TableCell>
                        <TableCell>
                          {failure.isResolved ? (
                            <Badge variant="default" className="bg-green-500">Resolved</Badge>
                          ) : (
                            <Badge variant="destructive">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!failure.isResolved && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resolveFailureMutation.mutate(failure.id)}
                              disabled={resolveFailureMutation.isPending}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Resolve
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backups" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Session Backups</CardTitle>
              <CardDescription>
                Manage session backups and restore points for quick recovery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Backup Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(backups as any[]).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No backups found. Create your first backup to ensure data safety.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (backups as any[]).map((backup: SessionBackup) => (
                      <TableRow key={backup.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Archive className="w-4 h-4" />
                            {backup.backupType}
                          </div>
                        </TableCell>
                        <TableCell>{formatBytes(backup.size)}</TableCell>
                        <TableCell>{new Date(backup.createdAt).toLocaleString()}</TableCell>
                        <TableCell>
                          {backup.isValid ? (
                            <Badge variant="default" className="bg-green-500">Valid</Badge>
                          ) : (
                            <Badge variant="destructive">Invalid</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => restoreBackupMutation.mutate(backup.id)}
                            disabled={!backup.isValid || restoreBackupMutation.isPending}
                          >
                            <RefreshCw className="w-4 h-4 mr-1" />
                            Restore
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reauth" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Re-Authentication Requests</CardTitle>
              <CardDescription>
                Monitor and manage re-authentication workflows for expired sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account ID</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(reauthRequests as any[]).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No re-authentication requests found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (reauthRequests as any[]).map((request: ReauthRequest) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.accountId}</TableCell>
                        <TableCell>{request.reason}</TableCell>
                        <TableCell>{getReauthStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {request.attempts}/{request.maxAttempts}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(request.createdAt).toLocaleString()}</TableCell>
                        <TableCell>
                          {request.completedAt ? new Date(request.completedAt).toLocaleString() : "Pending"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          {healthReport && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Health Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Health Score</span>
                    <span className="font-bold">{(healthReport as any)?.healthScore || 0}%</span>
                  </div>
                  <Progress value={(healthReport as any)?.healthScore || 0} />
                  <div className="flex justify-between items-center">
                    <span>Uptime</span>
                    <span className="font-bold">{((healthReport as any)?.uptime || 0).toFixed(2)}%</span>
                  </div>
                  <Progress value={(healthReport as any)?.uptime || 0} />
                  <div className="flex justify-between items-center">
                    <span>Total Failures</span>
                    <span className="font-bold">{(healthReport as any)?.totalFailures || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Resolved Failures</span>
                    <span className="font-bold text-green-600">{(healthReport as any)?.resolvedFailures || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Active Issues</span>
                    <span className="font-bold text-red-600">{(healthReport as any)?.activeIssues || 0}</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  {((healthReport as any)?.recommendations || []).length === 0 ? (
                    <p className="text-gray-500">No recommendations at this time. Your session is performing well!</p>
                  ) : (
                    <ul className="space-y-2">
                      {((healthReport as any)?.recommendations || []).map((recommendation: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                          <span className="text-sm">{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}