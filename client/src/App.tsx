import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AdminLayout from "@/components/layout/AdminLayout";
import UserLayout from "@/components/layout/UserLayout";

// Auth & Public Pages
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

// Admin Pages
import AdminOverview from "@/pages/admin/AdminOverview";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminSessions from "@/pages/admin/AdminSessions";
import Workers from "@/pages/workers";
import LogsPage from "@/pages/LogsPage";
import Settings from "@/pages/settings";
import Statistics from "@/pages/Statistics";

// User Dashboard Pages
import Dashboard from "@/pages/dashboard";
import ForwardingPage from "@/pages/ForwardingPage";
import RegexRules from "@/pages/RegexRules";
import PendingMessages from "@/pages/PendingMessages";
import SubscriptionDashboard from "@/pages/SubscriptionDashboard";
import MultiAccountManagement from "@/pages/MultiAccountManagement";
import TeamCollaboration from "@/pages/TeamCollaboration";
import SessionResilience from "@/pages/SessionResilience";

// Verification Pages (can be accessed by both)
import Phase3Verification from "@/pages/Phase3Verification";
import Phase4Verification from "@/pages/Phase4Verification";
import Phase6Verification from "@/pages/Phase6Verification";

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      
      {/* Admin Panel Routes */}
      <Route path="/admin">
        <ProtectedRoute requireAdmin={true}>
          <AdminLayout>
            <AdminOverview />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin/users">
        <ProtectedRoute requireAdmin={true}>
          <AdminLayout>
            <AdminUsers />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin/sessions">
        <ProtectedRoute requireAdmin={true}>
          <AdminLayout>
            <AdminSessions />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin/workers">
        <ProtectedRoute requireAdmin={true}>
          <AdminLayout>
            <Workers />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin/statistics">
        <ProtectedRoute requireAdmin={true}>
          <AdminLayout>
            <Statistics />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin/logs">
        <ProtectedRoute requireAdmin={true}>
          <AdminLayout>
            <LogsPage />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin/settings">
        <ProtectedRoute requireAdmin={true}>
          <AdminLayout>
            <Settings />
          </AdminLayout>
        </ProtectedRoute>
      </Route>

      {/* User Dashboard Routes */}
      <Route path="/dashboard">
        <ProtectedRoute>
          <UserLayout>
            <Dashboard />
          </UserLayout>
        </ProtectedRoute>
      </Route>
      

      
      <Route path="/forwarding">
        <ProtectedRoute>
          <UserLayout>
            <ForwardingPage />
          </UserLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/regex-rules">
        <ProtectedRoute>
          <UserLayout>
            <RegexRules />
          </UserLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/pending-messages">
        <ProtectedRoute>
          <UserLayout>
            <PendingMessages />
          </UserLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/statistics">
        <ProtectedRoute>
          <UserLayout>
            <Statistics />
          </UserLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/subscription">
        <ProtectedRoute>
          <UserLayout>
            <SubscriptionDashboard />
          </UserLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/multi-accounts">
        <ProtectedRoute>
          <UserLayout>
            <MultiAccountManagement />
          </UserLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/team-collaboration">
        <ProtectedRoute>
          <UserLayout>
            <TeamCollaboration />
          </UserLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/session-resilience">
        <ProtectedRoute>
          <UserLayout>
            <SessionResilience />
          </UserLayout>
        </ProtectedRoute>
      </Route>

      {/* Verification Pages - Accessible by all authenticated users */}
      <Route path="/phase3-verification">
        <ProtectedRoute>
          <UserLayout>
            <Phase3Verification />
          </UserLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/phase4-verification">
        <ProtectedRoute>
          <UserLayout>
            <Phase4Verification />
          </UserLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/phase6-verification">
        <ProtectedRoute>
          <UserLayout>
            <Phase6Verification />
          </UserLayout>
        </ProtectedRoute>
      </Route>

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
