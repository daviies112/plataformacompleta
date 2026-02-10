import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Wallet } from 'lucide-react';
import { BankAccount } from '@/hooks/useBankAccounts';
import { SplitService } from '@/services/SplitService';

interface WithdrawalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (amount: number, bankAccountId: string, transferType: string) => Promise<void>;
  bankAccounts: BankAccount[];
  availableBalance: number;
  minAmount: number;
  requesting?: boolean;
}

export function WithdrawalModal({
  open,
  onOpenChange,
  onSubmit,
  bankAccounts,
  availableBalance,
  minAmount,
  requesting = false,
}: WithdrawalModalProps) {
  const [amount, setAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [transferType, setTransferType] = useState('pix');

  const parsedAmount = parseFloat(amount.replace(',', '.')) || 0;
  const isValidAmount = parsedAmount >= minAmount && parsedAmount <= availableBalance;
  const hasAccounts = bankAccounts.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidAmount || !selectedAccountId) return;
    
    await onSubmit(parsedAmount, selectedAccountId, transferType);
    setAmount('');
    onOpenChange(false);
  };

  const handleAmountChange = (value: string) => {
    const cleaned = value.replace(/[^\d,]/g, '');
    setAmount(cleaned);
  };

  const setMaxAmount = () => {
    setAmount(availableBalance.toFixed(2).replace('.', ','));
  };

  const selectedAccount = bankAccounts.find(a => a.id === selectedAccountId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Solicitar Saque
          </DialogTitle>
          <DialogDescription>
            Informe o valor e a conta para receber o saque.
          </DialogDescription>
        </DialogHeader>

        {!hasAccounts ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Você precisa cadastrar uma conta bancária antes de solicitar um saque.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">Saldo Disponível</p>
                <p className="text-2xl font-bold text-green-600">
                  {SplitService.formatCurrency(availableBalance)}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="amount">Valor do Saque</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    R$
                  </span>
                  <Input
                    id="amount"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="0,00"
                    className="pl-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs"
                    onClick={setMaxAmount}
                  >
                    Máximo
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Valor mínimo: {SplitService.formatCurrency(minAmount)}
                </p>
                {parsedAmount > 0 && parsedAmount < minAmount && (
                  <p className="text-xs text-destructive">
                    O valor mínimo para saque é {SplitService.formatCurrency(minAmount)}
                  </p>
                )}
                {parsedAmount > availableBalance && (
                  <p className="text-xs text-destructive">
                    Saldo insuficiente
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="account">Conta para Recebimento</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex flex-col">
                          <span>{account.bank_name}</span>
                          <span className="text-xs text-muted-foreground">
                            Ag: {account.agency} | Conta: {account.account_number}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedAccount && (
                <div className="bg-muted/30 rounded-lg p-3 text-sm">
                  <p className="font-medium">{selectedAccount.bank_name}</p>
                  <p className="text-muted-foreground">
                    Ag: {selectedAccount.agency} | Conta: {selectedAccount.account_number}
                  </p>
                  <p className="text-muted-foreground">{selectedAccount.holder_name}</p>
                  {selectedAccount.pix_key && (
                    <p className="text-muted-foreground">
                      PIX: {selectedAccount.pix_key}
                    </p>
                  )}
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="transfer_type">Forma de Transferência</Label>
                <Select value={transferType} onValueChange={setTransferType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX (Instantâneo)</SelectItem>
                    <SelectItem value="ted">TED (Até 1 dia útil)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={!isValidAmount || !selectedAccountId || requesting}
              >
                {requesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Solicitar Saque
              </Button>
            </DialogFooter>
          </form>
        )}

        {!hasAccounts && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
