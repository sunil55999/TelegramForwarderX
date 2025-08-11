import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus, Users, Shield, Edit, Trash2, Crown, Settings } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

interface TeamMember {
  id: string;
  ownerId: string;
  memberEmail: string;
  permissions: string[];
  status: "pending" | "active" | "inactive";
  joinedAt?: Date;
  lastActive?: Date;
}

interface TeamInfo {
  owner: {
    id: string;
    email: string;
    username: string;
  };
  members: TeamMember[];
  totalMembers: number;
  activeMembers: number;
  pendingInvites: number;
}

const inviteMemberSchema = z.object({
  memberEmail: z.string().email("Valid email address required"),
  permissions: z.array(z.string()).min(1, "At least one permission required"),
});

type InviteMemberForm = z.infer<typeof inviteMemberSchema>;

const availablePermissions = [
  { id: "view_accounts", label: "View Accounts", description: "Can view telegram accounts" },
  { id: "manage_accounts", label: "Manage Accounts", description: "Can add/edit/delete accounts" },
  { id: "view_mappings", label: "View Mappings", description: "Can view forwarding mappings" },
  { id: "manage_mappings", label: "Manage Mappings", description: "Can create/edit/delete mappings" },
  { id: "view_sessions", label: "View Sessions", description: "Can view session information" },
  { id: "manage_sessions", label: "Manage Sessions", description: "Can control session lifecycle" },
  { id: "view_analytics", label: "View Analytics", description: "Can access analytics and reports" },
  { id: "admin_access", label: "Admin Access", description: "Full administrative access" },
];

export default function TeamCollaboration() {
  const [selectedOwnerId, setSelectedOwnerId] = useState("user-1");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InviteMemberForm>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      memberEmail: "",
      permissions: [],
    },
  });

  // Query for team info
  const { data: teamInfo, isLoading } = useQuery({
    queryKey: ["/api/team", selectedOwnerId],
    enabled: !!selectedOwnerId,
  });

  // Invite member mutation
  const inviteMemberMutation = useMutation({
    mutationFn: async (data: InviteMemberForm) => {
      const response = await apiRequest("POST", `/api/team/${selectedOwnerId}/invite`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team", selectedOwnerId] });
      setIsInviteDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Team member invited successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to invite team member",
        variant: "destructive",
      });
    },
  });

  // Update permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ memberId, permissions }: { memberId: string; permissions: string[] }) => {
      const response = await apiRequest("PUT", `/api/team/member/${memberId}/permissions`, { permissions });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team", selectedOwnerId] });
      setEditingMember(null);
      toast({
        title: "Success",
        description: "Permissions updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update permissions",
        variant: "destructive",
      });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await apiRequest("DELETE", `/api/team/${selectedOwnerId}/member/${memberId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team", selectedOwnerId] });
      toast({
        title: "Success",
        description: "Team member removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove team member",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InviteMemberForm) => {
    inviteMemberMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case "pending":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Pending</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPermissionLabel = (permission: string) => {
    const perm = availablePermissions.find(p => p.id === permission);
    return perm ? perm.label : permission;
  };

  if (isLoading) {
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
          <h1 className="text-3xl font-bold">Team Collaboration</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage team members and their access permissions</p>
        </div>
        <div className="flex gap-4">
          <Select value={selectedOwnerId} onValueChange={setSelectedOwnerId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Team Owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user-1">User 1</SelectItem>
              <SelectItem value="user-2">User 2</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Invite a new member to your team and set their permissions
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="memberEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input placeholder="member@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="permissions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Permissions</FormLabel>
                        <div className="grid grid-cols-2 gap-4">
                          {availablePermissions.map((permission) => (
                            <div key={permission.id} className="flex items-start space-x-2">
                              <Checkbox
                                id={permission.id}
                                checked={field.value.includes(permission.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange([...field.value, permission.id]);
                                  } else {
                                    field.onChange(field.value.filter(p => p !== permission.id));
                                  }
                                }}
                              />
                              <div className="space-y-1">
                                <label
                                  htmlFor={permission.id}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {permission.label}
                                </label>
                                <p className="text-xs text-muted-foreground">
                                  {permission.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={inviteMemberMutation.isPending}>
                      {inviteMemberMutation.isPending ? "Inviting..." : "Send Invite"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Team Stats */}
      {teamInfo && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(teamInfo as any)?.totalMembers || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Members</CardTitle>
              <Shield className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{(teamInfo as any)?.activeMembers || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
              <UserPlus className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{(teamInfo as any)?.pendingInvites || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Team Owner Info */}
      {(teamInfo as any)?.owner && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              Team Owner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                {(teamInfo as any)?.owner?.username?.charAt(0).toUpperCase() || "U"}
              </div>
              <div>
                <p className="font-medium">{(teamInfo as any)?.owner?.username}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{(teamInfo as any)?.owner?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Manage your team members and their access permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!(teamInfo as any)?.members || (teamInfo as any).members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No team members found. Invite your first team member to get started.
                  </TableCell>
                </TableRow>
              ) : (
                ((teamInfo as any)?.members || []).map((member: TeamMember) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.memberEmail}</TableCell>
                    <TableCell>{getStatusBadge(member.status)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {member.permissions.slice(0, 2).map(permission => (
                          <Badge key={permission} variant="outline" className="text-xs">
                            {getPermissionLabel(permission)}
                          </Badge>
                        ))}
                        {member.permissions.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{member.permissions.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : "Pending"}
                    </TableCell>
                    <TableCell>
                      {member.lastActive ? new Date(member.lastActive).toLocaleDateString() : "Never"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingMember(member)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeMemberMutation.mutate(member.id)}
                          disabled={removeMemberMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Member Permissions Dialog */}
      <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Member Permissions</DialogTitle>
            <DialogDescription>
              Update permissions for {editingMember?.memberEmail}
            </DialogDescription>
          </DialogHeader>
          {editingMember && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {availablePermissions.map((permission) => (
                  <div key={permission.id} className="flex items-start space-x-2">
                    <Checkbox
                      id={`edit-${permission.id}`}
                      checked={editingMember.permissions.includes(permission.id)}
                      onCheckedChange={(checked) => {
                        const updatedPermissions = checked
                          ? [...editingMember.permissions, permission.id]
                          : editingMember.permissions.filter(p => p !== permission.id);
                        setEditingMember({
                          ...editingMember,
                          permissions: updatedPermissions
                        });
                      }}
                    />
                    <div className="space-y-1">
                      <label
                        htmlFor={`edit-${permission.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {permission.label}
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {permission.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingMember(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => updatePermissionsMutation.mutate({
                    memberId: editingMember.id,
                    permissions: editingMember.permissions
                  })}
                  disabled={updatePermissionsMutation.isPending}
                >
                  {updatePermissionsMutation.isPending ? "Updating..." : "Update Permissions"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}