import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchWithPluggyAuth } from "@/lib/pluggyClient";
import { Transaction, Bill } from "@/lib/financialUtils";

interface Item {
  id: string;
  connector_id: number;
  connector_name: string;
  status: string;
  execution_status: string;
  created_at: string;
  updated_at: string;
}

interface Account {
  id: string;
  type: string;
  name: string;
  balance: number;
  currencyCode: string;
  itemId: string;
}

interface HybridInvoice {
  mes: string;
  ano: number;
  mesKey: string;
  valor: number;
  fonte: 'bill' | 'calculado';
  transacoes?: number;
  detalhes?: string;
}

export function useItems() {
  return useQuery({
    queryKey: ['/api/items'],
    queryFn: async () => {
      try {
        console.log('🔄 useItems: Iniciando busca de items...');
        
        const syncRes = await fetchWithPluggyAuth('/api/sync-items', { method: 'POST' });
        if (syncRes.ok) {
          const syncData = await syncRes.json();
          console.log(`✨ Sincronização completa:`, syncData);
        } else {
          console.warn('⚠️ Sincronização falhou, mas continuando...');
        }

        console.log('📡 Buscando items do banco...');
        const res = await fetch('/api/items');
        if (!res.ok) {
          console.error('❌ Erro ao buscar items:', res.status, res.statusText);
          throw new Error('Failed to fetch items');
        }
        const data = await res.json();
        console.log(`📦 ${data.length} item(s) carregados do cache:`, data);
        return data as Item[];
      } catch (error) {
        console.error('❌ Erro completo no useItems:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAccounts(itemId: string | null) {
  return useQuery({
    queryKey: itemId ? [`/api/pluggy/items/${itemId}/accounts`] : null,
    queryFn: async () => {
      if (!itemId) return [];
      const res = await fetchWithPluggyAuth(`/api/pluggy/items/${itemId}/accounts`);
      if (!res.ok) throw new Error('Failed to fetch accounts');
      const data = await res.json();
      console.log(`🏦 ${data.length} conta(s) carregadas do cache`);
      return data as Account[];
    },
    enabled: !!itemId,
    staleTime: Infinity,
  });
}

export function useTransactions(accountId: string | null) {
  return useQuery({
    queryKey: accountId ? [`/api/pluggy/transactions/${accountId}`] : null,
    queryFn: async () => {
      if (!accountId) return [];
      
      const allTransactions: Transaction[] = [];
      let currentPage = 1;
      const maxPages = 20;
      
      while (currentPage <= maxPages) {
        const res = await fetchWithPluggyAuth(
          `/api/pluggy/transactions?accountId=${accountId}&page=${currentPage}`
        );
        
        if (!res.ok) break;
        
        const data = await res.json();
        const transactions = data.results || [];
        
        if (transactions.length === 0) break;
        
        allTransactions.push(...transactions);
        
        if (currentPage >= data.totalPages) break;
        currentPage++;
      }
      
      console.log(`✅ ${allTransactions.length} transações carregadas do cache`);
      return allTransactions;
    },
    enabled: !!accountId,
    staleTime: Infinity,
  });
}

export function useBills(accountId: string | null) {
  return useQuery({
    queryKey: accountId ? [`/api/pluggy/bills/${accountId}`] : null,
    queryFn: async () => {
      if (!accountId) return [];
      
      const res = await fetchWithPluggyAuth(`/api/pluggy/bills?accountId=${accountId}`);
      if (!res.ok) return [];
      
      const data = await res.json();
      const bills = data.results || [];
      console.log(`📊 ${bills.length} faturas (bills) carregadas do cache`);
      return bills as Bill[];
    },
    enabled: !!accountId,
    staleTime: Infinity,
  });
}

export function useHybridInvoices(accountId: string | null) {
  return useQuery({
    queryKey: accountId ? [`/api/pluggy/faturas-hibridas/${accountId}`] : null,
    queryFn: async () => {
      if (!accountId) return [];
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetchWithPluggyAuth(`/api/pluggy/faturas-hibridas/${accountId}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) return [];
      
      const data = await response.json();
      console.log(`✅ ${data.faturas?.length || 0} faturas híbridas carregadas do cache`);
      return (data.faturas || []) as HybridInvoice[];
    },
    enabled: !!accountId,
    staleTime: Infinity,
  });
}

export function useRefreshData() {
  const queryClient = useQueryClient();
  
  return {
    refreshAll: () => {
      console.log('🔄 Invalidando todos os caches...');
      queryClient.invalidateQueries();
    },
    refreshItems: () => {
      console.log('🔄 Invalidando cache de items...');
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
    },
    refreshAccounts: (itemId: string) => {
      console.log('🔄 Invalidando cache de contas...');
      queryClient.invalidateQueries({ queryKey: [`/api/pluggy/items/${itemId}/accounts`] });
    },
    refreshTransactions: (accountId: string) => {
      console.log('🔄 Invalidando cache de transações...');
      queryClient.invalidateQueries({ queryKey: [`/api/pluggy/transactions/${accountId}`] });
    },
    refreshInvoices: (accountId: string) => {
      console.log('🔄 Invalidando cache de faturas...');
      queryClient.invalidateQueries({ queryKey: [`/api/pluggy/faturas-hibridas/${accountId}`] });
    },
  };
}
