import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  onLogout: () => void;
}

export default function Navbar({ onLogout }: NavbarProps) {
  const [user, setUser] = useState<any>(null);

  const { data: health } = useQuery({
    queryKey: ["/api/dashboard/health"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getRamUsageColor = (usage: number) => {
    if (usage > 80) return "text-red-600";
    if (usage > 60) return "text-yellow-600";
    return "text-gray-600";
  };

  return (
    <nav className="bg-white shadow-sm border-b h-20 fixed top-0 left-0 right-0 z-20">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-[#1976D2] rounded-lg w-10 h-10 flex items-center justify-center">
              <i className="fas fa-paper-plane text-white text-lg"></i>
            </div>
            <h1 className="ml-3 text-xl font-medium text-gray-900" data-testid="text-app-title">
              AutoForwardX
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* RAM Usage Indicator */}
            <div className="bg-gray-100 rounded-full px-3 py-1 flex items-center space-x-2">
              <i className="fas fa-memory text-gray-600"></i>
              <span 
                className={`text-sm font-medium ${getRamUsageColor((health as any)?.ramUsage || 0)}`}
                data-testid="text-ram-usage"
              >
                RAM: {(health as any)?.ramUsage || 0}%
              </span>
            </div>
            
            {/* User Profile */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#1976D2] rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium" data-testid="text-user-initials">
                  {getInitials(user?.username || "User")}
                </span>
              </div>
              <span className="text-sm font-medium" data-testid="text-username">
                {user?.username || "User"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="text-gray-500 hover:text-gray-700"
                data-testid="button-logout"
              >
                <i className="fas fa-sign-out-alt"></i>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
