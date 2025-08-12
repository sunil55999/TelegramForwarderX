import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Users, 
  Server, 
  Activity, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Plus,
  Edit,
  Trash2,
  Settings,
  Link as LinkIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  DashboardStats, 
  SystemHealth, 
  ActivityItem,
  Source,
  Destination,
  ForwardingMapping,
  insertSourceSchema,
  insertDestinationSchema,
  insertForwardingMappingSchema
} from "@shared/schema";

export default function AdminOverview() {
  const [selectedSource, setSelectedSource] = useState("");
  const [selectedDestination, setSelectedDestination] = useState("");
  const [pairType, setPairType] = useState("");
  const [priority, setPriority] = useState("1");
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [isAddSourceOpen, setIsAddSourceOpen] = useState(false);
  const [isAddDestinationOpen, setIsAddDestinationOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Existing queries
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: health, isLoading: healthLoading } = useQuery<SystemHealth>({
    queryKey: ["/api/dashboard/health"],
  });

  const { data: activity, isLoading: activityLoading } = useQuery<ActivityItem[]>({
    queryKey: ["/api/dashboard/activity"],
  });

  // New queries for Quick Pair Setup
  const { data: sources, isLoading: sourcesLoading } = useQuery<Source[]>({
    queryKey: ["/api/sources"],
  });

  const { data: destinations, isLoading: destinationsLoading } = useQuery<Destination[]>({
    queryKey: ["/api/destinations"],
  });

  const { data: mappings, isLoading: mappingsLoading } = useQuery<ForwardingMapping[]>({
    queryKey: ["/api/forwarding/mappings"],
  });

  // Mutations for creating pairs
  const createMappingMutation = useMutation({
    mutationFn: async (mappingData: any) => {
      return apiRequest(`/api/forwarding/mappings`, 'POST', mappingData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forwarding/mappings"] });
      toast({
        title: "Success",
        description: "Forwarding pair created successfully!",
      });
      // Reset form
      setSelectedSource("");
      setSelectedDestination("");
      setPairType("");
      setPriority("1");
      setShowAdvancedSettings(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create forwarding pair",
        variant: "destructive",
      });
    },
  });

  const deleteMappingMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/forwarding/mappings/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forwarding/mappings"] });
      toast({
        title: "Success",
        description: "Forwarding pair deleted successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete forwarding pair",
        variant: "destructive",
      });
    },
  });

  const handleCreatePair = () => {
    if (!selectedSource || !selectedDestination || !pairType) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const mappingData = {
      userId: "admin-user", // This should come from auth context
      sourceId: selectedSource,
      destinationId: selectedDestination,
      priority: parseInt(priority),
      isActive: true,
    };

    createMappingMutation.mutate(mappingData);
  };

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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome back, admin!</h1>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Quick Pair Setup Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <LinkIcon className="h-5 w-5 text-blue-500" />
            <span>Quick Pair Setup</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Source Selection */}
            <div className="space-y-2">
              <Label htmlFor="source-select">Source Channel</Label>
              <div className="flex space-x-2">
                <Select value={selectedSource} onValueChange={setSelectedSource}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sourcesLoading ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : sources?.length ? (
                      sources.map((source) => (
                        <SelectItem key={source.id} value={source.id}>
                          {source.chatTitle}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-sources" disabled>No sources available</SelectItem>
                    )}
                    <SelectItem value="add-new">+ Add New Source</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Destination Selection */}
            <div className="space-y-2">
              <Label htmlFor="destination-select">Destination Channel</Label>
              <div className="flex space-x-2">
                <Select value={selectedDestination} onValueChange={setSelectedDestination}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination..." />
                  </SelectTrigger>
                  <SelectContent>
                    {destinationsLoading ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : destinations?.length ? (
                      destinations.map((destination) => (
                        <SelectItem key={destination.id} value={destination.id}>
                          {destination.chatTitle}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-destinations" disabled>No destinations available</SelectItem>
                    )}
                    <SelectItem value="add-new">+ Add New Destination</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pair Type */}
            <div className="space-y-2">
              <Label htmlFor="pair-type">Pair Type</Label>
              <Select value={pairType} onValueChange={setPairType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="channel-to-channel">Channel → Channel</SelectItem>
                  <SelectItem value="channel-to-group">Channel → Group</SelectItem>
                  <SelectItem value="group-to-channel">Group → Channel</SelectItem>
                  <SelectItem value="group-to-group">Group → Group</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority (1-10)</Label>
              <Input
                id="priority"
                type="number"
                min="1"
                max="10"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Advanced Settings Toggle */}
          <div className="flex items-center space-x-2 mb-4">
            <Switch
              id="advanced-settings"
              checked={showAdvancedSettings}
              onCheckedChange={setShowAdvancedSettings}
            />
            <Label htmlFor="advanced-settings">Advanced Settings</Label>
          </div>

          {/* Advanced Settings Panel */}
          {showAdvancedSettings && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg mb-4">
              <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100">
                Filtering & Editing Options
              </h4>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Advanced filtering and message editing options will be available after the pair is created.
                You can configure these settings in the detailed forwarding management section.
              </div>
            </div>
          )}

          {/* Create Button */}
          <Button 
            onClick={handleCreatePair} 
            disabled={createMappingMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {createMappingMutation.isPending ? "Creating..." : "Create Pair"}
          </Button>
        </CardContent>
      </Card>

      {/* Pairs Overview Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Existing Pairs Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappingsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">Loading pairs...</TableCell>
                  </TableRow>
                ) : mappings?.length ? (
                  mappings.slice(0, 10).map((mapping) => {
                    const source = sources?.find(s => s.id === mapping.sourceId);
                    const destination = destinations?.find(d => d.id === mapping.destinationId);
                    
                    return (
                      <TableRow key={mapping.id}>
                        <TableCell className="font-medium">
                          {source?.chatTitle || 'Unknown Source'}
                        </TableCell>
                        <TableCell>
                          {destination?.chatTitle || 'Unknown Destination'}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {source?.chatType || 'Unknown'} → {destination?.chatType || 'Unknown'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={mapping.isActive ? "default" : "secondary"}>
                            {mapping.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>{mapping.priority}</TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button size="sm" variant="outline">
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => deleteMappingMutation.mutate(mapping.id)}
                              disabled={deleteMappingMutation.isPending}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500">
                      No forwarding pairs configured yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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