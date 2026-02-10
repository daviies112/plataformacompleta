import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/revendedora/components/ui/card';
import { Button } from '@/features/revendedora/components/ui/button';
import { Badge } from '@/features/revendedora/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/revendedora/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/features/revendedora/components/ui/table';
import { 
  Wallet, 
  Plus, 
  Trash2, 
  Star, 
  Clock, 
  CheckCircle,
  AlertCircle,
  ArrowDownToLine,
  Building2,
  CreditCard,
  TrendingUp,
  Banknote,
  Edit,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { useFinancialSummary } from '@/features/revendedora/hooks/useFinancialSummary';
import { useBankAccounts, BankAccount, BankAccountFormData, ACCOUNT_TYPES } from '@/features/revendedora/hooks/useBankAccounts';
import { useWithdrawals, WITHDRAWAL_STATUS } from '@/features/revendedora/hooks/useWithdrawals';
import { BalanceCard } from '@/features/revendedora/components/financial/BalanceCard';
import { FutureBalanceList } from '@/features/revendedora/components/financial/FutureBalanceList';
import { BankAccountForm } from '@/features/revendedora/components/financial/BankAccountForm';
import { WithdrawalModal } from '@/features/revendedora/components/financial/WithdrawalModal';
import { SplitService } from '@/features/revendedora/services/SplitService';
import { ResellerBankSetup } from '@/features/revendedora/components/financial/ResellerBankSetup';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/features/revendedora/components/ui/alert-dialog';
import { getResellerId as getStoredResellerId } from '@/features/revendedora/lib/resellerAuth';

export default function Financial() {
  const getResellerId = (): string | null => {
    const storedReseller = getStoredResellerId();
    if (storedReseller) return storedReseller;
    console.error('[Financial] Reseller ID não encontrado no localStorage');
    return null;
  };

  const resellerId = getResellerId();
  
  if (!resellerId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg text-muted-foreground mb-2">Erro de autenticação</p>
          <p className="text-sm text-muted-foreground">Por favor, faça login novamente</p>
        </div>
      </div>
    );
  }
  
  const {
    availableBalance,
    pendingBalance,
    futureBalance,
    totalEarned,
    totalWithdrawn,
    futureSales,
    loading: financialLoading,
  } = useFinancialSummary(resellerId);

  const {
    bankAccounts,
    loading: bankAccountsLoading,
    saving: bankAccountSaving,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    setPrimaryAccount,
  } = useBankAccounts(resellerId);

  const {
    withdrawals,
    loading: withdrawalsLoading,
    requesting,
    requestWithdrawal,
    cancelWithdrawal,
    totalPending: pendingWithdrawalAmount,
    MIN_WITHDRAWAL_AMOUNT,
  } = useWithdrawals(resellerId);

  const [bankAccountFormOpen, setBankAccountFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false);
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null);
  const [cancelWithdrawalId, setCancelWithdrawalId] = useState<string | null>(null);

  const handleAddBankAccount = async (data: BankAccountFormData) => {
    await addBankAccount(data);
  };

  const handleEditBankAccount = async (data: BankAccountFormData) => {
    if (!editingAccount) return;
    await updateBankAccount(editingAccount.id, data);
    setEditingAccount(null);
  };

  const handleDeleteBankAccount = async () => {
    if (!deleteAccountId) return;
    await deleteBankAccount(deleteAccountId);
    setDeleteAccountId(null);
  };

  const handleRequestWithdrawal = async (amount: number, bankAccountId: string, transferType: string) => {
    await requestWithdrawal({ amount, bank_account_id: bankAccountId, transfer_type: transferType }, availableBalance);
  };

  const handleCancelWithdrawal = async () => {
    if (!cancelWithdrawalId) return;
    await cancelWithdrawal(cancelWithdrawalId);
    setCancelWithdrawalId(null);
  };

  const loading = financialLoading || bankAccountsLoading || withdrawalsLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getAccountTypeLabel = (type: string) => {
    return ACCOUNT_TYPES.find(t => t.value === type)?.label || type;
  };

  const getStatusBadge = (status: string) => {
    const statusInfo = WITHDRAWAL_STATUS[status as keyof typeof WITHDRAWAL_STATUS] || {
      label: status,
      color: 'bg-gray-500',
    };
    return (
      <Badge className={`${statusInfo.color} hover:${statusInfo.color}`}>
        {statusInfo.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground">Gerencie seus ganhos e saques</p>
        </div>
        <Button 
          onClick={() => setWithdrawalModalOpen(true)}
          disabled={availableBalance < MIN_WITHDRAWAL_AMOUNT || bankAccounts.length === 0}
        >
          <ArrowDownToLine className="h-4 w-4 mr-2" />
          Solicitar Saque
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <BalanceCard
          title="Saldo Disponível"
          amount={availableBalance}
          icon={CheckCircle}
          iconColor="text-green-500"
          amountColor="text-green-600"
          description="Disponível para saque"
          tooltip="Valores já liberados e disponíveis para saque imediato"
        />
        
        <BalanceCard
          title="A Liberar"
          amount={futureBalance}
          icon={Clock}
          iconColor="text-orange-500"
          amountColor="text-orange-600"
          description="Aguardando prazo"
          tooltip="PIX: D+1 | Cartão: D+30. Valores são liberados após o prazo do método de pagamento"
        />

        <BalanceCard
          title="Aguardando Pagamento"
          amount={pendingBalance}
          icon={AlertCircle}
          iconColor="text-yellow-500"
          amountColor="text-yellow-600"
          description="Vendas não pagas"
          tooltip="Vendas realizadas que ainda não foram pagas pelo cliente"
        />

        <BalanceCard
          title="Total Ganho"
          amount={totalEarned}
          icon={TrendingUp}
          iconColor="text-primary"
          amountColor="text-primary"
          description="Comissões recebidas"
          badge={`${withdrawals.filter(w => w.status === 'concluido').length} saques`}
        />
      </div>

      {pendingWithdrawalAmount > 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium">Saques em Processamento</p>
                <p className="text-sm text-muted-foreground">
                  Você tem saques aguardando processamento
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-blue-600">
                {SplitService.formatCurrency(pendingWithdrawalAmount)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="bank-accounts">Contas Bancárias</TabsTrigger>
          <TabsTrigger value="withdrawals">Histórico de Saques</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <FutureBalanceList sales={futureSales as any} />
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Conta Principal
                </CardTitle>
                <CardDescription>
                  Conta utilizada para receber os saques
                </CardDescription>
              </CardHeader>
              <CardContent>
                {bankAccounts.length === 0 ? (
                  <div className="text-center py-6">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Você ainda não cadastrou uma conta bancária
                    </p>
                    <Button onClick={() => setBankAccountFormOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Conta
                    </Button>
                  </div>
                ) : (
                  <>
                    {bankAccounts.filter(a => a.is_primary).map(account => (
                      <div key={account.id} className="bg-muted/30 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold">{account.bank_name}</p>
                              <Badge variant="secondary" className="text-[10px]">
                                <Star className="h-3 w-3 mr-1" />
                                Principal
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Ag: {account.agency} | Conta: {account.account_number}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {getAccountTypeLabel(account.account_type)}
                            </p>
                            <p className="text-sm mt-2">{account.holder_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {account.holder_document}
                            </p>
                            {account.pix_key && (
                              <p className="text-sm text-muted-foreground mt-1">
                                <Wallet className="h-3 w-3 inline mr-1" />
                                PIX: {account.pix_key}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingAccount(account);
                              setBankAccountFormOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {bankAccounts.filter(a => a.is_primary).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma conta definida como principal.
                        <Button
                          variant="link"
                          className="px-1"
                          onClick={() => bankAccounts[0] && setPrimaryAccount(bankAccounts[0].id)}
                        >
                          Definir agora
                        </Button>
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Como funciona a liberação de valores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                  <Wallet className="h-8 w-8 text-green-500 flex-shrink-0" />
                  <div>
                    <p className="font-medium">PIX</p>
                    <p className="text-sm text-muted-foreground">
                      Liberado em <span className="font-semibold">D+1</span> (1 dia após o pagamento)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                  <CreditCard className="h-8 w-8 text-blue-500 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Cartão de Crédito</p>
                    <p className="text-sm text-muted-foreground">
                      Liberado em <span className="font-semibold">D+30</span> (30 dias após o pagamento)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <Banknote className="h-8 w-8 text-gray-500 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Dinheiro</p>
                    <p className="text-sm text-muted-foreground">
                      Liberado <span className="font-semibold">imediatamente</span> (D+0)
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bank-accounts" className="space-y-6">
          <ResellerBankSetup resellerId={resellerId} />
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Contas Bancárias para Saques</CardTitle>
                <CardDescription>Gerencie suas contas adicionais para saque</CardDescription>
              </div>
              <Button onClick={() => setBankAccountFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Conta
              </Button>
            </CardHeader>
            <CardContent>
              {bankAccounts.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">
                    Nenhuma conta cadastrada
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Adicione uma conta bancária para poder solicitar saques
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Banco</TableHead>
                      <TableHead>Agência/Conta</TableHead>
                      <TableHead>Titular</TableHead>
                      <TableHead>Chave PIX</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bankAccounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{account.bank_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {getAccountTypeLabel(account.account_type)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          Ag: {account.agency} | Conta: {account.account_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p>{account.holder_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {account.holder_document}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {account.pix_key || '-'}
                        </TableCell>
                        <TableCell>
                          {account.is_primary ? (
                            <Badge className="bg-primary">
                              <Star className="h-3 w-3 mr-1" />
                              Principal
                            </Badge>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPrimaryAccount(account.id)}
                            >
                              Definir como principal
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingAccount(account);
                                setBankAccountFormOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteAccountId(account.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Saques</CardTitle>
              <CardDescription>
                Acompanhe o status das suas solicitações de saque
              </CardDescription>
            </CardHeader>
            <CardContent>
              {withdrawals.length === 0 ? (
                <div className="text-center py-12">
                  <ArrowDownToLine className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">
                    Nenhum saque realizado
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Seus saques aparecerão aqui
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Conta</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.map((withdrawal) => (
                      <TableRow key={withdrawal.id}>
                        <TableCell>
                          {withdrawal.requested_at 
                            ? format(new Date(withdrawal.requested_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                            : '-'}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {SplitService.formatCurrency(withdrawal.amount)}
                        </TableCell>
                        <TableCell>
                          {withdrawal.bank_account ? (
                            <div>
                              <p className="font-medium">{withdrawal.bank_account.bank_name}</p>
                              <p className="text-xs text-muted-foreground">
                                Ag: {withdrawal.bank_account.agency} | Conta: {withdrawal.bank_account.account_number}
                              </p>
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {withdrawal.transfer_type === 'pix' ? 'PIX' : withdrawal.transfer_type?.toUpperCase() || '-'}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(withdrawal.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          {withdrawal.status === 'solicitado' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setCancelWithdrawalId(withdrawal.id)}
                            >
                              Cancelar
                            </Button>
                          )}
                          {withdrawal.status === 'concluido' && withdrawal.completed_at && (
                            <span className="text-xs text-muted-foreground">
                              Pago em {format(new Date(withdrawal.completed_at), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <BankAccountForm
        open={bankAccountFormOpen}
        onOpenChange={(open) => {
          setBankAccountFormOpen(open);
          if (!open) setEditingAccount(null);
        }}
        onSubmit={editingAccount ? handleEditBankAccount : handleAddBankAccount}
        initialData={editingAccount || undefined}
        isEditing={!!editingAccount}
        saving={bankAccountSaving}
      />

      <WithdrawalModal
        open={withdrawalModalOpen}
        onOpenChange={setWithdrawalModalOpen}
        onSubmit={handleRequestWithdrawal}
        bankAccounts={bankAccounts}
        availableBalance={availableBalance}
        minAmount={MIN_WITHDRAWAL_AMOUNT}
        requesting={requesting}
      />

      <AlertDialog open={!!deleteAccountId} onOpenChange={() => setDeleteAccountId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover conta bancária?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A conta será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBankAccount}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!cancelWithdrawalId} onOpenChange={() => setCancelWithdrawalId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar solicitação de saque?</AlertDialogTitle>
            <AlertDialogDescription>
              O valor será devolvido ao seu saldo disponível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelWithdrawal}>
              Cancelar Saque
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
