import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Power, PowerOff, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";

const addSourceSchema = z.object({
  sessionId: z.string().min(1, "Session is required"),
  chatId: z.string().min(1, "Chat ID is required"),
  chatTitle: z.string().min(1, "Chat title is required"),
  chatType: z.enum(["channel", "group", "supergroup"]),
  chatUsername: z.string().optional(),
});

type AddSourceFormData = z.infer<typeof addSourceSchema>;

interface Source {
  id: string;
  sessionId: string;
  chatId: string;
  chatTitle: string;
  chatType: string;
  chatUsername?: string;
  isActive: boolean;
  lastMessageTime?: string;
  totalMessages: number;
  createdAt: string;
}

interface TelegramSession {
  id: string;
  sessionName: string;
  phoneNumber: string;
  status: string;
}

export default function SourcesPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AddSourceFormData>({
    resolver: zodResolver(addSourceSchema),
    defaultValues: {
      sessionId: "",
      chatId: "",
      chatTitle: "",
      chatType: "channel",
      chatUsername: "",
    },
  });

  const { data: sources = [], isLoading } = useQuery<Source[]>({
    queryKey: ["/api/sources"],
  });

  const { data: sessions = [] } = useQuery<TelegramSession[]>({
    queryKey: ["/api/sessions"],
  });

  const addSourceMutation = useMutation({
    mutationFn: (data: AddSourceFormData) => apiRequest("/api/sources", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Source added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add source",
        variant: "destructive",
      });
    },
  });

  const deleteSourceMutation = useMutation({
    mutationFn: (sourceId: string) => apiRequest(`/api/sources/${sourceId}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
      toast({
        title: "Success",
        description: "Source deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete source",
        variant: "destructive",
      });
    },
  });

  const toggleSourceMutation = useMutation({
    mutationFn: (sourceId: string) => apiRequest(`/api/sources/${sourceId}/toggle`, {
      method: "PATCH",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
    },
  });

  const onSubmit = (data: AddSourceFormData) => {
    addSourceMutation.mutate(data);
  };

  const handleDelete = (sourceId: string, chatTitle: string) => {
    if (confirm(`Are you sure you want to delete "${chatTitle}"?`)) {
      deleteSourceMutation.mutate(sourceId);
    }
  };

  const handleToggle = (sourceId: string) => {
    toggleSourceMutation.mutate(sourceId);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Source Channels</h1>
        </div>
        <div>Loading sources...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Source Channels</h1>
          <p className="text-muted-foreground">
            Manage channels and groups that will be monitored for forwarding
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Source
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Source Channel</DialogTitle>
              <DialogDescription>
                Add a new channel or group to monitor for messages
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="sessionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telegram Session</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a session" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sessions.map((session) => (
                            <SelectItem key={session.id} value={session.id}>
                              {session.sessionName} ({session.phoneNumber})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="chatId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chat ID</FormLabel>
                      <FormControl>
                        <Input placeholder="-1001234567890" {...field} />
                      </FormControl>
                      <FormDescription>
                        Telegram chat ID (use @userinfobot to get chat ID)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="chatTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chat Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Channel or Group Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="chatType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chat Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="channel">Channel</SelectItem>
                          <SelectItem value="group">Group</SelectItem>
                          <SelectItem value="supergroup">Supergroup</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="chatUsername"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="@channelname" {...field} />
                      </FormControl>
                      <FormDescription>
                        Public username if available
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addSourceMutation.isPending}>
                    {addSourceMutation.isPending ? "Adding..." : "Add Source"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sources.map((source) => (
          <Card key={source.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{source.chatTitle}</CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant={source.isActive ? "default" : "secondary"}>
                    {source.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggle(source.id)}
                    disabled={toggleSourceMutation.isPending}
                  >
                    {source.isActive ? (
                      <PowerOff className="w-4 h-4" />
                    ) : (
                      <Power className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(source.id, source.chatTitle)}
                    disabled={deleteSourceMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>
                {source.chatType.charAt(0).toUpperCase() + source.chatType.slice(1)} • {source.chatId}
                {source.chatUsername && ` • ${source.chatUsername}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Messages:</span>
                  <span className="font-medium">{source.totalMessages}</span>
                </div>
                {source.lastMessageTime && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last Message:</span>
                    <span className="font-medium">
                      {new Date(source.lastMessageTime).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Added:</span>
                  <span className="font-medium">
                    {new Date(source.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {sources.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-medium">No sources configured</h3>
                <p className="text-muted-foreground">
                  Add your first source channel or group to start monitoring messages
                </p>
              </div>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Source
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}