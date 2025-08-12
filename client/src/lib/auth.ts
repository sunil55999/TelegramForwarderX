import { useState, useEffect } from "react";

export interface User {
  id: string;
  username: string;
  email: string;
  userType: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export const getAuthState = (): AuthState => {
  try {
    const token = localStorage.getItem("authToken");
    const userStr = localStorage.getItem("user");
    
    if (!token || !userStr) {
      return {
        user: null,
        token: null,
        isAuthenticated: false,
      };
    }

    const user = JSON.parse(userStr);
    
    return {
      user,
      token,
      isAuthenticated: true,
    };
  } catch (error) {
    console.error("Error reading auth state:", error);
    return {
      user: null,
      token: null,
      isAuthenticated: false,
    };
  }
};

export const setAuthState = (user: User, token: string) => {
  localStorage.setItem("authToken", token);
  localStorage.setItem("user", JSON.stringify(user));
};

export const clearAuthState = () => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("user");
};

export const getAuthHeader = (): Record<string, string> => {
  const { token } = getAuthState();
  
  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
};

export const isTokenExpired = (token: string): boolean => {
  try {
    // Simple JWT payload extraction (not secure for validation, just for checking expiry)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    
    return payload.exp < currentTime;
  } catch (error) {
    return true; // Assume expired if can't parse
  }
};

export const shouldRefreshToken = (): boolean => {
  const { token } = getAuthState();
  
  if (!token) {
    return false;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = payload.exp - currentTime;
    
    // Refresh if token expires in less than 5 minutes
    return timeUntilExpiry < 300;
  } catch (error) {
    return false;
  }
};

export const redirectToLogin = () => {
  clearAuthState();
  window.location.href = "/login";
};

// Route protection utility
export const requireAuth = (): User => {
  const { isAuthenticated, user } = getAuthState();
  
  if (!isAuthenticated || !user) {
    redirectToLogin();
    throw new Error("Authentication required");
  }

  return user;
};

// Role-based access control
export const hasPermission = (userType: string, requiredPermission: string): boolean => {
  const permissions = {
    admin: ["admin", "premium", "free"],
    premium: ["premium", "free"],
    free: ["free"]
  };

  const userPermissions = permissions[userType as keyof typeof permissions] || [];
  return userPermissions.includes(requiredPermission);
};

export const requirePermission = (requiredPermission: string) => {
  const user = requireAuth();
  
  if (!hasPermission(user.userType, requiredPermission)) {
    throw new Error("Insufficient permissions");
  }

  return user;
};

// Admin check
export const requireAdmin = () => {
  return requirePermission("admin");
};

// Check if user is admin
export const isAdmin = (user?: User | null): boolean => {
  if (!user) {
    const { user: currentUser } = getAuthState();
    user = currentUser;
  }
  return user?.userType === "admin" || false;
};

// Role-based redirect after login
export const getPostLoginRedirect = (user: User): string => {
  if (isAdmin(user)) {
    return "/admin";
  }
  return "/dashboard";
};

// Check if current route is accessible for user role
export const isRouteAccessible = (path: string, user?: User | null): boolean => {
  if (!user) {
    const { user: currentUser } = getAuthState();
    user = currentUser;
  }
  
  if (!user) return false;
  
  // Admin routes - only accessible by admins
  const adminRoutes = [
    "/admin",
    "/admin/",
    "/admin/users",
    "/admin/workers", 
    "/admin/sessions",
    "/admin/statistics",
    "/admin/logs",
    "/admin/settings"
  ];
  
  // User dashboard routes - accessible by all authenticated users
  const userRoutes = [
    "/dashboard",
    "/dashboard/",
    "/sources",
    "/destinations", 
    "/forwarding",
    "/regex-rules",
    "/pending-messages",
    "/subscription",
    "/multi-accounts",
    "/team-collaboration",
    "/session-resilience"
  ];
  
  // Check admin routes
  if (adminRoutes.some(route => path.startsWith(route))) {
    return isAdmin(user);
  }
  
  // Check user routes - accessible to all authenticated users
  if (userRoutes.some(route => path.startsWith(route))) {
    return true;
  }
  
  // Public routes
  const publicRoutes = ["/", "/login"];
  if (publicRoutes.includes(path)) {
    return true;
  }
  
  return false;
};

// React hook for using auth state
export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>(getAuthState);

  useEffect(() => {
    // Listen for storage changes to sync auth state across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "authToken" || e.key === "user") {
        setAuthState(getAuthState());
      }
    };

    window.addEventListener("storage", handleStorageChange);
    
    // Also refresh auth state periodically to check for token expiry
    const interval = setInterval(() => {
      setAuthState(getAuthState());
    }, 60000); // Check every minute

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return authState;
};
