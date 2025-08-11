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
