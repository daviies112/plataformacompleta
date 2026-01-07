import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Meeting, CreateMeetingData } from "../types";

const API_BASE = "/api/reunioes";

async function apiRequest(method: string, url: string, data?: unknown) {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {};
  
  // Headers dinâmicos do Supabase (para multi-tenant)
  // Tentar primeiro carregar das configurações globais se disponíveis, senão localStorage
  const supabaseUrl = window.REACT_APP_SUPABASE_URL || localStorage.getItem('supabase_url');
  const supabaseKey = window.REACT_APP_SUPABASE_ANON_KEY || localStorage.getItem('supabase_key');

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

export function useReuniao(id?: string) {
  const queryClient = useQueryClient();

  const { data: meetingsResponse, isLoading: listLoading, error: listError } = useQuery<{ success: boolean; data: Meeting[] }>({
    queryKey: [API_BASE],
    queryFn: () => apiRequest("GET", API_BASE),
    staleTime: 30 * 1000,
  });

  const meetings = meetingsResponse?.data || [];

  const { data: meetingResponse, isLoading: meetingLoading, error: meetingError } = useQuery<{ success: boolean; data: Meeting }>({
    queryKey: [API_BASE, id],
    queryFn: () => apiRequest("GET", `${API_BASE}/${id}`),
    enabled: !!id,
  });

  const meeting = meetingResponse?.data;

  const createMutation = useMutation({
    mutationFn: (data: CreateMeetingData) => apiRequest("POST", API_BASE, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_BASE] });
      queryClient.invalidateQueries({ queryKey: ["reunioes-calendario"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/calendar-events"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Meeting> }) => 
      apiRequest("PATCH", `${API_BASE}/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [API_BASE] });
      queryClient.invalidateQueries({ queryKey: [API_BASE, id] });
      queryClient.invalidateQueries({ queryKey: ["reunioes-calendario"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/calendar-events"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `${API_BASE}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_BASE] });
      queryClient.invalidateQueries({ queryKey: ["reunioes-calendario"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/calendar-events"] });
    },
  });

  const startMeetingMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `${API_BASE}/${id}/start`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [API_BASE] });
      queryClient.invalidateQueries({ queryKey: [API_BASE, id] });
      queryClient.invalidateQueries({ queryKey: ["reunioes-calendario"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/calendar-events"] });
    },
  });

  const endMeetingMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `${API_BASE}/${id}/end`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [API_BASE] });
      queryClient.invalidateQueries({ queryKey: [API_BASE, id] });
      queryClient.invalidateQueries({ queryKey: ["reunioes-calendario"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/calendar-events"] });
    },
  });

  const getTokenMutation = useMutation({
    mutationFn: ({ id, userName, role = 'guest' }: { id: string; userName?: string; role?: string }) => 
      apiRequest("GET", `${API_BASE}/${id}/token?role=${role}${userName ? `&userName=${encodeURIComponent(userName)}` : ''}`),
  });

  const startRecordingMutation = useMutation({
    mutationFn: ({ id, meetingUrl }: { id: string; meetingUrl?: string }) => 
      apiRequest("POST", `${API_BASE}/${id}/recording/start`, { meetingUrl }),
  });

  const stopRecordingMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `${API_BASE}/${id}/recording/stop`),
  });

  // 📌 NOVO: Busca gravações da reunião
  const { data: recordingsResponse, isLoading: recordingsLoading } = useQuery({
    queryKey: [API_BASE, id, 'gravacoes'],
    queryFn: () => apiRequest("GET", `${API_BASE}/${id}/gravacoes`),
    enabled: !!id,
  });

  // 📌 NOVO: Busca transcrições da reunião
  const { data: transcriptionsResponse, isLoading: transcriptionsLoading } = useQuery({
    queryKey: [API_BASE, id, 'transcricoes'],
    queryFn: () => apiRequest("GET", `${API_BASE}/${id}/transcricoes`),
    enabled: !!id,
  });

  const createInstantMeetingMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const end = new Date(now.getTime() + 60 * 60 * 1000); // 1 hora de duração
      
      const data: CreateMeetingData = {
        titulo: `Reunião Instantânea - ${now.toLocaleTimeString('pt-BR')}`,
        descricao: 'Reunião criada instantaneamente',
        dataInicio: now.toISOString(),
        dataFim: end.toISOString(),
        duracao: 60,
        participantes: [],
      };
      
      const result = await apiRequest("POST", API_BASE, data);
      
      // Iniciar a reunião automaticamente
      if (result.data?.id) {
        await apiRequest("POST", `${API_BASE}/${result.data.id}/start`);
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_BASE] });
    },
  });

  return {
    meetings,
    meeting,
    recordings: recordingsResponse?.data || [],
    transcriptions: transcriptionsResponse?.data || [],
    loading: listLoading || meetingLoading || recordingsLoading || transcriptionsLoading,
    error: listError || meetingError,
    addMeeting: (data: CreateMeetingData) => createMutation.mutateAsync(data),
    updateMeeting: (id: string, data: Partial<Meeting>) => updateMutation.mutateAsync({ id, data }),
    deleteMeeting: (id: string) => deleteMutation.mutateAsync(id),
    startMeeting: (id: string) => startMeetingMutation.mutateAsync(id),
    endMeeting: (id: string) => endMeetingMutation.mutateAsync(id),
    getToken: (id: string, userName?: string, role?: string) => 
      getTokenMutation.mutateAsync({ id, userName, role }),
    startRecording: (id: string, meetingUrl?: string) => 
      startRecordingMutation.mutateAsync({ id, meetingUrl }),
    stopRecording: (id: string) => stopRecordingMutation.mutateAsync(id),
    createInstantMeeting: () => createInstantMeetingMutation.mutateAsync(),
    isCreating: createMutation.isPending,
    isStarting: startMeetingMutation.isPending || createInstantMeetingMutation.isPending,
    isEnding: endMeetingMutation.isPending,
    createError: createMutation.error,
  };
}
