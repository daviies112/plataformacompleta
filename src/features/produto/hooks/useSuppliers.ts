import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { Supplier } from '@/features/produto/types/database.types';
import { toast } from 'sonner';

const dbToSupplier = (dbSupplier: any): Supplier => ({
  id: dbSupplier.id,
  nome: dbSupplier.nome,
  cpfCnpj: dbSupplier.cpf_cnpj,
  razaoSocial: dbSupplier.razao_social,
  inscricaoEstadual: dbSupplier.inscricao_estadual,
  referencia: dbSupplier.referencia,
  endereco: dbSupplier.endereco,
  numero: dbSupplier.numero,
  bairro: dbSupplier.bairro,
  cidade: dbSupplier.cidade,
  uf: dbSupplier.uf,
  cep: dbSupplier.cep,
  pais: dbSupplier.pais,
  nomeContato: dbSupplier.nome_contato,
  email: dbSupplier.email,
  telefone: dbSupplier.telefone,
  telefone2: dbSupplier.telefone2,
  whatsapp: dbSupplier.whatsapp,
  observacoes: dbSupplier.observacoes,
});

const supplierToDb = (supplier: Omit<Supplier, 'id'>) => ({
  nome: supplier.nome,
  cpf_cnpj: supplier.cpfCnpj,
  razao_social: supplier.razaoSocial,
  inscricao_estadual: supplier.inscricaoEstadual,
  referencia: supplier.referencia,
  endereco: supplier.endereco,
  numero: supplier.numero,
  bairro: supplier.bairro,
  cidade: supplier.cidade,
  uf: supplier.uf,
  cep: supplier.cep,
  pais: supplier.pais,
  nome_contato: supplier.nomeContato,
  email: supplier.email,
  telefone: supplier.telefone,
  telefone2: supplier.telefone2,
  whatsapp: supplier.whatsapp,
  observacoes: supplier.observacoes,
});

export const useSuppliers = () => {
  const queryClient = useQueryClient();

  const { data: suppliers = [], isLoading, error } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const supabase = await getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase não configurado. Configure as credenciais em /configuracoes');
      }
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(dbToSupplier);
    },
  });

  const addSupplier = useMutation({
    mutationFn: async (supplier: Omit<Supplier, 'id'>) => {
      const supabase = await getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase não configurado. Configure as credenciais em /configuracoes');
      }
      const { data, error } = await supabase
        .from('suppliers')
        .insert([supplierToDb(supplier)])
        .select()
        .single();

      if (error) throw error;
      return dbToSupplier(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Fornecedor adicionado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao adicionar fornecedor: ' + error.message);
    },
  });

  const updateSupplier = useMutation({
    mutationFn: async (supplier: Supplier) => {
      const supabase = await getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase não configurado. Configure as credenciais em /configuracoes');
      }
      const { data, error } = await supabase
        .from('suppliers')
        .update(supplierToDb(supplier))
        .eq('id', supplier.id)
        .select()
        .single();

      if (error) throw error;
      return dbToSupplier(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Fornecedor atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar fornecedor: ' + error.message);
    },
  });

  const deleteSupplier = useMutation({
    mutationFn: async (id: string) => {
      const supabase = await getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase não configurado. Configure as credenciais em /configuracoes');
      }
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Fornecedor excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir fornecedor: ' + error.message);
    },
  });

  return {
    suppliers,
    isLoading,
    error,
    addSupplier: addSupplier.mutate,
    updateSupplier: updateSupplier.mutate,
    deleteSupplier: deleteSupplier.mutate,
  };
};
