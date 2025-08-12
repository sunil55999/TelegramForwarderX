import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  Menu, 
  Settings, 
  Activity, 
  BarChart3, 
  MessageSquare, 
  LogOut,
  Home,
  Users,
  ArrowLeftRight,
  Filter,
  ChevronDown,
  CreditCard,
  PlusCircle,
  Shield
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAuthState, clearAuthState } from "@/lib/auth";

interface UserLayoutProps {
  children: React.ReactNode;
}

export default function UserLayout({ children }: UserLayoutProps) {
  const [location, setLocation] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user } = getAuthState();

  const handleLogout = () => {
    clearAuthState();
    setLocation("/login");
  };

  const userNavigationItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: Home,
      current: location === "/dashboard"
    },
    {
      name: "Sources",
      href: "/sources",
      icon: MessageSquare,
      current: location === "/sources"
    },
    {
      name: "Destinations",
      href: "/destinations", 
      icon: Activity,
      current: location === "/destinations"
    },
    {
      name: "Forwarding Rules",
      href: "/forwarding",
      icon: ArrowLeftRight,
      current: location === "/forwarding"
    },
    {
      name: "Regex Rules",
      href: "/regex-rules",
      icon: Filter,
      current: location === "/regex-rules"
    },
    {
      name: "Pending Messages",
      href: "/pending-messages",
      icon: MessageSquare,
      current: location === "/pending-messages"
    },
    {
      name: "Statistics",
      href: "/statistics",
      icon: BarChart3,
      current: location === "/statistics"
    },
    {
      name: "Multi-Accounts",
      href: "/multi-accounts",
      icon: Users,
      current: location === "/multi-accounts"
    },
    {
      name: "Team Collaboration",
      href: "/team-collaboration",
      icon: Users,
      current: location === "/team-collaboration"
    },
    {
      name: "Session Resilience",
      href: "/session-resilience",
      icon: Shield,
      current: location === "/session-resilience"
    },
    {
      name: "Subscription",
      href: "/subscription",
      icon: CreditCard,
      current: location === "/subscription"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden bg-gray-600 bg-opacity-75"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <ArrowLeftRight className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              AutoForwardX
            </span>
          </div>
        </div>

        <nav className="mt-8 px-4 space-y-2">
          {userNavigationItems.map((item) => (
            <Link key={item.name} href={item.href}>
              <a className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                item.current
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}>
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </a>
            </Link>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className={`lg:pl-64 transition-all duration-300 ${isSidebarOpen ? 'pl-64' : 'pl-0'}`}>
        {/* Top navigation */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <h1 className="ml-4 text-xl font-semibold text-gray-900 dark:text-white">
                  AutoForwardX Dashboard
                </h1>
              </div>

              <div className="flex items-center space-x-4">
                <span className="text-sm px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
                  {user?.userType ? user.userType.charAt(0).toUpperCase() + user.userType.slice(1) : 'Free'} Plan
                </span>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {user?.username?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {user?.username || 'User'}
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}