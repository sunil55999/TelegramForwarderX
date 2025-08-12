import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Get auth data from localStorage
  const token = localStorage.getItem("authToken");
  const userStr = localStorage.getItem("user");
  let user = null;
  
  try {
    if (userStr) {
      user = JSON.parse(userStr);
    }
  } catch (error) {
    console.error("Error parsing user data:", error);
  }

  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};

  // Add authentication headers if available
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    
    // Add user info headers for backend middleware
    if (user) {
      headers['x-user-id'] = user.id;
      headers['x-username'] = user.username;
      headers['x-email'] = user.email;
      headers['x-user-type'] = user.userType;
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Handle authentication errors
  if (res.status === 401) {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get auth data from localStorage
    const token = localStorage.getItem("authToken");
    const userStr = localStorage.getItem("user");
    let user = null;
    
    try {
      if (userStr) {
        user = JSON.parse(userStr);
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
    }

    const headers: Record<string, string> = {};

    // Add authentication headers if available
    if (token) {
      headers.Authorization = `Bearer ${token}`;
      
      // Add user info headers for backend middleware
      if (user) {
        headers['x-user-id'] = user.id;
        headers['x-username'] = user.username;
        headers['x-email'] = user.email;
        headers['x-user-type'] = user.userType;
      }
    }

    const res = await fetch(queryKey.join("/") as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      // Clear auth data on 401
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      return null;
    }

    // Handle authentication errors for other cases
    if (res.status === 401) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
