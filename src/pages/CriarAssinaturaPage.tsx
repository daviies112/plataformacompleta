import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { AssinaturaNav } from '@/components/assinatura/AssinaturaNav';
import { 
  FileSignature, 
  Copy, 
  Check, 
  Plus, 
  Loader2,
  User,
  Mail,
  Phone,
  CreditCard,
  FileText
} from 'lucide-react';

const CriarAssinaturaPage = () => {
  const { toast } = useToast();
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [clientName, setClientName] = useState('');
  const [clientCpf, setClientCpf] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [contractTitle, setContractTitle] = useState('Contrato de Prestação de Serviços');

  const createContractMutation = useMutation({
    mutationFn: async (contractData: Record<string, unknown>) => {
      const response = await apiRequest('POST', '/api/assinatura/contracts', contractData);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/assinatura/contracts'] });
      const url = `${window.location.origin}/assinar/${data.access_token}`;
      setGeneratedUrl(url);
      toast({
        title: 'Contrato criado!',
        description: 'URL gerada com sucesso. Copie e envie ao cliente.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o contrato. Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const validateCPF = (cpf: string) => {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return false;
    if (/^(\d)\1+$/.test(digits)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(digits.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(digits.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(digits.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    return remainder === parseInt(digits.charAt(10));
  };

  const handleCpfChange = (value: string) => {
    setClientCpf(formatCPF(value));
  };

  const handlePhoneChange = (value: string) => {
    setClientPhone(formatPhone(value));
  };

  const handleCreateContract = async () => {
    if (!clientName.trim()) {
      toast({ title: 'Erro', description: 'Nome do cliente é obrigatório', variant: 'destructive' });
      return;
    }

    const cpfNumbers = clientCpf.replace(/\D/g, '');
    if (!validateCPF(cpfNumbers)) {
      toast({ title: 'Erro', description: 'CPF inválido', variant: 'destructive' });
      return;
    }

    if (!clientEmail.trim() || !clientEmail.includes('@')) {
      toast({ title: 'Erro', description: 'E-mail inválido', variant: 'destructive' });
      return;
    }

    const protocolNumber = `CONT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    createContractMutation.mutate({
      client_name: clientName.trim(),
      client_cpf: cpfNumbers,
      client_email: clientEmail.trim(),
      client_phone: clientPhone.replace(/\D/g, '') || null,
      contract_title: contractTitle,
      protocol_number: protocolNumber,
      status: 'pending',
    });
  };

  const copyToClipboard = async () => {
    if (generatedUrl) {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Copiado!', description: 'URL copiada para a área de transferência.' });
    }
  };

  const resetForm = () => {
    setClientName('');
    setClientCpf('');
    setClientEmail('');
    setClientPhone('');
    setContractTitle('Contrato de Prestação de Serviços');
    setGeneratedUrl(null);
    setCopied(false);
  };

  return (
    <div className="flex flex-col h-full">
      <AssinaturaNav />
      
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-2xl mx-auto space-y-6">
          {generatedUrl && (
            <Card className="border-green-500/50 bg-green-500/10 animate-slide-up">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-green-600 text-lg">
                  <Check className="w-5 h-5" />
                  Contrato Criado com Sucesso!
                </CardTitle>
                <CardDescription>
                  Copie a URL abaixo e envie para o cliente assinar o contrato.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input value={generatedUrl} readOnly className="font-mono text-sm" data-testid="input-generated-url" />
                  <Button onClick={copyToClipboard} variant="outline" data-testid="button-copy-url">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <Button onClick={resetForm} className="w-full" size="sm" data-testid="button-new-contract">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Novo Contrato
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="glass border-2 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileSignature className="w-5 h-5 text-primary" />
                Criar Nova Assinatura
              </CardTitle>
              <CardDescription>
                Preencha os dados do cliente para gerar um link de assinatura
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contractTitle" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Título do Contrato
                  </Label>
                  <Input
                    id="contractTitle"
                    value={contractTitle}
                    onChange={(e) => setContractTitle(e.target.value)}
                    placeholder="Ex: Contrato de Prestação de Serviços"
                    data-testid="input-contract-title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientName" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Nome Completo
                  </Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Nome do cliente"
                    data-testid="input-client-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientCpf" className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    CPF
                  </Label>
                  <Input
                    id="clientCpf"
                    value={clientCpf}
                    onChange={(e) => handleCpfChange(e.target.value)}
                    placeholder="000.000.000-00"
                    data-testid="input-client-cpf"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientEmail" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    E-mail
                  </Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    data-testid="input-client-email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientPhone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Telefone (opcional)
                  </Label>
                  <Input
                    id="clientPhone"
                    value={clientPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="(00) 00000-0000"
                    data-testid="input-client-phone"
                  />
                </div>
              </div>

              <Button 
                onClick={handleCreateContract} 
                className="w-full"
                size="lg"
                disabled={createContractMutation.isPending}
                data-testid="button-criar-contrato"
              >
                {createContractMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <FileSignature className="w-4 h-4 mr-2" />
                    Criar Contrato
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CriarAssinaturaPage;
