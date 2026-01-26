import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Building2, 
  User, 
  CreditCard, 
  QrCode,
  Loader2
} from 'lucide-react';

interface SplitStatus {
  success: boolean;
  pagarme: {
    configured: boolean;
    testMode: boolean;
  };
  company: {
    recipientId: string | null;
    configured: boolean;
  };
  resellers: {
    total: number;
    withRecipient: number;
    pending: number;
    list: Array<{
      id: string;
      nome: string;
      email: string;
      hasRecipient: boolean;
      recipientId: string | null;
    }>;
  };
  readyForSplit: boolean;
}

interface TestOrderResult {
  success: boolean;
  orderId?: string;
  orderCode?: string;
  status?: string;
  amount?: number;
  splitRules?: Array<{
    recipientId: string;
    percentage: number;
    type: string;
  }>;
  pix?: {
    qrCode: string;
    qrCodeUrl: string;
    expiresAt: string;
  };
  error?: string;
}

export default function SplitTest() {
  const { toast } = useToast();
  const [companyForm, setCompanyForm] = useState({
    company_name: 'EMPRESA TESTE LTDA',
    trading_name: 'Empresa Teste',
    email: 'empresa@teste.com',
    document: '11444777000161',
  });
  const [selectedReseller, setSelectedReseller] = useState<string>('');
  const [resellerPercentage, setResellerPercentage] = useState<string>('70');
  const [testOrderResult, setTestOrderResult] = useState<TestOrderResult | null>(null);
  const [resellerSetupResults, setResellerSetupResults] = useState<Record<string, any>>({});

  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery<SplitStatus>({
    queryKey: ['/api/split/status'],
    refetchInterval: false,
  });

  const setupCompanyMutation = useMutation({
    mutationFn: async (data: typeof companyForm) => {
      const res = await apiRequest('POST', '/api/split/setup-company', data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.alreadyExists ? 'Recipient já existe' : 'Recipient criado!',
        description: `Recipient ID: ${data.recipientId}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/split/status'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar recipient',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const setupResellerMutation = useMutation({
    mutationFn: async (resellerId: string) => {
      const res = await apiRequest('POST', `/api/split/setup-reseller/${resellerId}`, {});
      return res.json();
    },
    onSuccess: (data, resellerId) => {
      setResellerSetupResults(prev => ({ ...prev, [resellerId]: data }));
      toast({
        title: data.alreadyExists ? 'Recipient já existe' : 'Recipient criado!',
        description: `Recipient ID: ${data.recipientId}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/split/status'] });
    },
    onError: (error: Error, resellerId) => {
      setResellerSetupResults(prev => ({ ...prev, [resellerId]: { error: error.message } }));
      toast({
        title: 'Erro ao criar recipient',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const testOrderMutation = useMutation({
    mutationFn: async (data: { reseller_id?: string; reseller_percentage: number }) => {
      const res = await apiRequest('POST', '/api/split/test-order', data);
      return res.json();
    },
    onSuccess: (data) => {
      setTestOrderResult(data);
      toast({
        title: 'Ordem de teste criada!',
        description: `Order ID: ${data.orderId}`,
      });
    },
    onError: (error: Error) => {
      setTestOrderResult({ success: false, error: error.message });
      toast({
        title: 'Erro ao criar ordem',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const StatusBadge = ({ ok, label }: { ok: boolean; label: string }) => (
    <Badge variant={ok ? 'default' : 'destructive'} className="gap-1">
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label}
    </Badge>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Split Pagar.me - Teste</h1>
          <p className="text-muted-foreground">Diagnóstico e configuração do sistema de split de pagamentos</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => refetchStatus()}
          disabled={statusLoading}
          data-testid="button-refresh-status"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${statusLoading ? 'animate-spin' : ''}`} />
          Atualizar Status
        </Button>
      </div>

      <Card data-testid="card-split-status">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Status do Split
          </CardTitle>
          <CardDescription>Verificação da configuração do sistema de split Pagar.me</CardDescription>
        </CardHeader>
        <CardContent>
          {statusLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Carregando...</span>
            </div>
          ) : status ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <StatusBadge ok={status.pagarme.configured} label={`Pagar.me ${status.pagarme.configured ? 'Configurado' : 'Não Configurado'}`} />
                {status.pagarme.testMode && <Badge variant="secondary">Modo Teste</Badge>}
                <StatusBadge ok={status.company.configured} label={`Company ${status.company.configured ? 'OK' : 'Pendente'}`} />
                <StatusBadge ok={status.readyForSplit} label={`Split ${status.readyForSplit ? 'Pronto' : 'Não Pronto'}`} />
              </div>

              {status.company.recipientId && (
                <div className="p-3 bg-muted rounded-md">
                  <Label className="text-xs text-muted-foreground">Company Recipient ID:</Label>
                  <code className="text-sm block mt-1" data-testid="text-company-recipient-id">{status.company.recipientId}</code>
                </div>
              )}

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Revendedoras ({status.resellers.total} total)</h4>
                <div className="flex gap-2 mb-3">
                  <Badge variant="outline" className="text-green-600">
                    {status.resellers.withRecipient} com recipient
                  </Badge>
                  <Badge variant="outline" className="text-yellow-600">
                    {status.resellers.pending} pendentes
                  </Badge>
                </div>
                
                {status.resellers.list.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {status.resellers.list.map((r) => (
                      <div key={r.id} className="flex items-center justify-between p-2 bg-muted/50 rounded" data-testid={`reseller-item-${r.id}`}>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{r.nome}</p>
                          <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                        </div>
                        <StatusBadge ok={r.hasRecipient} label={r.hasRecipient ? 'OK' : 'Pendente'} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma revendedora encontrada</p>
                )}
              </div>
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>Não foi possível carregar o status do split</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="card-setup-company">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Configurar Empresa
            </CardTitle>
            <CardDescription>Criar recipient da empresa no Pagar.me</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Razão Social</Label>
              <Input
                id="company_name"
                value={companyForm.company_name}
                onChange={(e) => setCompanyForm(f => ({ ...f, company_name: e.target.value }))}
                data-testid="input-company-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trading_name">Nome Fantasia</Label>
              <Input
                id="trading_name"
                value={companyForm.trading_name}
                onChange={(e) => setCompanyForm(f => ({ ...f, trading_name: e.target.value }))}
                data-testid="input-trading-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={companyForm.email}
                onChange={(e) => setCompanyForm(f => ({ ...f, email: e.target.value }))}
                data-testid="input-company-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document">CNPJ</Label>
              <Input
                id="document"
                value={companyForm.document}
                onChange={(e) => setCompanyForm(f => ({ ...f, document: e.target.value }))}
                placeholder="Apenas números"
                data-testid="input-company-document"
              />
            </div>
            <Button 
              onClick={() => setupCompanyMutation.mutate(companyForm)} 
              disabled={setupCompanyMutation.isPending}
              className="w-full"
              data-testid="button-setup-company"
            >
              {setupCompanyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Recipient da Empresa
            </Button>

            {setupCompanyMutation.data && (
              <div className="p-3 bg-muted rounded-md text-xs">
                <pre className="overflow-x-auto">{JSON.stringify(setupCompanyMutation.data, null, 2)}</pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-setup-resellers">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Configurar Revendedoras
            </CardTitle>
            <CardDescription>Criar recipients para revendedoras pendentes</CardDescription>
          </CardHeader>
          <CardContent>
            {status?.resellers.list.filter(r => !r.hasRecipient).length ? (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {status.resellers.list.filter(r => !r.hasRecipient).map((r) => (
                  <div key={r.id} className="p-3 border rounded-lg space-y-2" data-testid={`reseller-setup-${r.id}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{r.nome}</p>
                        <p className="text-xs text-muted-foreground">{r.email}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setupResellerMutation.mutate(r.id)}
                        disabled={setupResellerMutation.isPending}
                        data-testid={`button-setup-reseller-${r.id}`}
                      >
                        {setupResellerMutation.isPending && setupResellerMutation.variables === r.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Criar'
                        )}
                      </Button>
                    </div>
                    {resellerSetupResults[r.id] && (
                      <div className="p-2 bg-muted rounded text-xs">
                        <pre className="overflow-x-auto">{JSON.stringify(resellerSetupResults[r.id], null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>Todas as revendedoras já possuem recipient configurado!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-test-order">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Teste de Venda com Split
          </CardTitle>
          <CardDescription>Criar uma ordem de teste de R$ 1,00 com split configurado</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reseller_select">Revendedora (opcional)</Label>
              <Select value={selectedReseller} onValueChange={setSelectedReseller}>
                <SelectTrigger data-testid="select-reseller">
                  <SelectValue placeholder="Selecione uma revendedora" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem revendedora (100% empresa)</SelectItem>
                  {status?.resellers.list.filter(r => r.hasRecipient).map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reseller_percentage">Percentual Revendedora (%)</Label>
              <Input
                id="reseller_percentage"
                type="number"
                min="0"
                max="100"
                value={resellerPercentage}
                onChange={(e) => setResellerPercentage(e.target.value)}
                disabled={!selectedReseller || selectedReseller === 'none'}
                data-testid="input-reseller-percentage"
              />
            </div>
          </div>

          <Button
            onClick={() => testOrderMutation.mutate({
              reseller_id: selectedReseller && selectedReseller !== 'none' ? selectedReseller : undefined,
              reseller_percentage: parseInt(resellerPercentage) || 70,
            })}
            disabled={testOrderMutation.isPending || !status?.readyForSplit}
            className="w-full"
            data-testid="button-create-test-order"
          >
            {testOrderMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <QrCode className="h-4 w-4 mr-2" />
            Criar Ordem de Teste (R$ 1,00)
          </Button>

          {!status?.readyForSplit && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Split não configurado</AlertTitle>
              <AlertDescription>
                Configure o recipient da empresa antes de criar ordens de teste.
              </AlertDescription>
            </Alert>
          )}

          {testOrderResult && (
            <div className="space-y-4 mt-4">
              {testOrderResult.success ? (
                <>
                  <Alert>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <AlertTitle>Ordem criada com sucesso!</AlertTitle>
                    <AlertDescription>
                      Order ID: {testOrderResult.orderId}
                    </AlertDescription>
                  </Alert>

                  {testOrderResult.pix?.qrCodeUrl && (
                    <div className="flex flex-col items-center gap-4 p-4 border rounded-lg">
                      <h4 className="font-medium">QR Code PIX</h4>
                      <img 
                        src={testOrderResult.pix.qrCodeUrl} 
                        alt="QR Code PIX" 
                        className="w-48 h-48"
                        data-testid="img-pix-qr-code"
                      />
                      {testOrderResult.pix.qrCode && (
                        <div className="w-full">
                          <Label className="text-xs text-muted-foreground">Código PIX (copia e cola):</Label>
                          <div className="mt-1 p-2 bg-muted rounded text-xs font-mono break-all max-h-24 overflow-y-auto">
                            {testOrderResult.pix.qrCode}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {testOrderResult.splitRules && (
                    <div>
                      <h4 className="font-medium mb-2">Split Rules Aplicadas:</h4>
                      <div className="space-y-2">
                        {testOrderResult.splitRules.map((rule, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                            <code className="text-xs">{rule.recipientId}</code>
                            <Badge>{rule.percentage}%</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Erro</AlertTitle>
                  <AlertDescription>{testOrderResult.error}</AlertDescription>
                </Alert>
              )}

              <div className="p-3 bg-muted rounded-md">
                <Label className="text-xs text-muted-foreground">Debug (JSON completo):</Label>
                <pre className="mt-2 text-xs overflow-x-auto max-h-48 overflow-y-auto">
                  {JSON.stringify(testOrderResult, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
