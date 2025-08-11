import { apiRequest } from "@/lib/queryClient";
import { getAuthState, redirectToLogin, isTokenExpired } from "@/lib/auth";

// Enhanced API request with auth handling
export const authenticatedApiRequest = async (
  method: string,
  url: string,
  data?: unknown
): Promise<Response> => {
  const { token, isAuthenticated } = getAuthState();

  // Check if user is authenticated
  if (!isAuthenticated || !token) {
    redirectToLogin();
    throw new Error("Authentication required");
  }

  // Check if token is expired
  if (isTokenExpired(token)) {
    redirectToLogin();
    throw new Error("Session expired");
  }

  try {
    // Make request with authorization header
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    // Handle 401 responses
    if (response.status === 401) {
      redirectToLogin();
      throw new Error("Session expired");
    }

    // Handle other errors
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = response.statusText;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.detail || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      throw new Error(`${response.status}: ${errorMessage}`);
    }

    return response;
  } catch (error) {
    // Re-throw API errors
    throw error;
  }
};

// API endpoints
export const api = {
  // Authentication
  auth: {
    login: (credentials: { username: string; password: string }) =>
      apiRequest("POST", "/api/auth/login", credentials),
    
    logout: () =>
      authenticatedApiRequest("POST", "/api/auth/logout", null),
    
    me: () =>
      authenticatedApiRequest("GET", "/api/auth/me", null),
  },

  // Dashboard
  dashboard: {
    getStats: () =>
      authenticatedApiRequest("GET", "/api/dashboard/stats", null),
    
    getHealth: () =>
      authenticatedApiRequest("GET", "/api/dashboard/health", null),
    
    getActivity: () =>
      authenticatedApiRequest("GET", "/api/dashboard/activity", null),
  },

  // Sessions
  sessions: {
    getAll: () =>
      authenticatedApiRequest("GET", "/api/sessions", null),
    
    create: (sessionData: {
      sessionName: string;
      phoneNumber: string;
      apiId: string;
      apiHash: string;
    }) =>
      authenticatedApiRequest("POST", "/api/sessions", sessionData),
    
    update: (id: string, updates: any) =>
      authenticatedApiRequest("PUT", `/api/sessions/${id}`, updates),
    
    delete: (id: string) =>
      authenticatedApiRequest("DELETE", `/api/sessions/${id}`, null),
  },

  // Workers
  workers: {
    getAll: () =>
      authenticatedApiRequest("GET", "/api/workers", null),
    
    create: (workerData: { name: string; config?: any }) =>
      authenticatedApiRequest("POST", "/api/workers", workerData),
    
    update: (id: string, updates: any) =>
      authenticatedApiRequest("PUT", `/api/workers/${id}`, updates),
    
    delete: (id: string) =>
      authenticatedApiRequest("DELETE", `/api/workers/${id}`, null),
    
    restart: (id: string) =>
      authenticatedApiRequest("POST", `/api/workers/${id}/restart`, null),
    
    stop: (id: string) =>
      authenticatedApiRequest("POST", `/api/workers/${id}/stop`, null),
  },

  // Users
  users: {
    getAll: () =>
      authenticatedApiRequest("GET", "/api/users", null),
    
    create: (userData: {
      username: string;
      email: string;
      password: string;
      userType?: string;
    }) =>
      authenticatedApiRequest("POST", "/api/users", userData),
    
    update: (id: string, updates: any) =>
      authenticatedApiRequest("PUT", `/api/users/${id}`, updates),
    
    delete: (id: string) =>
      authenticatedApiRequest("DELETE", `/api/users/${id}`, null),
  },

  // Settings
  settings: {
    getAll: () =>
      authenticatedApiRequest("GET", "/api/settings", null),
    
    update: (key: string, data: { value: string; description?: string }) =>
      authenticatedApiRequest("PUT", `/api/settings/${key}`, data),
  },
};

// Helper functions for common patterns
export const fetchWithAuth = async (url: string) => {
  const response = await authenticatedApiRequest("GET", url, null);
  return response.json();
};

export const postWithAuth = async (url: string, data: any) => {
  const response = await authenticatedApiRequest("POST", url, data);
  return response.json();
};

export const putWithAuth = async (url: string, data: any) => {
  const response = await authenticatedApiRequest("PUT", url, data);
  return response.json();
};

export const deleteWithAuth = async (url: string) => {
  const response = await authenticatedApiRequest("DELETE", url, null);
  return response.json();
};

// Error handling utility
export const handleApiError = (error: any) => {
  console.error("API Error:", error);

  if (error.message?.includes("401")) {
    redirectToLogin();
    return "Session expired. Please login again.";
  }

  if (error.message?.includes("403")) {
    return "You don't have permission to perform this action.";
  }

  if (error.message?.includes("404")) {
    return "The requested resource was not found.";
  }

  if (error.message?.includes("500")) {
    return "Server error. Please try again later.";
  }

  return error.message || "An unexpected error occurred.";
};

// Upload helper for file uploads
export const uploadFile = async (url: string, file: File, onProgress?: (progress: number) => void) => {
  const { token } = getAuthState();

  return new Promise<Response>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = (event.loaded / event.total) * 100;
        onProgress(progress);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(new Response(xhr.response));
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Upload failed"));
    };

    xhr.open("POST", url);
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }
    xhr.send(formData);
  });
};
