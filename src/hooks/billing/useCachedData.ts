import { useState, useEffect } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Hook para gerenciar dados em cache com localStorage
 * Os dados são salvos no localStorage e só recarregados quando explicitamente solicitado
 */
export function useCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [shouldRefresh, setShouldRefresh] = useState(false);

  // Carregar dados do cache ou buscar se não existir
  useEffect(() => {
    const loadData = async () => {
      // Primeiro tenta carregar do localStorage
      const cached = localStorage.getItem(key);
      
      if (cached && !shouldRefresh) {
        try {
          const entry: CacheEntry<T> = JSON.parse(cached);
          console.log(`📦 ${key} carregados do cache (${new Date(entry.timestamp).toLocaleString()})`);
          setData(entry.data);
          return;
        } catch (e) {
          console.error(`❌ Erro ao carregar cache de ${key}:`, e);
        }
      }

      // Se não tiver cache ou for refresh, busca novos dados
      if (!cached || shouldRefresh) {
        setIsLoading(true);
        try {
          console.log(`🔄 Buscando ${key}...`);
          const newData = await fetchFn();
          
          const entry: CacheEntry<T> = {
            data: newData,
            timestamp: Date.now(),
          };
          
          localStorage.setItem(key, JSON.stringify(entry));
          setData(newData);
          console.log(`✅ ${key} salvos no cache`);
        } catch (error) {
          console.error(`❌ Erro ao buscar ${key}:`, error);
        } finally {
          setIsLoading(false);
          setShouldRefresh(false);
        }
      }
    };

    loadData();
  }, [key, shouldRefresh, ...dependencies]);

  const refresh = () => {
    setShouldRefresh(true);
  };

  const clearCache = () => {
    localStorage.removeItem(key);
    setData(null);
  };

  return { data, isLoading, refresh, clearCache };
}
