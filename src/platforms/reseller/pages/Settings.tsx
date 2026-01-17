import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { useResellerAuth } from '../hooks/useResellerAuth';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const { user } = useResellerAuth();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  const { data: stripeStatus, isLoading } = useQuery({
    queryKey: ['/api/stripe/account-status'],
    enabled: !!user
  });

  const handleConnectStripe = async () => {
    try {
      setIsConnecting(true);
      const response = await fetch('/api/stripe/onboarding', {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Nao foi possivel iniciar configuracao',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro de conexao',
        variant: 'destructive'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-settings-title">
          Configuracoes
        </h1>
        <p className="text-muted-foreground">
          Gerencie sua conta e pagamentos
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Recebimento de Pagamentos
            </CardTitle>
            <CardDescription>
              Configure sua conta para receber pagamentos das vendas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                Verificando status...
              </div>
            ) : stripeStatus?.connected ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-600">Conta conectada</span>
                </div>
                
                <div className="grid gap-2">
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-muted-foreground">Receber pagamentos</span>
                    <Badge variant={stripeStatus.chargesEnabled ? 'default' : 'secondary'}>
                      {stripeStatus.chargesEnabled ? 'Ativo' : 'Pendente'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-muted-foreground">Saques</span>
                    <Badge variant={stripeStatus.payoutsEnabled ? 'default' : 'secondary'}>
                      {stripeStatus.payoutsEnabled ? 'Ativo' : 'Pendente'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">Cadastro completo</span>
                    <Badge variant={stripeStatus.detailsSubmitted ? 'default' : 'secondary'}>
                      {stripeStatus.detailsSubmitted ? 'Sim' : 'Pendente'}
                    </Badge>
                  </div>
                </div>

                {!stripeStatus.detailsSubmitted && (
                  <Button onClick={handleConnectStripe} disabled={isConnecting}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Completar cadastro
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-orange-600">
                  <AlertCircle className="h-5 w-5" />
                  <span>Conta nao configurada</span>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Para receber seus pagamentos de comissao, voce precisa conectar sua conta de pagamentos. 
                  O processo leva apenas alguns minutos.
                </p>
                
                <Button 
                  onClick={handleConnectStripe} 
                  disabled={isConnecting}
                  data-testid="button-connect-stripe"
                >
                  {isConnecting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                      Conectando...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Configurar conta de pagamentos
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informacoes da Conta</CardTitle>
            <CardDescription>Seus dados de revendedora</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Nome</span>
                <span className="font-medium">{user?.nome || '-'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{user?.email || '-'}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Comissao</span>
                <Badge>{user?.comissao || 20}%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
