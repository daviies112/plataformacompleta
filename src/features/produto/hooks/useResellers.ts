import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { Reseller } from '@/features/produto/types/database.types';
import { toast } from 'sonner';

const dbToReseller = (dbReseller: any): Reseller => ({
  id: dbReseller.id,
  nome: dbReseller.nome,
  cpf: dbReseller.cpf,
  telefone: dbReseller.telefone,
  email: dbReseller.email,
  tipo: dbReseller.tipo,
  nivel: dbReseller.nivel,
});

const resellerToDb = (reseller: Omit<Reseller, 'id'>) => ({
  nome: reseller.nome,
  cpf: reseller.cpf,
  telefone: reseller.telefone,
  email: reseller.email,
  tipo: reseller.tipo,
  nivel: reseller.nivel,
});

export const useResellers = () => {
  const queryClient = useQueryClient();

  const { data: resellers = [], isLoading, error } = useQuery({
    queryKey: ['resellers'],
    queryFn: async () => {
      const supabase = await getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase não configurado. Configure as credenciais em /configuracoes');
      }
      const { data, error } = await supabase
        .from('resellers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(dbToReseller);
    },
  });

  const addReseller = useMutation({
    mutationFn: async (reseller: Omit<Reseller, 'id'>) => {
      const supabase = await getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase não configurado. Configure as credenciais em /configuracoes');
      }
      const { data, error } = await supabase
        .from('resellers')
        .insert([resellerToDb(reseller)])
        .select()
        .single();

      if (error) throw error;
      return dbToReseller(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resellers'] });
      toast.success('Revendedor adicionado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao adicionar revendedor: ' + error.message);
    },
  });

  const updateReseller = useMutation({
    mutationFn: async (reseller: Reseller) => {
      const supabase = await getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase não configurado. Configure as credenciais em /configuracoes');
      }
      const { data, error } = await supabase
        .from('resellers')
        .update(resellerToDb(reseller))
        .eq('id', reseller.id)
        .select()
        .single();

      if (error) throw error;
      return dbToReseller(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resellers'] });
      toast.success('Revendedor atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar revendedor: ' + error.message);
    },
  });

  const deleteReseller = useMutation({
    mutationFn: async (id: string) => {
      const supabase = await getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase não configurado. Configure as credenciais em /configuracoes');
      }
      const { error } = await supabase
        .from('resellers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resellers'] });
      toast.success('Revendedor excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir revendedor: ' + error.message);
    },
  });

  return {
    resellers,
    isLoading,
    error,
    addReseller: addReseller.mutate,
    updateReseller: updateReseller.mutate,
    deleteReseller: deleteReseller.mutate,
  };
};
