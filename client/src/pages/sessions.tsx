import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import DashboardLayout from "@/components/layout/sidebar";
import SessionTable from "@/components/sessions/session-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Sessions() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSession, setNewSession] = useState({
    sessionName: "",
    phoneNumber: "",
    apiId: "",
    apiHash: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["/api/sessions"],
  });

  const createSessionMutation = useMutation({
    mutationFn: async (sessionData: typeof newSession) => {
      const response = await apiRequest("POST", "/api/sessions", sessionData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      setIsAddDialogOpen(false);
      setNewSession({
        sessionName: "",
        phoneNumber: "",
        apiId: "",
        apiHash: "",
      });
      toast({
        title: "Session created",
        description: "New session has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create session",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setNewSession(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSessionMutation.mutate(newSession);
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-medium text-gray-900" data-testid="text-sessions-title">
              Session Management
            </h2>
            <p className="text-gray-600 mt-1" data-testid="text-sessions-subtitle">
              Manage Telegram sessions and forwarding rules
            </p>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-[#1976D2] hover:bg-[#1565C0] text-white px-4 py-2 rounded-lg font-medium transition-colors"
                data-testid="button-add-session"
              >
                <i className="fas fa-plus mr-2"></i>Add Session
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Session</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-add-session">
                <div>
                  <Label htmlFor="sessionName">Session Name</Label>
                  <Input
                    id="sessionName"
                    value={newSession.sessionName}
                    onChange={(e) => handleInputChange("sessionName", e.target.value)}
                    placeholder="Enter session name"
                    required
                    data-testid="input-session-name"
                  />
                </div>
                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    value={newSession.phoneNumber}
                    onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                    placeholder="+1234567890"
                    required
                    data-testid="input-phone-number"
                  />
                </div>
                <div>
                  <Label htmlFor="apiId">API ID</Label>
                  <Input
                    id="apiId"
                    value={newSession.apiId}
                    onChange={(e) => handleInputChange("apiId", e.target.value)}
                    placeholder="Enter Telegram API ID"
                    required
                    data-testid="input-api-id"
                  />
                </div>
                <div>
                  <Label htmlFor="apiHash">API Hash</Label>
                  <Input
                    id="apiHash"
                    value={newSession.apiHash}
                    onChange={(e) => handleInputChange("apiHash", e.target.value)}
                    placeholder="Enter Telegram API Hash"
                    required
                    data-testid="input-api-hash"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                    data-testid="button-cancel-session"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createSessionMutation.isPending}
                    className="bg-[#1976D2] hover:bg-[#1565C0]"
                    data-testid="button-create-session"
                  >
                    {createSessionMutation.isPending ? "Creating..." : "Create Session"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <SessionTable sessions={sessions || []} isLoading={isLoading} />
      </div>
    </DashboardLayout>
  );
}
