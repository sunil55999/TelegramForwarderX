import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface SessionTableProps {
  sessions: any[];
  isLoading?: boolean;
}

export default function SessionTable({ sessions, isLoading = false }: SessionTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateSessionMutation = useMutation({
    mutationFn: async ({ sessionId, updates }: { sessionId: string; updates: any }) => {
      const response = await apiRequest("PUT", `/api/sessions/${sessionId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({
        title: "Session updated",
        description: "Session status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update session",
        variant: "destructive",
      });
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest("DELETE", `/api/sessions/${sessionId}`, null);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({
        title: "Session deleted",
        description: "Session has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete session",
        variant: "destructive",
      });
    },
  });

  const handleStartSession = (sessionId: string) => {
    updateSessionMutation.mutate({
      sessionId,
      updates: { status: "active" }
    });
  };

  const handleStopSession = (sessionId: string) => {
    updateSessionMutation.mutate({
      sessionId,
      updates: { status: "idle" }
    });
  };

  const handleDeleteSession = (sessionId: string) => {
    if (window.confirm("Are you sure you want to delete this session?")) {
      deleteSessionMutation.mutate(sessionId);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: "Active", className: "bg-green-100 text-green-800" },
      idle: { label: "Idle", className: "bg-yellow-100 text-yellow-800" },
      crashed: { label: "Crashed", className: "bg-red-100 text-red-800" },
      stopped: { label: "Stopped", className: "bg-gray-100 text-gray-800" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.idle;
    return (
      <Badge className={config.className} data-testid={`badge-status-${status}`}>
        {config.label}
      </Badge>
    );
  };

  const getUserTypeBadge = (userType: string) => {
    const typeConfig = {
      premium: { label: "Premium", className: "bg-purple-100 text-purple-800" },
      admin: { label: "Admin", className: "bg-blue-100 text-blue-800" },
      free: { label: "Free", className: "bg-gray-100 text-gray-800" },
    };

    const config = typeConfig[userType as keyof typeof typeConfig] || typeConfig.free;
    return (
      <Badge className={config.className} data-testid={`badge-user-type-${userType}`}>
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>User Type</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead>Worker</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3].map((i) => (
                <TableRow key={i} className="animate-pulse">
                  <TableCell>
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                      <div className="ml-4">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                        <div className="h-3 bg-gray-200 rounded w-16 mt-1"></div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><div className="h-6 bg-gray-200 rounded w-16"></div></TableCell>
                  <TableCell><div className="h-6 bg-gray-200 rounded w-16"></div></TableCell>
                  <TableCell><div className="h-4 bg-gray-200 rounded w-10"></div></TableCell>
                  <TableCell><div className="h-4 bg-gray-200 rounded w-16"></div></TableCell>
                  <TableCell><div className="h-8 bg-gray-200 rounded w-20"></div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
        <div className="text-gray-400 mb-4">
          <i className="fas fa-link text-4xl"></i>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2" data-testid="text-no-sessions-title">
          No sessions found
        </h3>
        <p className="text-gray-500" data-testid="text-no-sessions-description">
          You haven't created any Telegram sessions yet. Click "Add Session" to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>User Type</TableHead>
              <TableHead>Messages</TableHead>
              <TableHead>Worker</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.id} data-testid={`row-session-${session.id}`}>
                <TableCell>
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <i className="fas fa-user text-gray-600"></i>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900" data-testid={`text-session-name-${session.id}`}>
                        {session.sessionName}
                      </div>
                      <div className="text-sm text-gray-500" data-testid={`text-session-phone-${session.id}`}>
                        {session.phoneNumber}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(session.status)}
                </TableCell>
                <TableCell>
                  {session.userDetails ? getUserTypeBadge(session.userDetails.userType) : "-"}
                </TableCell>
                <TableCell>
                  <span data-testid={`text-message-count-${session.id}`}>
                    {session.messageCount.toLocaleString()}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-900" data-testid={`text-worker-${session.id}`}>
                    {session.workerDetails?.name || "-"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    {session.status === "active" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStopSession(session.id)}
                        disabled={updateSessionMutation.isPending}
                        className="text-red-600 hover:text-red-700"
                        data-testid={`button-stop-${session.id}`}
                      >
                        <i className="fas fa-stop"></i>
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStartSession(session.id)}
                        disabled={updateSessionMutation.isPending}
                        className="text-green-600 hover:text-green-700"
                        data-testid={`button-start-${session.id}`}
                      >
                        <i className="fas fa-play"></i>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSession(session.id)}
                      disabled={deleteSessionMutation.isPending}
                      className="text-gray-600 hover:text-gray-900"
                      data-testid={`button-delete-${session.id}`}
                    >
                      <i className="fas fa-trash"></i>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
