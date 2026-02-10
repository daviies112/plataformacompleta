import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { Category } from '@/features/produto/types/database.types';
import { toast } from 'sonner';

const dbToCategory = (dbCategory: any): Category => ({
  id: dbCategory.id,
  nome: dbCategory.nome,
  etiqueta: dbCategory.etiqueta,
  etiquetaCustomizada: dbCategory.etiqueta_customizada,
  produtosVinculados: dbCategory.produtos_vinculados,
});

const categoryToDb = (category: Omit<Category, 'id'>) => ({
  nome: category.nome,
  etiqueta: category.etiqueta,
  etiqueta_customizada: category.etiquetaCustomizada,
  produtos_vinculados: category.produtosVinculados,
});

export const useCategories = () => {
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const supabase = await getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase não configurado. Configure as credenciais em /configuracoes');
      }
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(dbToCategory);
    },
  });

  const addCategory = useMutation({
    mutationFn: async (category: Omit<Category, 'id'>) => {
      const supabase = await getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase não configurado. Configure as credenciais em /configuracoes');
      }
      const { data, error } = await supabase
        .from('categories')
        .insert([categoryToDb(category)])
        .select()
        .single();

      if (error) throw error;
      return dbToCategory(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria adicionada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao adicionar categoria: ' + error.message);
    },
  });

  const updateCategory = useMutation({
    mutationFn: async (category: Category) => {
      const supabase = await getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase não configurado. Configure as credenciais em /configuracoes');
      }
      const { data, error } = await supabase
        .from('categories')
        .update(categoryToDb(category))
        .eq('id', category.id)
        .select()
        .single();

      if (error) throw error;
      return dbToCategory(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar categoria: ' + error.message);
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const supabase = await getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase não configurado. Configure as credenciais em /configuracoes');
      }
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir categoria: ' + error.message);
    },
  });

  return {
    categories,
    isLoading,
    error,
    addCategory: addCategory.mutate,
    updateCategory: updateCategory.mutate,
    deleteCategory: deleteCategory.mutate,
  };
};
