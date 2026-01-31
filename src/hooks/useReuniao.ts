import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { reunioesApi } from "@/lib/api";

export type Meeting = {
  id: string;
  tenantId: string;
  usuarioId?: string;
  nome?: string;
  email?: string;
  telefone?: string;
  titulo: string;
  descricao?: string;
  dataInicio: string;
  dataFim: string;
  duracao?: number;
  status: 'agendada' | 'cancelada' | 'concluida' | 'em_andamento' | 'finalizada';
  roomId100ms?: string;
  linkReuniao?: string;
  participantes?: any[];
};

export function useReuniao(id?: string) {
  const queryClient = useQueryClient();

  const { data: meetings = [], isLoading: listLoading, error: listError } = useQuery<Meeting[]>({
    queryKey: ["/api/reunioes"],
    queryFn: async () => {
      const response = await reunioesApi.list();
      return response.data;
    },
    staleTime: 30 * 1000,
  });

  const { data: meeting, isLoading: meetingLoading, error: meetingError } = useQuery<Meeting>({
    queryKey: ["/api/reunioes", id],
    queryFn: async () => {
      if (!id) throw new Error("ID is required");
      const response = await reunioesApi.get(id);
      return response.data;
    },
    enabled: !!id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await reunioesApi.create(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reunioes"] });
      queryClient.invalidateQueries({ queryKey: ["reunioes-calendario"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/calendar-events"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await reunioesApi.update(id, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reunioes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reunioes", id] });
      queryClient.invalidateQueries({ queryKey: ["reunioes-calendario"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/calendar-events"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await reunioesApi.delete(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reunioes"] });
      queryClient.invalidateQueries({ queryKey: ["reunioes-calendario"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/calendar-events"] });
    },
  });

  const getToken100msMutation = useMutation({
    mutationFn: async (meetingId: string) => {
      const response = await reunioesApi.getToken100ms(meetingId);
      return response.data;
    },
  });

  // Memoizar para evitar loop infinito em useEffect
  const getToken100ms = useCallback(
    (meetingId: string) => getToken100msMutation.mutateAsync(meetingId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const checkAvailabilityMutation = useMutation({
    mutationFn: async (data: { dataInicio: string; dataFim: string }) => {
      const response = await reunioesApi.checkAvailability(data);
      return response.data;
    },
  });

  const createInstantMutation = useMutation({
    mutationFn: async (data?: { titulo?: string; duracao?: number }) => {
      const response = await reunioesApi.createInstant(data);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reunioes"] });
      queryClient.invalidateQueries({ queryKey: ["reunioes-calendario"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/calendar-events"] });
    },
  });

  return {
    meetings,
    meeting,
    loading: (id ? meetingLoading : listLoading),
    listLoading,
    meetingLoading,
    error: (id ? meetingError : listError),
    listError,
    meetingError,
    addMeeting: (data: any) => createMutation.mutateAsync(data),
    updateMeeting: (id: string, data: any) => updateMutation.mutateAsync({ id, data }),
    deleteMeeting: (id: string) => deleteMutation.mutateAsync(id),
    getToken100ms,
    checkAvailability: (data: { dataInicio: string; dataFim: string }) => checkAvailabilityMutation.mutateAsync(data),
    createInstantMeeting: (data?: { titulo?: string; duracao?: number }) => createInstantMutation.mutateAsync(data),
    isCreating: createMutation.isPending,
    isCreatingInstant: createInstantMutation.isPending,
    createError: createMutation.error,
  };
}
