import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface WorkerCardProps {
  worker: {
    id: string;
    name: string;
    status: string;
    cpuUsage: number;
    memoryUsage: number;
    activeSessions: number;
    messagesPerHour: number;
    lastHeartbeat?: string;
  };
}

export default function WorkerCard({ worker }: WorkerCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const restartWorkerMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/workers/${worker.id}/restart`, null);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workers"] });
      toast({
        title: "Worker restarted",
        description: `${worker.name} has been restarted successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to restart worker",
        variant: "destructive",
      });
    },
  });

  const stopWorkerMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/workers/${worker.id}/stop`, null);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workers"] });
      toast({
        title: "Worker stopped",
        description: `${worker.name} has been stopped successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to stop worker",
        variant: "destructive",
      });
    },
  });

  const startWorkerMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PUT", `/api/workers/${worker.id}`, { status: "online" });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workers"] });
      toast({
        title: "Worker started",
        description: `${worker.name} has been started successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start worker",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      online: { label: "Online", className: "bg-green-100 text-green-800" },
      offline: { label: "Offline", className: "bg-red-100 text-red-800" },
      crashed: { label: "Crashed", className: "bg-orange-100 text-orange-800" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.offline;
    return (
      <Badge className={config.className} data-testid={`badge-worker-status-${status}`}>
        {config.label}
      </Badge>
    );
  };

  const getProgressColor = (value: number, type: "cpu" | "memory") => {
    if (type === "memory" && value > 70) return "bg-red-500";
    if (value > 80) return "bg-red-500";
    if (value > 60) return "bg-yellow-500";
    return "bg-[#1976D2]";
  };

  const isWorkerOnline = worker.status === "online";

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-medium text-gray-900" data-testid={`text-worker-name-${worker.id}`}>
          {worker.name}
        </CardTitle>
        {getStatusBadge(worker.status)}
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">CPU Usage</span>
            <span className="font-medium" data-testid={`text-cpu-usage-${worker.id}`}>
              {worker.cpuUsage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={cn("h-2 rounded-full transition-all duration-300", getProgressColor(worker.cpuUsage, "cpu"))}
              style={{ width: `${Math.min(worker.cpuUsage, 100)}%` }}
              data-testid={`progress-cpu-${worker.id}`}
            />
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Memory Usage</span>
            <span className="font-medium" data-testid={`text-memory-usage-${worker.id}`}>
              {worker.memoryUsage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={cn("h-2 rounded-full transition-all duration-300", getProgressColor(worker.memoryUsage, "memory"))}
              style={{ width: `${Math.min(worker.memoryUsage, 100)}%` }}
              data-testid={`progress-memory-${worker.id}`}
            />
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Active Sessions</span>
            <span className="font-medium" data-testid={`text-active-sessions-${worker.id}`}>
              {worker.activeSessions}
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Messages/Hour</span>
            <span className="font-medium" data-testid={`text-messages-hour-${worker.id}`}>
              {worker.messagesPerHour.toLocaleString()}
            </span>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t flex space-x-2">
          {isWorkerOnline ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => restartWorkerMutation.mutate()}
                disabled={restartWorkerMutation.isPending}
                className="flex-1"
                data-testid={`button-restart-${worker.id}`}
              >
                {restartWorkerMutation.isPending ? (
                  <i className="fas fa-spinner fa-spin mr-1"></i>
                ) : (
                  <i className="fas fa-redo mr-1"></i>
                )}
                Restart
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => stopWorkerMutation.mutate()}
                disabled={stopWorkerMutation.isPending}
                className="flex-1"
                data-testid={`button-stop-${worker.id}`}
              >
                {stopWorkerMutation.isPending ? (
                  <i className="fas fa-spinner fa-spin mr-1"></i>
                ) : (
                  <i className="fas fa-stop mr-1"></i>
                )}
                Stop
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={() => startWorkerMutation.mutate()}
                disabled={startWorkerMutation.isPending}
                className="flex-1 bg-[#1976D2] hover:bg-[#1565C0]"
                data-testid={`button-start-${worker.id}`}
              >
                {startWorkerMutation.isPending ? (
                  <i className="fas fa-spinner fa-spin mr-1"></i>
                ) : (
                  <i className="fas fa-play mr-1"></i>
                )}
                Start
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                data-testid={`button-config-${worker.id}`}
              >
                <i className="fas fa-cog mr-1"></i>
                Config
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
