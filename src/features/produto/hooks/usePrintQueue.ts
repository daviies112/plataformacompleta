import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { PrintQueueItem } from '@/features/produto/types/database.types';
import { toast } from 'sonner';

export const usePrintQueue = () => {
  const queryClient = useQueryClient();

  const { data: printQueue = [], isLoading, error } = useQuery({
    queryKey: ['printQueue'],
    queryFn: async () => {
      const supabase = await getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase não configurado. Configure as credenciais em /configuracoes');
      }
      const { data, error } = await supabase
        .from('print_queue')
        .select(`
          *,
          product:products(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data.map((item: any) => ({
        id: item.id,
        product: {
          id: item.product.id,
          image: item.product.image || '',
          barcode: item.product.barcode,
          reference: item.product.reference,
          description: item.product.description,
          number: item.product.number,
          color: item.product.color,
          category: item.product.category,
          subcategory: item.product.subcategory,
          price: item.product.price.toString(),
          stock: item.product.stock,
          createdAt: new Date(item.product.created_at),
        },
        quantity: item.quantity,
        parcelas: item.parcelas,
      })) as PrintQueueItem[];
    },
  });

  const addToPrintQueue = useMutation({
    mutationFn: async ({ productId, quantity, parcelas }: { productId: string; quantity: number; parcelas: number }) => {
      const supabase = await getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase não configurado. Configure as credenciais em /configuracoes');
      }
      const { data, error } = await supabase
        .from('print_queue')
        .insert([{
          product_id: productId,
          quantity,
          parcelas,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printQueue'] });
      toast.success('Item adicionado à fila de impressão!');
    },
    onError: (error) => {
      toast.error('Erro ao adicionar à fila: ' + error.message);
    },
  });

  const removeFromPrintQueue = useMutation({
    mutationFn: async (id: string) => {
      const supabase = await getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase não configurado. Configure as credenciais em /configuracoes');
      }
      const { error } = await supabase
        .from('print_queue')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printQueue'] });
      toast.success('Item removido da fila!');
    },
    onError: (error) => {
      toast.error('Erro ao remover da fila: ' + error.message);
    },
  });

  const clearPrintQueue = useMutation({
    mutationFn: async () => {
      const supabase = await getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase não configurado. Configure as credenciais em /configuracoes');
      }
      const { error } = await supabase
        .from('print_queue')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printQueue'] });
      toast.success('Fila de impressão limpa!');
    },
    onError: (error) => {
      toast.error('Erro ao limpar fila: ' + error.message);
    },
  });

  return {
    printQueue,
    isLoading,
    error,
    addToPrintQueue: addToPrintQueue.mutate,
    removeFromPrintQueue: removeFromPrintQueue.mutate,
    clearPrintQueue: clearPrintQueue.mutate,
  };
};
