import { useQuery } from '@tanstack/react-query';

export interface SupabaseFile {
  id: string;
  user_id?: string;
  file_name: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  type?: 'receipt' | 'manual';
  category?: string;
  amount?: string;
  date?: string;
  description?: string;
  establishment?: string;
  due_date?: string;
  metadata?: any;
  status?: string;
  processing_status?: string;
  created_at: string;
  updated_at: string;
}

async function fetchSupabaseFiles(): Promise<SupabaseFile[]> {
  try {
    const response = await fetch('/api/supabase/files');
    
    if (!response.ok) {
      const error = await response.json();
      console.warn('⚠️ Erro ao buscar arquivos do Supabase:', error);
      return [];
    }
    
    const data = await response.json();
    console.log(`✅ ${data.length} arquivo(s) do Supabase carregados`);
    return data;
  } catch (error) {
    console.error('❌ Erro ao buscar arquivos do Supabase:', error);
    return [];
  }
}

export function useSupabaseFiles() {
  return useQuery({
    queryKey: ['supabase-files'],
    queryFn: fetchSupabaseFiles,
    refetchInterval: 30000, // Atualiza a cada 30 segundos
    staleTime: 15000, // Considera stale após 15 segundos
  });
}
