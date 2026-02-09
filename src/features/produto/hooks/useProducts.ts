import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { Product } from '@/features/produto/types/database.types';
import { toast } from 'sonner';

// Converter produto do DB para o formato da aplicação
const dbToProduct = (dbProduct: any): Product => ({
  id: dbProduct.id,
  image: dbProduct.image || '',
  barcode: dbProduct.barcode,
  reference: dbProduct.reference,
  description: dbProduct.description,
  number: dbProduct.number,
  color: dbProduct.color,
  category: dbProduct.category,
  subcategory: dbProduct.subcategory,
  price: dbProduct.price.toString(),
  stock: dbProduct.stock,
  createdAt: new Date(dbProduct.created_at),
  supplier: dbProduct.supplier,
  weight: dbProduct.weight,
  goldPlatingMillesimal: dbProduct.gold_plating_millesimal,
  purchaseCost: dbProduct.purchase_cost,
  goldPlatingCost: dbProduct.gold_plating_cost,
  rhodiumPlatingCost: dbProduct.rhodium_plating_cost,
  silverPlatingCost: dbProduct.silver_plating_cost,
  varnishCost: dbProduct.varnish_cost,
  laborCost: dbProduct.labor_cost,
  wholesalePrice: dbProduct.wholesale_price,
  nfeData: dbProduct.nfe_data,
});

// Helper para converter preço string para number
const parsePrice = (priceStr: string): number => {
  if (!priceStr) return 0;
  
  // Remover símbolos de moeda e espaços
  let cleaned = priceStr.replace(/[R$\s]/g, '');
  
  // Detectar formato: se tem vírgula após ponto, é formato brasileiro (1.234,56)
  // Se tem ponto após vírgula, é formato americano (1,234.56)
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  
  if (hasComma && hasDot) {
    // Tem ambos: descobrir qual é o separador decimal
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      // Formato brasileiro: 1.234,56 → remover pontos, vírgula vira ponto
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato americano: 1,234.56 → remover vírgulas
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Só vírgula: pode ser decimal (120,50 ou 12,5) ou milhar (1,234)
    // Se tem 1 ou 2 dígitos após vírgula, é decimal
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      cleaned = cleaned.replace(',', '.');
    } else {
      // 3+ dígitos ou múltiplas vírgulas: separador de milhar
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasDot) {
    // Só ponto: pode ser decimal americano (120.50 ou 12.5) ou milhar brasileiro (1.234)
    const parts = cleaned.split('.');
    if (parts.length === 2) {
      // Se tem 1 ou 2 dígitos após o ponto, é decimal (120.50 ou 12.5)
      // Se tem 3+ dígitos, é separador de milhar (1.234)
      if (parts[1].length <= 2) {
        // Decimal americano: manter como está
      } else {
        // Separador de milhar brasileiro: remover pontos
        cleaned = cleaned.replace(/\./g, '');
      }
    } else if (parts.length > 2) {
      // Múltiplos pontos: separadores de milhar (1.234.567)
      cleaned = cleaned.replace(/\./g, '');
    }
  }
  
  return parseFloat(cleaned) || 0;
};

// Converter produto da aplicação para o DB
const productToDb = (product: Omit<Product, 'id' | 'createdAt'>) => ({
  image: product.image,
  barcode: product.barcode,
  reference: product.reference,
  description: product.description,
  number: product.number,
  color: product.color,
  category: product.category,
  subcategory: product.subcategory,
  price: parsePrice(product.price),
  stock: product.stock,
  supplier: product.supplier,
  weight: product.weight,
  gold_plating_millesimal: product.goldPlatingMillesimal,
  purchase_cost: product.purchaseCost,
  gold_plating_cost: product.goldPlatingCost,
  rhodium_plating_cost: product.rhodiumPlatingCost,
  silver_plating_cost: product.silverPlatingCost,
  varnish_cost: product.varnishCost,
  labor_cost: product.laborCost,
  wholesale_price: product.wholesalePrice,
  nfe_data: product.nfeData,
});

export const useProducts = () => {
  const queryClient = useQueryClient();

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const supabase = await getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase não configurado. Configure as credenciais em /configuracoes');
      }
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(dbToProduct);
    },
  });

  const addProduct = useMutation({
    mutationFn: async (product: Omit<Product, 'id' | 'createdAt'>) => {
      const supabase = await getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase não configurado. Configure as credenciais em /configuracoes');
      }
      
      const { data, error } = await supabase
        .from('products')
        .insert([productToDb(product)])
        .select()
        .single();

      if (error) throw error;
      return dbToProduct(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto adicionado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao adicionar produto: ' + error.message);
    },
  });

  const updateProduct = useMutation({
    mutationFn: async (product: Product) => {
      const supabase = await getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase não configurado. Configure as credenciais em /configuracoes');
      }
      
      const { data, error } = await supabase
        .from('products')
        .update(productToDb(product))
        .eq('id', product.id)
        .select()
        .single();

      if (error) throw error;
      return dbToProduct(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar produto: ' + error.message);
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const supabase = await getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase não configurado. Configure as credenciais em /configuracoes');
      }
      
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir produto: ' + error.message);
    },
  });

  const deleteProducts = useMutation({
    mutationFn: async (ids: string[]) => {
      const supabase = await getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase não configurado. Configure as credenciais em /configuracoes');
      }
      
      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produtos excluídos com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir produtos: ' + error.message);
    },
  });

  return {
    products,
    isLoading,
    error,
    addProduct: addProduct.mutate,
    updateProduct: updateProduct.mutate,
    deleteProduct: deleteProduct.mutate,
    deleteProducts: deleteProducts.mutate,
  };
};
