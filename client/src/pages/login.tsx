import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Login() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    rememberMe: false,
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/auth/login", {
        username: formData.username,
        password: formData.password,
      });

      const data = await response.json();
      
      // Store auth data
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      toast({
        title: "Login successful",
        description: "Welcome to AutoForwardX!",
      });

      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1976D2] to-[#1565C0]">
      <Card className="w-full max-w-md mx-4 shadow-2xl">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="bg-[#1976D2] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-paper-plane text-white text-2xl"></i>
            </div>
            <h1 className="text-2xl font-medium text-gray-900">AutoForwardX</h1>
            <p className="text-gray-600 mt-2">Telegram Forwarding Management</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
            <div>
              <Label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </Label>
              <Input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                placeholder="Enter your username"
                className="w-full focus:ring-2 focus:ring-[#1976D2] focus:border-transparent"
                required
                data-testid="input-username"
              />
            </div>
            
            <div>
              <Label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                placeholder="Enter your password"
                className="w-full focus:ring-2 focus:ring-[#1976D2] focus:border-transparent"
                required
                data-testid="input-password"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rememberMe"
                  checked={formData.rememberMe}
                  onCheckedChange={(checked) => handleInputChange("rememberMe", checked as boolean)}
                  data-testid="checkbox-remember"
                />
                <Label htmlFor="rememberMe" className="text-sm text-gray-600">
                  Remember me
                </Label>
              </div>
              <a href="#" className="text-sm text-[#1976D2] hover:text-[#1565C0]">
                Forgot password?
              </a>
            </div>
            
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#1976D2] hover:bg-[#1565C0] text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
              data-testid="button-login"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
