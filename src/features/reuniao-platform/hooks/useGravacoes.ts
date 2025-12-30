import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

const API_BASE = "/api/reunioes";

async function apiRequest(method: string, url: string, data?: unknown) {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {};
  
  // Headers dinâmicos do Supabase (para multi-tenant)
  const supabaseUrl = localStorage.getItem('supabase_url');
  const supabaseKey = localStorage.getItem('supabase_key');

  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (supabaseUrl) headers["x-supabase-url"] = supabaseUrl;
  if (supabaseKey) headers["x-supabase-key"] = supabaseKey;
  
  const response = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status}: ${text}`);
  }

  return response.json();
}

export function useGravacoes() {
  const queryClient = useQueryClient();
  const [tenantId, setTenantId] = useState<string | null>(null);

  // Busca o tenant ID do localStorage quando o componente monta
  useEffect(() => {
    const stored = localStorage.getItem('tenant_id');
    if (stored) {
      setTenantId(stored);
    }
  }, []);

  // 📌 Busca todas as gravações do tenant via API
  const { data: gravacoesList = [], isLoading, error, refetch } = useQuery({
    queryKey: [API_BASE, 'gravacoes', tenantId],
    queryFn: () => apiRequest("GET", `${API_BASE}/gravacoes/list`),
    enabled: !!tenantId,
    staleTime: 30 * 1000,
  });

  // Mutation para deletar gravação
  const deleteGravacao = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `${API_BASE}/gravacoes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_BASE, 'gravacoes'] });
    },
  });

  // Mutation para obter URL de playback
  const getPlaybackUrl = useMutation({
    mutationFn: (id: string) => apiRequest("GET", `${API_BASE}/gravacoes/${id}/url`),
  });

  return {
    gravacoes: gravacoesList,
    isLoading,
    error,
    refetch,
    deleteGravacao: deleteGravacao.mutate,
    getPlaybackUrl: getPlaybackUrl.mutate,
    isDeleting: deleteGravacao.isPending,
    isFetchingUrl: getPlaybackUrl.isPending,
  };
}
