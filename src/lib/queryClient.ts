import { QueryClient, QueryFunction } from "@tanstack/react-query";

function getTenantIdFromStorage(): string | null {
  try {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      return parsedUser?.tenantId || null;
    }
    return localStorage.getItem('tenantId') || localStorage.getItem('tenant_id') || null;
  } catch (error) {
    console.warn('[queryClient] Error getting tenantId from localStorage:', error);
    return null;
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    try {
      const json = JSON.parse(text);
      if (json.error) {
        throw new Error(json.error);
      }
      if (json.message) {
        throw new Error(json.message);
      }
    } catch (parseError) {
      if (parseError instanceof SyntaxError) {
        throw new Error(text || res.statusText);
      }
      throw parseError;
    }
    
    throw new Error(text || res.statusText);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  const tenantId = getTenantIdFromStorage();
  if (tenantId) {
    headers["x-tenant-id"] = tenantId;
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};
    
    const tenantId = getTenantIdFromStorage();
    if (tenantId) {
      headers["x-tenant-id"] = tenantId;
    }
    
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
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
