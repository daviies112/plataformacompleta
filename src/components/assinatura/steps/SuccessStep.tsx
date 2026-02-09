import { CheckCircle, Download, Mail, Copy, Home, PenTool, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useContract } from '@/contexts/ContractContext';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/validators';
import { brandConfig, successConfig } from '@/config/branding';
import { useEffect } from 'react';

export const SuccessStep = () => {
  const { govbrData, contractData, resetFlow } = useContract();
  const { toast } = useToast();

  const handleCopyProtocol = () => {
    navigator.clipboard.writeText(contractData?.protocol_number || '');
    toast({
      title: 'Copiado!',
      description: 'Número do protocolo copiado para a área de transferência.',
    });
  };

  const handleDownload = () => {
    if (!contractData?.contract_html) {
      toast({
        title: 'Erro',
        description: 'Contrato não encontrado.',
        variant: 'destructive',
      });
      return;
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contrato - ${contractData.protocol_number}</title>
        <style>
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        ${contractData.contract_html}
      </body>
      </html>
    `;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contrato-${contractData.protocol_number}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Download concluído',
      description: 'O contrato foi baixado. Abra o arquivo e use Ctrl+P para imprimir como PDF.',
    });
  };

  const handleNewContract = () => {
    resetFlow();
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 animate-fade-in">
      <div className="text-center mb-8">
        <div className="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6 animate-scale-in">
          <CheckCircle className="w-14 h-14 text-success" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          {successConfig.title}
        </h2>
        <p className="text-muted-foreground">
          {successConfig.subtitle}
        </p>
      </div>

      <div className="glass-card p-6 mb-6">
        <h3 className="font-semibold text-foreground mb-4">Detalhes do Contrato</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-muted-foreground">Contratante</span>
            <span className="font-medium text-foreground">{govbrData?.nome || 'N/A'}</span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-muted-foreground">CPF</span>
            <span className="font-medium text-foreground">{govbrData?.cpf || 'N/A'}</span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-muted-foreground">Data da Assinatura</span>
            <span className="font-medium text-foreground">
              {contractData?.signed_at ? formatDate(contractData.signed_at) : '-'}
            </span>
          </div>
          
          <div className="flex justify-between items-center py-2">
            <span className="text-muted-foreground">Protocolo</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-primary">
                {contractData?.protocol_number}
              </span>
              <button
                onClick={handleCopyProtocol}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <Copy className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-6 mb-6 border-2 border-success/30 bg-success/5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
            <PenTool className="w-5 h-5 text-success" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Assinatura Digital Registrada</h3>
            <p className="text-sm text-muted-foreground">Autenticado via GOV.BR</p>
          </div>
          <ShieldCheck className="w-6 h-6 text-success ml-auto" />
        </div>
        
        <div className="bg-background rounded-lg p-4 text-center border border-border">
          <p className="text-sm text-muted-foreground mb-2">Assinado digitalmente por:</p>
          <p className="font-semibold text-lg text-foreground">{govbrData?.nome || 'N/A'}</p>
          <p className="text-sm text-muted-foreground">CPF: {govbrData?.cpf || 'N/A'}</p>
          <p className="text-xs text-primary mt-2">
            Nível de segurança: {govbrData?.nivel_conta || 'Prata'}
          </p>
        </div>
      </div>

      {govbrData?.email && (
        <div className="bg-primary/5 rounded-xl p-4 mb-6 flex items-start gap-3">
          <Mail className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-foreground font-medium">
              Email enviado!
            </p>
            <p className="text-sm text-muted-foreground">
              {successConfig.instruction} (<strong>{govbrData.email}</strong>)
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <Button
          onClick={handleDownload}
          className="w-full h-12 gap-2"
        >
          <Download className="w-5 h-5" />
          Baixar Contrato
        </Button>
        
        <Button
          variant="outline"
          onClick={handleNewContract}
          className="w-full h-12 gap-2"
        >
          <Home className="w-5 h-5" />
          {successConfig.finalButton}
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-8">
        Dúvidas? Entre em contato através do email{' '}
        <a href={`mailto:${brandConfig.contactEmail}`} className="text-primary hover:underline">
          {brandConfig.contactEmail}
        </a>
      </p>
    </div>
  );
};
