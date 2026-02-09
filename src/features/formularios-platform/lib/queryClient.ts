import { QueryClient } from "@tanstack/react-query";

async function handleResponse(response: Response) {
  if (response.status === 204) {
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.statusText}`);
  }

  return data;
}

const defaultFetcher = async ({ queryKey }: { queryKey: string[] }) => {
  const headers: Record<string, string> = {};
  
  const config = getSupabaseConfig();
  if (config) {
    headers['x-supabase-url'] = config.url;
    headers['x-supabase-key'] = config.anonKey;
  }
  
  const response = await fetch(queryKey[0], {
    credentials: 'include',
    headers,
  });
  return handleResponse(response);
};

function getSupabaseConfig() {
  const url = localStorage.getItem('supabase_url');
  const anonKey = localStorage.getItem('supabase_anon_key');
  
  if (!url || !anonKey) return null;
  
  return { url, anonKey };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultFetcher,
      staleTime: 1000 * 60,
      retry: false,
    },
  },
});

type RequestMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export async function apiRequest(
  url: string,
  method: RequestMethod = "GET",
  data?: any
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add Supabase headers if configured
  const config = getSupabaseConfig();
  if (config) {
    headers['x-supabase-url'] = config.url;
    headers['x-supabase-key'] = config.anonKey;
    console.log('🔑 [apiRequest] Enviando credenciais Supabase nos headers');
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  return handleResponse(response);
}
