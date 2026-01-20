import { useState, useEffect } from 'react';
import { useSupabase } from '@/features/revendedora/contexts/SupabaseContext';
import { toast } from 'sonner';
import { BankAccount } from './useBankAccounts';

export interface Withdrawal {
  id: string;
  reseller_id: string;
  bank_account_id: string;
  amount: number;
  status: string;
  requested_at: string;
  processed_at: string | null;
  completed_at: string | null;
  transfer_type: string;
  transfer_receipt: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  bank_account?: BankAccount;
}

export interface WithdrawalRequest {
  amount: number;
  bank_account_id: string;
  transfer_type?: string;
}

const MIN_WITHDRAWAL_AMOUNT = 20;

const isTableMissingError = (error: any): boolean => {
  if (!error) return false;
  const code = error.code || '';
  const message = error.message || '';
  const status = error.status || error.statusCode || 0;
  return (
    status === 404 ||
    code === 'PGRST205' ||
    code === 'PGRST301' ||
    code === 'PGRST204' ||
    code === '42P01' ||
    message.toLowerCase().includes('relation') ||
    message.toLowerCase().includes('does not exist') ||
    message.toLowerCase().includes('table')
  );
};

export function useWithdrawals(resellerId: string) {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const { client: supabase, loading: supabaseLoading, configured } = useSupabase();

  const loadWithdrawals = async () => {
    if (supabaseLoading || !configured || !supabase) {
      console.log('[useWithdrawals] Waiting for Supabase client...');
      return;
    }

    if (!resellerId) {
      setLoading(false);
      return;
    }

    try {
      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('reseller_id', resellerId)
        .order('requested_at', { ascending: false });

      if (withdrawalsError) {
        if (isTableMissingError(withdrawalsError)) {
          console.warn('[Withdrawals] Table not found - run SETUP_FINANCIAL_SYSTEM.sql');
          setWithdrawals([]);
          setLoading(false);
          return;
        }
        throw withdrawalsError;
      }

      if (withdrawalsData && withdrawalsData.length > 0) {
        const bankAccountIds = [...new Set(withdrawalsData.map(w => w.bank_account_id))];
        
        const { data: bankAccounts } = await supabase
          .from('bank_accounts')
          .select('*')
          .in('id', bankAccountIds);

        const bankAccountsMap = new Map(
          (bankAccounts || []).map(ba => [ba.id, ba])
        );

        const withdrawalsWithBanks = withdrawalsData.map(w => ({
          ...w,
          bank_account: bankAccountsMap.get(w.bank_account_id),
        }));

        setWithdrawals(withdrawalsWithBanks as Withdrawal[]);
      } else {
        setWithdrawals([]);
      }
    } catch (err: any) {
      console.error('[Withdrawals] Error loading:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (supabaseLoading || !configured || !supabase) return;

    loadWithdrawals();

    const channel = supabase
      .channel('withdrawals_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'withdrawals',
          filter: `reseller_id=eq.${resellerId}`
        },
        () => loadWithdrawals()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [resellerId, supabase, supabaseLoading, configured]);

  const requestWithdrawal = async (
    request: WithdrawalRequest,
    availableBalance: number
  ): Promise<Withdrawal | null> => {
    if (!supabase || !resellerId) return null;

    if (request.amount < MIN_WITHDRAWAL_AMOUNT) {
      toast.error(`O valor mínimo para saque é R$ ${MIN_WITHDRAWAL_AMOUNT.toFixed(2)}`);
      return null;
    }

    if (request.amount > availableBalance) {
      toast.error('Saldo insuficiente para realizar o saque');
      return null;
    }

    setRequesting(true);
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .insert({
          reseller_id: resellerId,
          bank_account_id: request.bank_account_id,
          amount: request.amount,
          status: 'solicitado',
          transfer_type: request.transfer_type || 'pix',
          requested_at: new Date().toISOString(),
        } as any)
        .select()
        .single();

      if (error) throw error;

      toast.success('Solicitação de saque enviada com sucesso!');
      await loadWithdrawals();
      return data as Withdrawal;
    } catch (err: any) {
      console.error('[Withdrawals] Error requesting:', err);
      toast.error('Erro ao solicitar saque');
      return null;
    } finally {
      setRequesting(false);
    }
  };

  const cancelWithdrawal = async (id: string): Promise<boolean> => {
    if (!supabase || !resellerId) return false;

    try {
      const withdrawal = withdrawals.find(w => w.id === id);
      if (!withdrawal) {
        toast.error('Saque não encontrado');
        return false;
      }

      if (withdrawal.status !== 'solicitado') {
        toast.error('Apenas saques com status "Solicitado" podem ser cancelados');
        return false;
      }

      const { error } = await supabase
        .from('withdrawals')
        .update({ 
          status: 'cancelado',
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', id)
        .eq('reseller_id', resellerId);

      if (error) throw error;

      toast.success('Saque cancelado com sucesso');
      await loadWithdrawals();
      return true;
    } catch (err: any) {
      console.error('[Withdrawals] Error canceling:', err);
      toast.error('Erro ao cancelar saque');
      return false;
    }
  };

  const pendingWithdrawals = withdrawals.filter(w => 
    w.status === 'solicitado' || w.status === 'em_processamento'
  );

  const completedWithdrawals = withdrawals.filter(w => w.status === 'concluido');

  const totalPending = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);
  const totalCompleted = completedWithdrawals.reduce((sum, w) => sum + w.amount, 0);

  return {
    withdrawals,
    loading: loading || supabaseLoading || !configured,
    requesting,
    requestWithdrawal,
    cancelWithdrawal,
    refresh: loadWithdrawals,
    pendingWithdrawals,
    completedWithdrawals,
    totalPending,
    totalCompleted,
    MIN_WITHDRAWAL_AMOUNT,
  };
}

export const WITHDRAWAL_STATUS = {
  solicitado: { label: 'Solicitado', color: 'bg-yellow-500' },
  em_processamento: { label: 'Em Processamento', color: 'bg-blue-500' },
  concluido: { label: 'Concluído', color: 'bg-green-500' },
  cancelado: { label: 'Cancelado', color: 'bg-gray-500' },
  rejeitado: { label: 'Rejeitado', color: 'bg-red-500' },
};
