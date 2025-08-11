import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/layout/navbar";
import { cn } from "@/lib/utils";

interface SidebarProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: SidebarProps) {
  const [location] = useLocation();
  const { toast } = useToast();

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
    window.location.href = "/login";
  };

  const navigationItems = [
    {
      name: "Overview",
      path: "/dashboard",
      icon: "fas fa-tachometer-alt",
      testId: "nav-overview"
    },
    {
      name: "Sessions",
      path: "/sessions", 
      icon: "fas fa-link",
      testId: "nav-sessions"
    },
    {
      name: "Sources",
      path: "/sources",
      icon: "fas fa-inbox",
      testId: "nav-sources"
    },
    {
      name: "Destinations",
      path: "/destinations",
      icon: "fas fa-paper-plane",
      testId: "nav-destinations"
    },
    {
      name: "Forwarding",
      path: "/forwarding",
      icon: "fas fa-route",
      testId: "nav-forwarding"
    },
    {
      name: "Logs",
      path: "/logs",
      icon: "fas fa-list-alt",
      testId: "nav-logs"
    },
    {
      name: "Regex Rules",
      path: "/regex-rules",
      icon: "fas fa-code",
      testId: "nav-regex-rules"
    },
    {
      name: "Pending Messages",
      path: "/pending-messages",
      icon: "fas fa-clock",
      testId: "nav-pending-messages"
    },
    {
      name: "Statistics",
      path: "/statistics",
      icon: "fas fa-chart-bar",
      testId: "nav-statistics"
    },
    {
      name: "Multi-Accounts",
      path: "/multi-accounts",
      icon: "fas fa-user-friends",
      testId: "nav-multi-accounts"
    },
    {
      name: "Team Collaboration",
      path: "/team-collaboration",
      icon: "fas fa-users-cog",
      testId: "nav-team-collaboration"
    },
    {
      name: "Session Resilience",
      path: "/session-resilience",
      icon: "fas fa-shield-alt",
      testId: "nav-session-resilience"
    },
    {
      name: "Workers",
      path: "/workers",
      icon: "fas fa-cogs",
      testId: "nav-workers"
    },
    {
      name: "Users",
      path: "/users",
      icon: "fas fa-users",
      testId: "nav-users"
    },
    {
      name: "Settings",
      path: "/settings",
      icon: "fas fa-cog",
      testId: "nav-settings"
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Top Navigation */}
      <Navbar onLogout={handleLogout} />

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm h-[calc(100vh-80px)] fixed top-[80px] left-0 z-10">
          <nav className="mt-8">
            <div className="px-4 space-y-2">
              {navigationItems.map((item) => (
                <Link key={item.path} href={item.path}>
                  <a
                    className={cn(
                      "nav-item flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                      location === item.path
                        ? "active bg-[#1976D2] text-white hover:bg-[#1565C0] hover:text-white"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                    data-testid={item.testId}
                  >
                    <i className={`${item.icon} mr-3 w-4 h-4`}></i>
                    <span>{item.name}</span>
                  </a>
                </Link>
              ))}
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 ml-64 min-h-[calc(100vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  );
}
