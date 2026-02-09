import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { BottomNav } from "@/components/mobile/BottomNav";
import { HorizontalScrollCards, ScrollCard } from "@/components/mobile/HorizontalScrollCards";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Wallet, 
  TrendingUp, 
  PieChart as PieChartIcon, 
  Calendar, 
  Filter,
  Plus,
  Building2,
  CreditCard,
  Receipt,
  Upload,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Tag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useItems, useAccounts, useTransactions, useBills } from "@/hooks/useBankingData";
import { getFinancialSummary, groupTransactionsByMonth, getCategorySpending, formatCurrency, formatDate } from "@/lib/financialUtils";
import SummaryCards from "@/components/SummaryCards";
import MonthlySpendingBarChart from "@/components/MonthlySpendingBarChart";
import CategoryPieChart from "@/components/CategoryPieChart";
import SpendingTrendAreaChart from "@/components/SpendingTrendAreaChart";
import TransactionsTable from "@/components/TransactionsTable";
import BillsTable from "@/components/BillsTable";
import PluggyModal from "@/components/PluggyModal";
import { ImageUploader } from "@/components/ImageUploader";
import { translateCategory } from "@/lib/translations";

export default function Billing() {
  const isMobile = useIsMobile();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showPluggyModal, setShowPluggyModal] = useState(false);
  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const [showFiltersSheet, setShowFiltersSheet] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summary: true,
    charts: true,
    transactions: true,
    bills: true,
  });

  const { data: items = [], isLoading: itemsLoading } = useItems();
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts(selectedItemId);
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions(selectedAccountId);
  const { data: bills = [], isLoading: billsLoading } = useBills(selectedAccountId);

  const financialSummary = selectedAccountId ? getFinancialSummary(transactions) : null;
  const monthlyInvoices = selectedAccountId ? groupTransactionsByMonth(transactions, bills) : [];
  const categorySpending = selectedAccountId ? getCategorySpending(transactions) : [];

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const MobileSummaryCard = ({ icon: Icon, label, value, subtext, variant = "default" }: any) => (
    <ScrollCard width="280px">
      <Card className="p-6 h-full bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icon className="h-5 w-5" />
            <span className="text-sm font-medium">{label}</span>
          </div>
          <p className={cn(
            "text-2xl font-bold",
            variant === "income" && "text-green-500",
            variant === "expense" && "text-red-500"
          )}>{value}</p>
          {subtext && (
            <p className="text-xs text-muted-foreground">{subtext}</p>
          )}
        </div>
      </Card>
    </ScrollCard>
  );

  const MobileTransactionCard = ({ transaction }: any) => (
    <Card className="p-4 mb-3 active:scale-[0.98] transition-transform touch-manipulation">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium truncate">{transaction.merchant?.name || transaction.description}</p>
            {transaction.type && (
              <Badge variant={transaction.type === 'DEBIT' ? 'destructive' : 'secondary'} className="text-xs">
                {transaction.type === 'DEBIT' ? 'Débito' : 'Crédito'}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(transaction.date)}</span>
            {transaction.category && (
              <>
                <span>•</span>
                <Tag className="h-3 w-3" />
                <span className="truncate">{translateCategory(transaction.category)}</span>
              </>
            )}
          </div>
          {transaction.creditCardMetadata?.installmentNumber && (
            <p className="text-xs text-muted-foreground mt-1">
              Parcela {transaction.creditCardMetadata.installmentNumber}/{transaction.creditCardMetadata.totalInstallments}
            </p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className={cn(
            "font-bold text-base",
            transaction.amount < 0 ? "text-red-500" : "text-green-500"
          )}>
            {transaction.amount < 0 ? (
              <span className="inline-flex items-center gap-1">
                <ArrowDownRight className="h-4 w-4" />
                {formatCurrency(Math.abs(transaction.amount), transaction.currencyCode)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <ArrowUpRight className="h-4 w-4" />
                {formatCurrency(transaction.amount, transaction.currencyCode)}
              </span>
            )}
          </p>
        </div>
      </div>
    </Card>
  );

  if (itemsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Carregando dados financeiros...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={cn("min-h-screen", isMobile ? "pb-24" : "")}>
        {isMobile && (
          <div className="px-4 pb-2">
            <h1 className="text-2xl font-bold text-foreground">Finanças</h1>
          </div>
        )}
        
        <div className="container mx-auto px-4 md:px-6 lg:px-8 pt-0 py-6 md:py-8">
          <Card className="p-8 md:p-12 text-center bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <div className="max-w-md mx-auto space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Conecte sua Conta Bancária</h2>
                <p className="text-muted-foreground">
                  Gerencie suas finanças de forma inteligente com Open Banking via Pluggy.ai
                </p>
              </div>

              <div className="space-y-3 text-left bg-card/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-green-500">✓</div>
                  <div>
                    <p className="font-medium">Conexão Segura</p>
                    <p className="text-sm text-muted-foreground">Criptografia de ponta a ponta</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-green-500">✓</div>
                  <div>
                    <p className="font-medium">Análise Automática</p>
                    <p className="text-sm text-muted-foreground">Categorização de gastos e insights</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-green-500">✓</div>
                  <div>
                    <p className="font-medium">Dados em Tempo Real</p>
                    <p className="text-sm text-muted-foreground">Transações e faturas atualizadas</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setShowPluggyModal(true)}
                size="lg"
                className={cn(
                  "w-full font-semibold gap-2 touch-manipulation active:scale-95 transition-transform",
                  isMobile && "min-h-[48px]"
                )}
              >
                <Plus className="h-5 w-5" />
                Conectar Conta Bancária
              </Button>
            </div>
          </Card>
        </div>

        {isMobile && <BottomNav />}
        <PluggyModal open={showPluggyModal} onClose={() => setShowPluggyModal(false)} />
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-background", isMobile ? "pb-24" : "")}>
      {isMobile && (
        <div className="px-4 pb-2">
          <h1 className="text-2xl font-bold text-foreground">Finanças</h1>
        </div>
      )}

      <div className="container mx-auto px-4 md:px-6 lg:px-8 pt-0 py-4 md:py-6 space-y-4 md:space-y-6">
        <div className={cn(
          "flex flex-col gap-4",
          !isMobile && "md:flex-row md:items-center md:justify-between"
        )}>
          <div>
            {!isMobile && <h1 className="text-3xl font-bold mb-2">Sistema de Faturamento</h1>}
            <p className="text-muted-foreground text-sm md:text-base">
              Gestão financeira completa com Open Banking
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPluggyModal(true)}
              className={cn(
                "gap-2 touch-manipulation active:scale-95 transition-transform",
                isMobile && "flex-1 min-h-[44px]"
              )}
            >
              <Plus className="h-4 w-4" />
              Nova Conexão
            </Button>
            <Button
              variant="default"
              onClick={() => setShowUploadSheet(true)}
              className={cn(
                "gap-2 touch-manipulation active:scale-95 transition-transform",
                isMobile && "flex-1 min-h-[44px]"
              )}
            >
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          </div>
        </div>

        <Tabs defaultValue={selectedItemId || items[0]?.id} onValueChange={setSelectedItemId} className="w-full">
          <TabsList className={cn(
            "w-full grid gap-2",
            isMobile ? "grid-cols-1" : `grid-cols-${Math.min(items.length, 4)}`
          )}>
            {items.map((item) => (
              <TabsTrigger
                key={item.id}
                value={item.id}
                className={cn(
                  "touch-manipulation active:scale-95 transition-transform",
                  isMobile && "min-h-[44px] justify-start"
                )}
              >
                <Building2 className="h-4 w-4 mr-2" />
                {item.connector_name}
              </TabsTrigger>
            ))}
          </TabsList>

          {items.map((item) => (
            <TabsContent key={item.id} value={item.id} className="space-y-4 md:space-y-6 mt-4">
              {!accountsLoading && accounts.length > 0 && (
                <div className="space-y-3">
                  <label className="text-sm font-medium">Selecione a Conta</label>
                  <div className={cn(
                    "grid gap-3",
                    isMobile ? "grid-cols-1" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                  )}>
                    {accounts.map((account) => (
                      <Card
                        key={account.id}
                        onClick={() => setSelectedAccountId(account.id)}
                        className={cn(
                          "p-4 cursor-pointer transition-all touch-manipulation active:scale-95",
                          isMobile && "min-h-[56px]",
                          selectedAccountId === account.id
                            ? "border-primary bg-primary/5 shadow-md"
                            : "hover:border-primary/50 hover:bg-primary/5"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            account.type === 'CREDIT' ? "bg-purple-500/10" : "bg-blue-500/10"
                          )}>
                            <CreditCard className={cn(
                              "h-5 w-5",
                              account.type === 'CREDIT' ? "text-purple-500" : "text-blue-500"
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{account.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{account.type.toLowerCase()}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {selectedAccountId && financialSummary && (
                <>
                  <Collapsible
                    open={expandedSections.summary}
                    onOpenChange={() => toggleSection('summary')}
                  >
                    <CollapsibleTrigger className={cn(
                      "flex items-center justify-between w-full group",
                      isMobile && "min-h-[44px]"
                    )}>
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-primary" />
                        Resumo Financeiro
                      </h2>
                      <ChevronDown className={cn(
                        "h-5 w-5 transition-transform",
                        expandedSections.summary && "rotate-180"
                      )} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4">
                      {isMobile ? (
                        <HorizontalScrollCards>
                          <MobileSummaryCard
                            icon={Wallet}
                            label="Gasto no mês"
                            value={formatCurrency(financialSummary.currentMonthTotal)}
                            variant="expense"
                          />
                          <MobileSummaryCard
                            icon={TrendingUp}
                            label="Média mensal"
                            value={formatCurrency(financialSummary.monthlyAverage)}
                          />
                          <MobileSummaryCard
                            icon={PieChartIcon}
                            label="Maior categoria"
                            value={financialSummary.largestCategory ? formatCurrency(financialSummary.largestCategory.total) : "--"}
                            subtext={financialSummary.largestCategory ? translateCategory(financialSummary.largestCategory.category) : undefined}
                          />
                          <MobileSummaryCard
                            icon={Calendar}
                            label="Próximo vencimento"
                            value={financialSummary.nextPayment ? formatCurrency(Math.abs(financialSummary.nextPayment.amount)) : "--"}
                            subtext={financialSummary.nextPayment ? formatDate(financialSummary.nextPayment.date) : undefined}
                          />
                        </HorizontalScrollCards>
                      ) : (
                        <SummaryCards summary={financialSummary} />
                      )}
                    </CollapsibleContent>
                  </Collapsible>

                  <Separator />

                  {monthlyInvoices.length > 0 && categorySpending.length > 0 && (
                    <Collapsible
                      open={expandedSections.charts}
                      onOpenChange={() => toggleSection('charts')}
                    >
                      <CollapsibleTrigger className={cn(
                        "flex items-center justify-between w-full group",
                        isMobile && "min-h-[44px]"
                      )}>
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                          <PieChartIcon className="h-5 w-5 text-primary" />
                          Análise Financeira
                        </h2>
                        <ChevronDown className={cn(
                          "h-5 w-5 transition-transform",
                          expandedSections.charts && "rotate-180"
                        )} />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-4">
                        <div className={cn(
                          "grid gap-4 md:gap-6",
                          isMobile ? "grid-cols-1" : "md:grid-cols-2"
                        )}>
                          <div className={isMobile ? "h-[200px]" : "h-[300px]"}>
                            <MonthlySpendingBarChart data={monthlyInvoices} />
                          </div>
                          <div className={isMobile ? "h-[200px]" : "h-[300px]"}>
                            <CategoryPieChart data={categorySpending} />
                          </div>
                        </div>
                        <div className={cn("mt-4 md:mt-6", isMobile ? "h-[200px]" : "h-[300px]")}>
                          <SpendingTrendAreaChart data={monthlyInvoices} />
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {transactions.length > 0 && (
                    <>
                      <Separator />
                      <Collapsible
                        open={expandedSections.transactions}
                        onOpenChange={() => toggleSection('transactions')}
                      >
                        <CollapsibleTrigger className={cn(
                          "flex items-center justify-between w-full group",
                          isMobile && "min-h-[44px]"
                        )}>
                          <h2 className="text-xl font-semibold flex items-center gap-2">
                            <Receipt className="h-5 w-5 text-primary" />
                            Transações
                            <Badge variant="secondary">{transactions.length}</Badge>
                          </h2>
                          <div className="flex items-center gap-2">
                            {isMobile && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowFiltersSheet(true);
                                }}
                                className="min-h-[44px] gap-2"
                              >
                                <Filter className="h-4 w-4" />
                                Filtrar
                              </Button>
                            )}
                            <ChevronDown className={cn(
                              "h-5 w-5 transition-transform",
                              expandedSections.transactions && "rotate-180"
                            )} />
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-4">
                          {isMobile ? (
                            <div className="space-y-3">
                              {transactions.slice(0, 20).map((transaction) => (
                                <MobileTransactionCard key={transaction.id} transaction={transaction} />
                              ))}
                              {transactions.length > 20 && (
                                <Button variant="outline" className="w-full min-h-[44px]">
                                  Ver todas ({transactions.length} transações)
                                </Button>
                              )}
                            </div>
                          ) : (
                            <TransactionsTable transactions={transactions} />
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    </>
                  )}

                  {bills.length > 0 && (
                    <>
                      <Separator />
                      <Collapsible
                        open={expandedSections.bills}
                        onOpenChange={() => toggleSection('bills')}
                      >
                        <CollapsibleTrigger className={cn(
                          "flex items-center justify-between w-full group",
                          isMobile && "min-h-[44px]"
                        )}>
                          <h2 className="text-xl font-semibold flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-primary" />
                            Faturas
                            <Badge variant="secondary">{bills.length}</Badge>
                          </h2>
                          <ChevronDown className={cn(
                            "h-5 w-5 transition-transform",
                            expandedSections.bills && "rotate-180"
                          )} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-4">
                          {isMobile ? (
                            <HorizontalScrollCards title="Faturas do Cartão">
                              {bills.map((bill) => (
                                <ScrollCard key={bill.id} width="280px">
                                  <Card className="p-5 h-full bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between">
                                        <Badge variant="outline" className="text-xs">
                                          Fatura
                                        </Badge>
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                      <div>
                                        <p className="text-sm text-muted-foreground mb-1">Vencimento</p>
                                        <p className="font-semibold">{formatDate(bill.dueDate)}</p>
                                      </div>
                                      <Separator />
                                      <div>
                                        <p className="text-sm text-muted-foreground mb-1">Valor Total</p>
                                        <p className="text-2xl font-bold text-purple-500">
                                          {formatCurrency(bill.totalAmount, bill.totalAmountCurrencyCode)}
                                        </p>
                                      </div>
                                      {bill.minimumPaymentAmount && (
                                        <div>
                                          <p className="text-xs text-muted-foreground">Pagamento Mínimo</p>
                                          <p className="text-sm font-medium">
                                            {formatCurrency(bill.minimumPaymentAmount, bill.totalAmountCurrencyCode)}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </Card>
                                </ScrollCard>
                              ))}
                            </HorizontalScrollCards>
                          ) : (
                            <BillsTable bills={bills} />
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    </>
                  )}
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {isMobile && <BottomNav />}

      <PluggyModal open={showPluggyModal} onClose={() => setShowPluggyModal(false)} />

      <Sheet open={showUploadSheet} onOpenChange={setShowUploadSheet}>
        <SheetContent side={isMobile ? "bottom" : "right"} className={isMobile ? "h-[90vh]" : "w-[500px]"}>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload de Comprovante
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <ImageUploader
              onSuccess={() => setShowUploadSheet(false)}
              onCancel={() => setShowUploadSheet(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={showFiltersSheet} onOpenChange={setShowFiltersSheet}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros de Transações
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Funcionalidade de filtros será implementada aqui
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
