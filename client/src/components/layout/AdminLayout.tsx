import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  Menu, 
  Settings, 
  Users, 
  Activity, 
  Shield, 
  BarChart3, 
  FileText, 
  LogOut,
  Server,
  ChevronDown,
  Home
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAuthState, clearAuthState } from "@/lib/auth";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user } = getAuthState();

  const handleLogout = () => {
    clearAuthState();
    setLocation("/login");
  };

  const adminNavigationItems = [
    {
      name: "Overview",
      href: "/admin",
      icon: Home,
      current: location === "/admin"
    },
    {
      name: "Users Management",
      href: "/admin/users",
      icon: Users,
      current: location === "/admin/users"
    },
    {
      name: "Worker Management",
      href: "/admin/workers",
      icon: Server,
      current: location === "/admin/workers"
    },
    {
      name: "System Sessions",
      href: "/admin/sessions",
      icon: Activity,
      current: location === "/admin/sessions"
    },
    {
      name: "Global Statistics",
      href: "/admin/statistics",
      icon: BarChart3,
      current: location === "/admin/statistics"
    },
    {
      name: "System Logs",
      href: "/admin/logs",
      icon: FileText,
      current: location === "/admin/logs"
    },
    {
      name: "System Settings",
      href: "/admin/settings",
      icon: Settings,
      current: location === "/admin/settings"
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
            <Shield className="h-8 w-8 text-red-600" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              Admin Panel
            </span>
          </div>
        </div>

        <nav className="mt-8 px-4 space-y-2">
          {adminNavigationItems.map((item) => (
            <Link key={item.name} href={item.href}>
              <a className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                item.current
                  ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100'
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
                  AutoForwardX - Admin Panel
                </h1>
              </div>

              <div className="flex items-center space-x-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {user?.username?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {user?.username || 'Admin'}
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