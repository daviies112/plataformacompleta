import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export function useReuniao() {
  const { toast } = useToast();

  const { data: meetings, isLoading, refetch } = useQuery({
    queryKey: ['/api/meetings'],
  });

  const createMeetingMutation = useMutation({
    mutationFn: async (newMeeting: any) => {
      const res = await apiRequest('POST', '/api/meetings', newMeeting);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      toast({
        title: 'Sucesso!',
        description: 'Reunião agendada com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao agendar reunião',
        description: error.message,
      });
    },
  });

  return {
    meetings,
    isLoading,
    refetch,
    createMeeting: createMeetingMutation.mutateAsync,
    isCreating: createMeetingMutation.isPending,
  };
}
