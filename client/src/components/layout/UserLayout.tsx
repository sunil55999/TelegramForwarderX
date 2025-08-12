import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Home, 
  MessageSquare, 
  Router, 
  Zap, 
  FileText, 
  Settings, 
  PanelLeftClose,
  PanelLeftOpen,
  CreditCard,
  Users,
  Shield,
  LogOut,
  Activity,
  BarChart3,
  Clock
} from "lucide-react";
import { useAuth, clearAuthState } from "@/lib/auth";

interface UserLayoutProps {
  children: ReactNode;
}

export default function UserLayout({ children }: UserLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [location] = useLocation();
  const { user } = useAuth();

  const handleLogout = () => {
    clearAuthState();
    window.location.href = "/login";
  };

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: Home,
      current: location === "/dashboard",
      color: "purple",
    },

    {
      name: "Forwarding Rules",
      href: "/forwarding",
      icon: Zap,
      current: location === "/forwarding",
      color: "orange",
    },
    {
      name: "Regex Rules",
      href: "/regex-rules",
      icon: FileText,
      current: location === "/regex-rules",
      color: "pink",
    },
    {
      name: "Pending Messages",
      href: "/pending-messages", 
      icon: Clock,
      current: location === "/pending-messages",
      color: "yellow",
    },
    {
      name: "Statistics",
      href: "/statistics",
      icon: BarChart3,
      current: location === "/statistics",
      color: "blue",
    },
    {
      name: "Subscription",
      href: "/subscription",
      icon: CreditCard,
      current: location === "/subscription",
      color: "emerald",
    },
    {
      name: "Multi-Accounts",
      href: "/multi-accounts",
      icon: Users,
      current: location === "/multi-accounts",
      color: "violet",
    },
    {
      name: "Team Collaboration",
      href: "/team-collaboration",
      icon: Users,
      current: location === "/team-collaboration",
      color: "indigo",
    },
    {
      name: "Session Resilience",
      href: "/session-resilience",
      icon: Shield,
      current: location === "/session-resilience",
      color: "red",
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      current: location === "/settings",
      color: "gray",
    },
  ];

  const getNavItemClasses = (isCurrent: boolean) => {
    return isCurrent 
      ? "bg-[#00B4D8]/20 text-[#00B4D8] border-[#00B4D8]/50 shadow-lg" 
      : "text-[#E0E0E0] hover:bg-[#00B4D8]/10 hover:text-[#00B4D8] border-[#333333] hover:border-[#00B4D8]/50";
  };

  return (
    <div className="min-h-screen bg-[#121212]">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 bg-[#181818] border-r border-[#333333] shadow-2xl transition-all duration-300 ${
          sidebarOpen ? "w-64 translate-x-0" : "w-16 -translate-x-full md:translate-x-0"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-[#333333]">
          <div className={`flex items-center gap-3 ${!sidebarOpen && "justify-center"}`}>
            <div className="w-8 h-8 bg-[#00B4D8] rounded-lg flex items-center justify-center shadow-lg">
              <Zap className="h-5 w-5 text-white" />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="text-lg font-semibold text-[#E0E0E0]">
                  AutoForwardX
                </h1>
                <p className="text-xs text-gray-400">Professional Dashboard</p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 text-[#E0E0E0] hover:text-[#00B4D8] hover:bg-[#00B4D8]/10 md:flex hidden rounded-lg"
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* User Info */}
        {sidebarOpen && (
          <div className="p-4 border-b border-[#333333]">
            <Card className="card-professional p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#00B4D8] rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">
                    {user?.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#E0E0E0] truncate">
                    {user?.username}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="status-indicator status-healthy text-xs">
                      {user?.userType ? (user.userType.charAt(0).toUpperCase() + user.userType.slice(1)) : 'User'}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={`sidebar-link ${item.current ? 'active' : ''} ${
                    !sidebarOpen && "justify-center px-2"
                  }`}
                  title={!sidebarOpen ? item.name : undefined}
                  onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {sidebarOpen && <span className="truncate ml-3">{item.name}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-[#333333]">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={`w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 hover:border-red-400/40 transition-all duration-200 rounded-lg ${
              !sidebarOpen && "justify-center px-2"
            }`}
            title={!sidebarOpen ? "Logout" : undefined}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {sidebarOpen && <span className="font-medium">Logout</span>}
          </Button>
        </div>
      </div>

      {/* Mobile Toggle */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSidebarOpen(true)}
          className="bg-[#232323] border-[#333333] text-[#E0E0E0] hover:bg-[#00B4D8]/10 hover:border-[#00B4D8] rounded-lg shadow-lg"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? "md:ml-64" : "md:ml-16"}`}>
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}