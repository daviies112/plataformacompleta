import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Building2, CheckCircle2, Loader2, RefreshCw, Banknote } from 'lucide-react';
import { toast } from 'sonner';

const BANCOS = [
  { code: '001', name: 'Banco do Brasil' },
  { code: '033', name: 'Santander' },
  { code: '104', name: 'Caixa Econômica Federal' },
  { code: '237', name: 'Bradesco' },
  { code: '341', name: 'Itaú Unibanco' },
  { code: '260', name: 'Nubank' },
  { code: '077', name: 'Inter' },
  { code: '336', name: 'C6 Bank' },
  { code: '212', name: 'Banco Original' },
  { code: '290', name: 'PagBank' },
  { code: '380', name: 'PicPay' },
  { code: '756', name: 'Sicoob' },
  { code: '748', name: 'Sicredi' },
  { code: '422', name: 'Safra' },
  { code: '070', name: 'BRB' },
  { code: '323', name: 'Mercado Pago' },
];

interface EmpresaStatus {
  configured: boolean;
  recipientId?: string;
  bankAccount?: {
    banco: string;
    agencia: string;
    conta: string;
    tipo: string;
    holderName?: string;
  };
}

export default function BankAccountSetup() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<EmpresaStatus | null>(null);

  const [razaoSocial, setRazaoSocial] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [bancoCode, setBancoCode] = useState('');
  const [agencia, setAgencia] = useState('');
  const [agenciaDv, setAgenciaDv] = useState('');
  const [conta, setConta] = useState('');
  const [contaDv, setContaDv] = useState('');
  const [tipoConta, setTipoConta] = useState('corrente');

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pagarme/empresa-status', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCNPJ = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!razaoSocial || !cnpj || !bancoCode || !agencia || !conta) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const cnpjClean = cnpj.replace(/\D/g, '');
    if (cnpjClean.length !== 14) {
      toast.error('CNPJ inválido - deve conter 14 dígitos');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/pagarme/onboarding-empresa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          razaoSocial,
          cnpj: cnpjClean,
          bancoCode,
          agencia,
          agenciaDv: agenciaDv || null,
          conta,
          contaDv: contaDv || null,
          tipoConta: tipoConta === 'poupanca' ? 'poupanca' : 'corrente',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao cadastrar');
      }

      toast.success('Dados bancários cadastrados com sucesso!');
      checkStatus();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cadastrar dados bancários');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="loading-spinner">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground" data-testid="page-title">
            Dados Bancários da Empresa
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure sua conta bancária para receber os pagamentos do Split automaticamente
          </p>
        </div>
      </div>

      {status?.configured && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950" data-testid="configured-alert">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-green-800 dark:text-green-200">Conta Bancária Configurada</AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">
            <div className="mt-2 space-y-1">
              <p><strong>Banco:</strong> {BANCOS.find(b => b.code === status.bankAccount?.banco)?.name || status.bankAccount?.banco}</p>
              <p><strong>Agência:</strong> {status.bankAccount?.agencia}</p>
              <p><strong>Conta:</strong> {status.bankAccount?.conta}</p>
              <p><strong>Tipo:</strong> {status.bankAccount?.tipo}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setStatus({ ...status, configured: false })}
              data-testid="button-change-bank"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Alterar Dados Bancários
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!status?.configured && (
        <Card data-testid="bank-form-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Cadastrar Conta Bancária
            </CardTitle>
            <CardDescription>
              Informe os dados da conta bancária PJ para receber os valores das vendas.
              A conta deve estar no mesmo CNPJ da empresa.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Dados da Empresa</h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="razaoSocial">Razão Social *</Label>
                    <Input
                      id="razaoSocial"
                      placeholder="Nome completo da empresa"
                      value={razaoSocial}
                      onChange={(e) => setRazaoSocial(e.target.value)}
                      required
                      data-testid="input-razao-social"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ *</Label>
                    <Input
                      id="cnpj"
                      placeholder="00.000.000/0000-00"
                      value={cnpj}
                      onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                      maxLength={18}
                      required
                      data-testid="input-cnpj"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Dados Bancários</h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="banco">Banco *</Label>
                    <Select value={bancoCode} onValueChange={setBancoCode} data-testid="select-banco">
                      <SelectTrigger data-testid="select-banco-trigger">
                        <SelectValue placeholder="Selecione o banco" />
                      </SelectTrigger>
                      <SelectContent>
                        {BANCOS.map((banco) => (
                          <SelectItem key={banco.code} value={banco.code} data-testid={`select-banco-${banco.code}`}>
                            {banco.code} - {banco.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="agencia">Agência *</Label>
                    <Input
                      id="agencia"
                      placeholder="0000"
                      value={agencia}
                      onChange={(e) => setAgencia(e.target.value.replace(/\D/g, '').slice(0, 5))}
                      required
                      data-testid="input-agencia"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="agenciaDv">Dígito Agência</Label>
                    <Input
                      id="agenciaDv"
                      placeholder="X"
                      value={agenciaDv}
                      onChange={(e) => setAgenciaDv(e.target.value.slice(0, 2))}
                      maxLength={2}
                      data-testid="input-agencia-dv"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="conta">Conta *</Label>
                    <Input
                      id="conta"
                      placeholder="00000000"
                      value={conta}
                      onChange={(e) => setConta(e.target.value.replace(/\D/g, '').slice(0, 12))}
                      required
                      data-testid="input-conta"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contaDv">Dígito Conta *</Label>
                    <Input
                      id="contaDv"
                      placeholder="X"
                      value={contaDv}
                      onChange={(e) => setContaDv(e.target.value.slice(0, 2))}
                      maxLength={2}
                      data-testid="input-conta-dv"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipoConta">Tipo de Conta *</Label>
                    <Select value={tipoConta} onValueChange={setTipoConta} data-testid="select-tipo-conta">
                      <SelectTrigger data-testid="select-tipo-conta-trigger">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corrente" data-testid="select-tipo-corrente">Conta Corrente</SelectItem>
                        <SelectItem value="poupanca" data-testid="select-tipo-poupanca">Conta Poupança</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={saving}
                data-testid="button-submit"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  <>
                    <Banknote className="mr-2 h-4 w-4" />
                    Cadastrar Conta Bancária
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}
    </div>
  );
}
