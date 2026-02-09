import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PluggyConnect } from "react-pluggy-connect";
import type { Bank } from "@shared/schema";
import { fetchWithPluggyAuth } from "@/lib/pluggyClient";

interface CustomPluggyConnectProps {
  bank: Bank;
  cpf: string;
  onSuccess: () => void;
  onError: (error: string) => void;
  onBack: () => void;
}

export function CustomPluggyConnect({ bank, cpf, onSuccess, onError, onBack }: CustomPluggyConnectProps) {
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionSuccess, setConnectionSuccess] = useState(false);

  useEffect(() => {
    const fetchConnectToken = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetchWithPluggyAuth('/api/pluggy/connect-token');
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Falha ao gerar token de conexão');
        }

        const data = await response.json();
        setConnectToken(data.accessToken);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
        onError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConnectToken();
  }, [onError]);

  // ⚠️ ⚠️ ⚠️ CRÍTICO - NÃO REMOVER ESTE CÓDIGO ⚠️ ⚠️ ⚠️
  // Este handler DEVE salvar o item no banco de dados após conexão bem-sucedida.
  // Sem este código, os bancos conectados NÃO aparecerão no dashboard!
  // Ver documentação completa em: PROBLEMA_PLUGGY_RESOLVIDO.md
  const handlePluggySuccess = async (itemData: any) => {
    console.log('Conexão estabelecida com sucesso:', itemData);
    
    // ⚠️ CRÍTICO: Salvar item no banco de dados PostgreSQL
    // Pluggy removeu o endpoint GET /items, então precisamos guardar localmente
    const item = itemData.item;
    if (item?.id) {
      try {
        await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: item.id,
            connectorId: item.connector?.id || 0,
            connectorName: item.connector?.name || bank.name,
            status: item.status || 'UPDATED',
            executionStatus: item.executionStatus || 'SUCCESS',
          }),
        });
        console.log(`✅ Item ${item.id.substring(0, 8)}... salvo no banco de dados`);
      } catch (error) {
        console.error('Erro ao salvar item no banco:', error);
      }
    }
    
    setConnectionSuccess(true);
    onSuccess();
  };
  // ⚠️ FIM DO CÓDIGO CRÍTICO - NÃO MODIFICAR SEM LER PROBLEMA_PLUGGY_RESOLVIDO.md

  const handlePluggyError = (error: any) => {
    console.error('Erro no widget Pluggy:', error);
    const errorMessage = error?.message || 'Erro ao conectar com o banco';
    setError(errorMessage);
    onError(errorMessage);
  };

  const retry = () => {
    setError(null);
    setIsLoading(true);
    setConnectToken(null);
    setConnectionSuccess(false);
    
    const fetchConnectToken = async () => {
      try {
        const response = await fetchWithPluggyAuth('/api/pluggy/connect-token');
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Falha ao gerar token de conexão');
        }

        const data = await response.json();
        setConnectToken(data.accessToken);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
        onError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConnectToken();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2" data-testid="text-title">
            Preparando Conexão
          </h2>
          <p className="text-sm text-muted-foreground">
            Conectando com {bank.name}
          </p>
        </div>

        <Card className="p-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Aguarde...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2 text-destructive" data-testid="text-title">
            Erro na Conexão
          </h2>
        </div>

        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription data-testid="text-error-message">
            {error}
          </AlertDescription>
        </Alert>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex-1 h-12"
            data-testid="button-back"
          >
            Voltar
          </Button>
          <Button
            onClick={retry}
            className="flex-1 h-12 gap-2"
            data-testid="button-retry"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  if (connectionSuccess) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2 text-chart-2" data-testid="text-title">
            Conexão Estabelecida!
          </h2>
          <p className="text-sm text-muted-foreground">
            Sua conta foi conectada com sucesso
          </p>
        </div>

        <Card className="p-8 border-chart-2">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="h-16 w-16 rounded-full bg-chart-2/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-chart-2" />
            </div>
            <p className="text-center font-medium" data-testid="text-success-message">
              Credenciais do Pluggy.ai funcionando corretamente!
            </p>
          </div>
        </Card>

        <Button
          onClick={onBack}
          variant="outline"
          className="w-full h-12"
          data-testid="button-connect-another"
        >
          Conectar Outro Banco
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2" data-testid="text-title">
          Conectar ao {bank.name}
        </h2>
        <p className="text-sm text-muted-foreground">
          Siga as instruções no widget abaixo
        </p>
      </div>

      <Card className="p-4">
        {connectToken && (
          <PluggyConnect
            connectToken={connectToken}
            includeSandbox={true}
            connectorIds={[bank.id]}
            theme="dark"
            onSuccess={handlePluggySuccess}
            onError={handlePluggyError}
          />
        )}
      </Card>

      <Button
        variant="outline"
        onClick={onBack}
        className="w-full h-12"
        data-testid="button-back"
      >
        Voltar
      </Button>
    </div>
  );
}
