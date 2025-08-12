import { useEffect } from "react";
import { useLocation } from "wouter";
import { getAuthState, isRouteAccessible } from "@/lib/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user } = getAuthState();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setLocation("/login");
      return;
    }

    if (requireAdmin && user.userType !== "admin") {
      // Non-admin users trying to access admin routes get redirected to user dashboard
      setLocation("/dashboard");
      return;
    }

    // Check route accessibility based on current path
    const currentPath = window.location.pathname;
    if (!isRouteAccessible(currentPath, user)) {
      // If user can't access this route, redirect them to appropriate dashboard
      if (user.userType === "admin") {
        setLocation("/admin");
      } else {
        setLocation("/dashboard");
      }
      return;
    }
  }, [isAuthenticated, user, requireAdmin, setLocation]);

  if (!isAuthenticated || !user) {
    return null;
  }

  if (requireAdmin && user.userType !== "admin") {
    return null;
  }

  return <>{children}</>;
}