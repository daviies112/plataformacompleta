import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Wallet, AlertCircle, Loader2 } from 'lucide-react';
import { Link } from 'wouter';

interface WalletBalance {
  balance: number;
  currency: string;
  isFrozen: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function WalletBadge() {
  const { data: wallet, isLoading, error } = useQuery<WalletBalance>({
    queryKey: ['/api/wallet/balance'],
    refetchInterval: 30000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <Badge variant="outline" className="gap-1 px-2 py-1">
        <Loader2 className="w-3 h-3 animate-spin" />
      </Badge>
    );
  }

  if (error || !wallet) {
    return null;
  }

  const balanceClass = wallet.balance < 10 
    ? 'bg-red-500/20 text-red-600 border-red-500/30 hover:bg-red-500/30' 
    : wallet.balance < 50 
      ? 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/30' 
      : 'bg-green-500/20 text-green-600 border-green-500/30 hover:bg-green-500/30';

  return (
    <Link href="/financeiro">
      <Badge 
        className={`gap-1 px-2 py-1 cursor-pointer transition-colors ${balanceClass}`}
        data-testid="badge-wallet-balance"
      >
        {wallet.isFrozen ? (
          <AlertCircle className="w-3 h-3" />
        ) : (
          <Wallet className="w-3 h-3" />
        )}
        {formatCurrency(wallet.balance)}
      </Badge>
    </Link>
  );
}
