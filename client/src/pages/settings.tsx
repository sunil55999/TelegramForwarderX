import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Settings() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/settings"],
  });

  const [formData, setFormData] = useState({
    max_ram_usage: "80",
    worker_auto_restart: true,
    free_user_delay: "5",
    db_pool_size: "20",
    query_timeout: "30",
  });

  // Initialize form data when settings load
  useEffect(() => {
    if (settings) {
      const settingsMap: Record<string, any> = {};
      (settings as any[]).forEach((setting: any) => {
        settingsMap[setting.key] = setting.key === "worker_auto_restart" ? setting.value === "true" : setting.value;
      });
      setFormData(prev => ({ ...prev, ...settingsMap }));
    }
  }, [settings]);

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value, description }: { key: string; value: string; description?: string }) => {
      const response = await apiRequest("PUT", `/api/settings/${key}`, { value, description });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings updated",
        description: "System settings have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (key: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Update each setting
      await updateSettingMutation.mutateAsync({
        key: "max_ram_usage",
        value: formData.max_ram_usage,
        description: "Maximum RAM usage percentage"
      });

      await updateSettingMutation.mutateAsync({
        key: "worker_auto_restart",
        value: formData.worker_auto_restart.toString(),
        description: "Enable automatic worker restart"
      });

      await updateSettingMutation.mutateAsync({
        key: "free_user_delay",
        value: formData.free_user_delay,
        description: "Free user priority delay in seconds"
      });

      await updateSettingMutation.mutateAsync({
        key: "db_pool_size",
        value: formData.db_pool_size,
        description: "Database connection pool size"
      });

      await updateSettingMutation.mutateAsync({
        key: "query_timeout",
        value: formData.query_timeout,
        description: "Query timeout in seconds"
      });

    } catch (error) {
      // Error handled by mutation
    } finally {
      setIsLoading(false);
    }
  };

  if (settingsLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-2 w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded mb-6 w-1/2"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-lg border p-6">
                  <div className="h-6 bg-gray-200 rounded mb-4"></div>
                  <div className="space-y-4">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-medium text-gray-900" data-testid="text-settings-title">
            System Settings
          </h2>
          <p className="text-gray-600 mt-1" data-testid="text-settings-subtitle">
            Configure system parameters and preferences
          </p>
        </div>

        <form onSubmit={handleSubmit} data-testid="form-settings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* General Settings */}
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="max_ram_usage" className="block text-sm font-medium text-gray-700 mb-2">
                    Max RAM Usage (%)
                  </Label>
                  <Input
                    id="max_ram_usage"
                    type="number"
                    min="50"
                    max="95"
                    value={formData.max_ram_usage}
                    onChange={(e) => handleInputChange("max_ram_usage", e.target.value)}
                    className="w-full"
                    data-testid="input-max-ram-usage"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="worker_auto_restart"
                    checked={formData.worker_auto_restart}
                    onCheckedChange={(checked) => handleInputChange("worker_auto_restart", checked as boolean)}
                    data-testid="checkbox-worker-auto-restart"
                  />
                  <Label htmlFor="worker_auto_restart" className="text-sm text-gray-600">
                    Enable automatic worker restart on crash
                  </Label>
                </div>
                
                <div>
                  <Label htmlFor="free_user_delay" className="block text-sm font-medium text-gray-700 mb-2">
                    Free User Priority Delay (seconds)
                  </Label>
                  <Input
                    id="free_user_delay"
                    type="number"
                    min="0"
                    max="60"
                    value={formData.free_user_delay}
                    onChange={(e) => handleInputChange("free_user_delay", e.target.value)}
                    className="w-full"
                    data-testid="input-free-user-delay"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Database Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Database Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="db_pool_size" className="block text-sm font-medium text-gray-700 mb-2">
                    Connection Pool Size
                  </Label>
                  <Input
                    id="db_pool_size"
                    type="number"
                    min="5"
                    max="100"
                    value={formData.db_pool_size}
                    onChange={(e) => handleInputChange("db_pool_size", e.target.value)}
                    className="w-full"
                    data-testid="input-db-pool-size"
                  />
                </div>
                
                <div>
                  <Label htmlFor="query_timeout" className="block text-sm font-medium text-gray-700 mb-2">
                    Query Timeout (seconds)
                  </Label>
                  <Input
                    id="query_timeout"
                    type="number"
                    min="10"
                    max="300"
                    value={formData.query_timeout}
                    onChange={(e) => handleInputChange("query_timeout", e.target.value)}
                    className="w-full"
                    data-testid="input-query-timeout"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Database Status</span>
                  <Badge className="bg-green-100 text-green-800" data-testid="badge-db-status">
                    Connected
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Save Button */}
          <div className="mt-6 flex justify-end">
            <Button
              type="submit"
              disabled={isLoading || updateSettingMutation.isPending}
              className="bg-[#1976D2] hover:bg-[#1565C0] text-white px-6 py-2 rounded-lg font-medium transition-colors"
              data-testid="button-save-settings"
            >
              {isLoading || updateSettingMutation.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Saving...
                </>
              ) : (
                <>
                  <i className="fas fa-save mr-2"></i>
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
