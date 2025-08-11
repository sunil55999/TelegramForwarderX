import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface UserTableProps {
  users: any[];
  isLoading?: boolean;
}

export default function UserTable({ users, isLoading = false }: UserTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("DELETE", `/api/users/${userId}`, null);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User deleted",
        description: "User has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const handleDeleteUser = (userId: string, username: string) => {
    if (window.confirm(`Are you sure you want to delete user "${username}"?`)) {
      deleteUserMutation.mutate(userId);
    }
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

  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge
        className={isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
        data-testid={`badge-user-status-${isActive ? "active" : "inactive"}`}
      >
        {isActive ? "Active" : "Inactive"}
      </Badge>
    );
  };

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case "admin":
        return "bg-blue-500";
      case "premium":
        return "bg-purple-500";
      default:
        return "bg-gray-400";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
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
                        <div className="h-3 bg-gray-200 rounded w-32 mt-1"></div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><div className="h-6 bg-gray-200 rounded w-16"></div></TableCell>
                  <TableCell><div className="h-4 bg-gray-200 rounded w-8"></div></TableCell>
                  <TableCell><div className="h-4 bg-gray-200 rounded w-20"></div></TableCell>
                  <TableCell><div className="h-6 bg-gray-200 rounded w-16"></div></TableCell>
                  <TableCell><div className="h-8 bg-gray-200 rounded w-20"></div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
        <div className="text-gray-400 mb-4">
          <i className="fas fa-users text-4xl"></i>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2" data-testid="text-no-users-title">
          No users found
        </h3>
        <p className="text-gray-500" data-testid="text-no-users-description">
          No users have been registered yet. Click "Add User" to create the first user.
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
              <TableHead>User</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Sessions</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                <TableCell>
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${getUserTypeColor(user.userType)}`}>
                        <span className="text-white text-sm font-medium" data-testid={`text-user-initials-${user.id}`}>
                          {getInitials(user.username)}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900" data-testid={`text-username-${user.id}`}>
                        {user.username}
                      </div>
                      <div className="text-sm text-gray-500" data-testid={`text-email-${user.id}`}>
                        {user.email}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {getUserTypeBadge(user.userType)}
                </TableCell>
                <TableCell>
                  <span data-testid={`text-sessions-count-${user.id}`}>
                    {user.sessionsCount || 0}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-500" data-testid={`text-joined-date-${user.id}`}>
                    {formatDate(user.createdAt)}
                  </span>
                </TableCell>
                <TableCell>
                  {getStatusBadge(user.isActive)}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[#1976D2] hover:text-[#1565C0]"
                      data-testid={`button-edit-${user.id}`}
                    >
                      <i className="fas fa-edit"></i>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id, user.username)}
                      disabled={deleteUserMutation.isPending}
                      className="text-red-600 hover:text-red-700"
                      data-testid={`button-delete-${user.id}`}
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
