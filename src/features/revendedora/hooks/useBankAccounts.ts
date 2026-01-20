import { useState, useEffect } from 'react';
import { useSupabase } from '@/features/revendedora/contexts/SupabaseContext';
import { toast } from 'sonner';

export interface BankAccount {
  id: string;
  reseller_id: string;
  bank_name: string;
  bank_code: string | null;
  agency: string;
  account_number: string;
  account_type: string;
  holder_name: string;
  holder_document: string;
  pix_key: string | null;
  pix_key_type: string | null;
  is_primary: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface BankAccountFormData {
  bank_name: string;
  bank_code?: string;
  agency: string;
  account_number: string;
  account_type: string;
  holder_name: string;
  holder_document: string;
  pix_key?: string;
  pix_key_type?: string;
  is_primary?: boolean;
}

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

export function useBankAccounts(resellerId: string) {
  const { client: supabase, loading: supabaseLoading, configured } = useSupabase();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadBankAccounts = async () => {
    if (supabaseLoading || !configured || !supabase) {
      console.log('[useBankAccounts] Waiting for Supabase client...');
      return;
    }
    if (!resellerId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('reseller_id', resellerId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        if (isTableMissingError(error)) {
          console.warn('[BankAccounts] Table not found - run SETUP_FINANCIAL_SYSTEM.sql');
          setBankAccounts([]);
          setLoading(false);
          return;
        }
        throw error;
      }
      setBankAccounts((data || []) as BankAccount[]);
    } catch (err: any) {
      console.error('[BankAccounts] Error loading:', err);
      setBankAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (supabaseLoading || !configured || !supabase) return;
    loadBankAccounts();
  }, [resellerId, supabase, supabaseLoading, configured]);

  const addBankAccount = async (data: BankAccountFormData): Promise<BankAccount | null> => {
    if (!supabase || !resellerId) return null;

    setSaving(true);
    try {
      if (data.is_primary) {
        await supabase
          .from('bank_accounts')
          .update({ is_primary: false } as any)
          .eq('reseller_id', resellerId);
      }

      const { data: newAccount, error } = await supabase
        .from('bank_accounts')
        .insert({
          reseller_id: resellerId,
          bank_name: data.bank_name,
          bank_code: data.bank_code || null,
          agency: data.agency,
          account_number: data.account_number,
          account_type: data.account_type,
          holder_name: data.holder_name,
          holder_document: data.holder_document,
          pix_key: data.pix_key || null,
          pix_key_type: data.pix_key_type || null,
          is_primary: data.is_primary || bankAccounts.length === 0,
        } as any)
        .select()
        .single();

      if (error) throw error;

      toast.success('Conta bancária adicionada com sucesso');
      await loadBankAccounts();
      return newAccount as BankAccount;
    } catch (err: any) {
      console.error('[BankAccounts] Error adding:', err);
      toast.error('Erro ao adicionar conta bancária');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const updateBankAccount = async (id: string, data: Partial<BankAccountFormData>): Promise<boolean> => {
    if (!supabase || !resellerId) return false;

    setSaving(true);
    try {
      if (data.is_primary) {
        await supabase
          .from('bank_accounts')
          .update({ is_primary: false } as any)
          .eq('reseller_id', resellerId);
      }

      const { error } = await supabase
        .from('bank_accounts')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', id)
        .eq('reseller_id', resellerId);

      if (error) throw error;

      toast.success('Conta bancária atualizada com sucesso');
      await loadBankAccounts();
      return true;
    } catch (err: any) {
      console.error('[BankAccounts] Error updating:', err);
      toast.error('Erro ao atualizar conta bancária');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deleteBankAccount = async (id: string): Promise<boolean> => {
    if (!supabase || !resellerId) return false;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', id)
        .eq('reseller_id', resellerId);

      if (error) throw error;

      toast.success('Conta bancária removida com sucesso');
      await loadBankAccounts();
      return true;
    } catch (err: any) {
      console.error('[BankAccounts] Error deleting:', err);
      toast.error('Erro ao remover conta bancária');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const setPrimaryAccount = async (id: string): Promise<boolean> => {
    return updateBankAccount(id, { is_primary: true });
  };

  return {
    bankAccounts,
    loading: loading || supabaseLoading || !configured,
    saving,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    setPrimaryAccount,
    refresh: loadBankAccounts,
  };
}

export const BRAZILIAN_BANKS = [
  { code: '001', name: 'Banco do Brasil' },
  { code: '033', name: 'Santander' },
  { code: '104', name: 'Caixa Econômica Federal' },
  { code: '237', name: 'Bradesco' },
  { code: '341', name: 'Itaú Unibanco' },
  { code: '260', name: 'Nubank' },
  { code: '077', name: 'Inter' },
  { code: '212', name: 'Banco Original' },
  { code: '336', name: 'C6 Bank' },
  { code: '290', name: 'PagBank' },
  { code: '380', name: 'PicPay' },
  { code: '323', name: 'Mercado Pago' },
  { code: '403', name: 'Cora' },
  { code: '756', name: 'Sicoob' },
  { code: '748', name: 'Sicredi' },
  { code: '422', name: 'Safra' },
  { code: '655', name: 'Neon' },
  { code: '208', name: 'BTG Pactual' },
  { code: '746', name: 'Modal' },
  { code: '000', name: 'Outro' },
];

export const PIX_KEY_TYPES = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'E-mail' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'aleatoria', label: 'Chave Aleatória' },
];

export const ACCOUNT_TYPES = [
  { value: 'corrente', label: 'Conta Corrente' },
  { value: 'poupanca', label: 'Conta Poupança' },
];
