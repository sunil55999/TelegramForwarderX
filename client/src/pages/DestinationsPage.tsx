import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Power, PowerOff, Send } from "lucide-react";
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

const addDestinationSchema = z.object({
  sessionId: z.string().min(1, "Session is required"),
  chatId: z.string().min(1, "Chat ID is required"),
  chatTitle: z.string().min(1, "Chat title is required"),
  chatType: z.enum(["channel", "group", "supergroup"]),
  chatUsername: z.string().optional(),
});

type AddDestinationFormData = z.infer<typeof addDestinationSchema>;

interface Destination {
  id: string;
  sessionId: string;
  chatId: string;
  chatTitle: string;
  chatType: string;
  chatUsername?: string;
  isActive: boolean;
  lastForwardTime?: string;
  totalForwarded: number;
  createdAt: string;
}

interface TelegramSession {
  id: string;
  sessionName: string;
  phoneNumber: string;
  status: string;
}

export default function DestinationsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AddDestinationFormData>({
    resolver: zodResolver(addDestinationSchema),
    defaultValues: {
      sessionId: "",
      chatId: "",
      chatTitle: "",
      chatType: "channel",
      chatUsername: "",
    },
  });

  const { data: destinations = [], isLoading } = useQuery<Destination[]>({
    queryKey: ["/api/destinations"],
  });

  const { data: sessions = [] } = useQuery<TelegramSession[]>({
    queryKey: ["/api/sessions"],
  });

  const addDestinationMutation = useMutation({
    mutationFn: (data: AddDestinationFormData) => apiRequest("/api/destinations", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/destinations"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Destination added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add destination",
        variant: "destructive",
      });
    },
  });

  const deleteDestinationMutation = useMutation({
    mutationFn: (destinationId: string) => apiRequest(`/api/destinations/${destinationId}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/destinations"] });
      toast({
        title: "Success",
        description: "Destination deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete destination",
        variant: "destructive",
      });
    },
  });

  const toggleDestinationMutation = useMutation({
    mutationFn: (destinationId: string) => apiRequest(`/api/destinations/${destinationId}/toggle`, {
      method: "PATCH",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/destinations"] });
    },
  });

  const onSubmit = (data: AddDestinationFormData) => {
    addDestinationMutation.mutate(data);
  };

  const handleDelete = (destinationId: string, chatTitle: string) => {
    if (confirm(`Are you sure you want to delete "${chatTitle}"?`)) {
      deleteDestinationMutation.mutate(destinationId);
    }
  };

  const handleToggle = (destinationId: string) => {
    toggleDestinationMutation.mutate(destinationId);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Destination Channels</h1>
        </div>
        <div>Loading destinations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Destination Channels</h1>
          <p className="text-muted-foreground">
            Manage channels and groups where messages will be forwarded
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Destination
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Destination Channel</DialogTitle>
              <DialogDescription>
                Add a new channel or group where messages will be forwarded
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
                  <Button type="submit" disabled={addDestinationMutation.isPending}>
                    {addDestinationMutation.isPending ? "Adding..." : "Add Destination"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {destinations.map((destination) => (
          <Card key={destination.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{destination.chatTitle}</CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant={destination.isActive ? "default" : "secondary"}>
                    {destination.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggle(destination.id)}
                    disabled={toggleDestinationMutation.isPending}
                  >
                    {destination.isActive ? (
                      <PowerOff className="w-4 h-4" />
                    ) : (
                      <Power className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(destination.id, destination.chatTitle)}
                    disabled={deleteDestinationMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>
                {destination.chatType.charAt(0).toUpperCase() + destination.chatType.slice(1)} • {destination.chatId}
                {destination.chatUsername && ` • ${destination.chatUsername}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Messages Forwarded:</span>
                  <span className="font-medium">{destination.totalForwarded}</span>
                </div>
                {destination.lastForwardTime && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last Forward:</span>
                    <span className="font-medium">
                      {new Date(destination.lastForwardTime).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Added:</span>
                  <span className="font-medium">
                    {new Date(destination.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {destinations.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <Send className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-medium">No destinations configured</h3>
                <p className="text-muted-foreground">
                  Add your first destination channel or group to start forwarding messages
                </p>
              </div>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Destination
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}