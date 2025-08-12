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
      name: "Sources",
      href: "/sources", 
      icon: MessageSquare,
      current: location === "/sources",
      color: "cyan",
    },
    {
      name: "Destinations",
      href: "/destinations",
      icon: Router,
      current: location === "/destinations",
      color: "green",
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

  const getColorClasses = (color: string, isCurrent: boolean) => {
    const colors = {
      purple: isCurrent 
        ? "bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-lg shadow-purple-500/25 neon-purple" 
        : "text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 border-purple-500/20 hover:border-purple-400/40",
      cyan: isCurrent 
        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-lg shadow-cyan-500/25 neon-cyan" 
        : "text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 border-cyan-500/20 hover:border-cyan-400/40",
      green: isCurrent 
        ? "bg-green-500/20 text-green-300 border-green-500/50 shadow-lg shadow-green-500/25 neon-green" 
        : "text-green-400 hover:bg-green-500/10 hover:text-green-300 border-green-500/20 hover:border-green-400/40",
      orange: isCurrent 
        ? "bg-orange-500/20 text-orange-300 border-orange-500/50 shadow-lg shadow-orange-500/25" 
        : "text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 border-orange-500/20 hover:border-orange-400/40",
      pink: isCurrent 
        ? "bg-pink-500/20 text-pink-300 border-pink-500/50 shadow-lg shadow-pink-500/25" 
        : "text-pink-400 hover:bg-pink-500/10 hover:text-pink-300 border-pink-500/20 hover:border-pink-400/40",
      yellow: isCurrent 
        ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/50 shadow-lg shadow-yellow-500/25" 
        : "text-yellow-400 hover:bg-yellow-500/10 hover:text-yellow-300 border-yellow-500/20 hover:border-yellow-400/40",
      blue: isCurrent 
        ? "bg-blue-500/20 text-blue-300 border-blue-500/50 shadow-lg shadow-blue-500/25" 
        : "text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 border-blue-500/20 hover:border-blue-400/40",
      emerald: isCurrent 
        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-lg shadow-emerald-500/25" 
        : "text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 border-emerald-500/20 hover:border-emerald-400/40",
      violet: isCurrent 
        ? "bg-violet-500/20 text-violet-300 border-violet-500/50 shadow-lg shadow-violet-500/25" 
        : "text-violet-400 hover:bg-violet-500/10 hover:text-violet-300 border-violet-500/20 hover:border-violet-400/40",
      indigo: isCurrent 
        ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-lg shadow-indigo-500/25" 
        : "text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 border-indigo-500/20 hover:border-indigo-400/40",
      red: isCurrent 
        ? "bg-red-500/20 text-red-300 border-red-500/50 shadow-lg shadow-red-500/25" 
        : "text-red-400 hover:bg-red-500/10 hover:text-red-300 border-red-500/20 hover:border-red-400/40",
      gray: isCurrent 
        ? "bg-gray-500/20 text-gray-300 border-gray-500/50 shadow-lg shadow-gray-500/25" 
        : "text-gray-400 hover:bg-gray-500/10 hover:text-gray-300 border-gray-500/20 hover:border-gray-400/40",
    };
    return colors[color as keyof typeof colors] || colors.gray;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 bg-gray-800/80 backdrop-blur-sm border-r border-purple-500/20 shadow-2xl transition-all duration-300 ${
          sidebarOpen ? "w-64 translate-x-0" : "w-16 -translate-x-full md:translate-x-0"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-purple-500/20">
          <div className={`flex items-center gap-3 ${!sidebarOpen && "justify-center"}`}>
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Zap className="h-5 w-5 text-white animate-pulse" />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  AutoForwardX
                </h1>
                <p className="text-xs text-gray-400">Ninja Mode</p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 md:flex hidden"
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
          <div className="p-4 border-b border-purple-500/20">
            <Card className="p-4 bg-gray-700/50 backdrop-blur-sm border-purple-500/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/25">
                  <span className="text-white font-bold text-lg">
                    {user?.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user?.username}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge 
                      variant="outline" 
                      className="text-xs border-purple-500/50 text-purple-300 bg-purple-500/10"
                    >
                      ⚡ {user?.userType ? (user.userType.charAt(0).toUpperCase() + user.userType.slice(1)) : 'User'}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
          {navigation.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-3 border transition-all duration-300 animate-fade-in ${
                    !sidebarOpen && "justify-center px-2"
                  } ${getColorClasses(item.color, item.current)}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  title={!sidebarOpen ? item.name : undefined}
                  onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}
                >
                  <Icon className={`h-5 w-5 flex-shrink-0 transition-transform duration-300 ${
                    item.current ? "scale-110" : "group-hover:scale-110"
                  }`} />
                  {sidebarOpen && <span className="truncate font-medium">{item.name}</span>}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-purple-500/20">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={`w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 hover:border-red-400/40 transition-all duration-300 ${
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
          className="bg-gray-800/80 backdrop-blur-sm border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
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