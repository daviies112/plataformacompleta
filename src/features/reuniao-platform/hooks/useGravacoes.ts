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
    queryFn: async () => {
      // Tenta buscar da API local (que por sua vez busca no Supabase se configurado)
      const response = await apiRequest("GET", `${API_BASE}/gravacoes/list`);
      return response.data || response;
    },
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

  const startRecording = useMutation({
    mutationFn: async (roomId: string) => {
      return apiRequest("POST", `${API_BASE}/recording/start`, { roomId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_BASE, 'gravacoes'] });
    },
  });

  const stopRecording = useMutation({
    mutationFn: async (roomId: string) => {
      return apiRequest("POST", `${API_BASE}/recording/stop`, { roomId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_BASE, 'gravacoes'] });
    },
  });

  return {
    gravacoes: gravacoesList,
    isLoading,
    error,
    refetch,
    deleteGravacao: deleteGravacao.mutate,
    getPlaybackUrl: getPlaybackUrl.mutate,
    startRecording,
    stopRecording,
    isDeleting: deleteGravacao.isPending,
    isFetchingUrl: getPlaybackUrl.isPending,
  };
}
