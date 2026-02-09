import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface ProgressEvent {
  tipo: string;
  mensagem: string;
  timestamp: string;
  progresso?: number;
  etapa?: string;
  totalTransacoes?: number;
  totalFaturas?: number;
  fromCache?: boolean;
  dados?: any;
}

interface DataCollectionProgressProps {
  itemId: string;
  forceRefresh?: boolean;
  onComplete: (dados: any) => void;
  onError: (erro: string) => void;
}

export default function DataCollectionProgress({
  itemId,
  forceRefresh = false,
  onComplete,
  onError
}: DataCollectionProgressProps) {
  const [progresso, setProgresso] = useState(0);
  const [etapaAtual, setEtapaAtual] = useState("Iniciando...");
  const [mensagens, setMensagens] = useState<string[]>([]);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    const url = `/api/pluggy/dados-completos-stream/${itemId}${forceRefresh ? '?forceRefresh=true' : ''}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data: ProgressEvent = JSON.parse(event.data);

        // Atualizar progresso
        if (data.progresso !== undefined) {
          setProgresso(data.progresso);
        }

        // Atualizar etapa atual
        if (data.mensagem) {
          setEtapaAtual(data.mensagem);
          setMensagens(prev => [...prev, data.mensagem].slice(-5)); // Manter últimas 5 mensagens
        }

        // Verificar se veio do cache
        if (data.fromCache) {
          setFromCache(true);
          setProgresso(100);
        }

        // Verificar se completou
        if (data.tipo === 'completo') {
          setProgresso(100);
          eventSource.close();
          onComplete(data.dados || data);
        }

        // Verificar se houve erro
        if (data.tipo === 'erro') {
          eventSource.close();
          onError(data.mensagem);
        }

      } catch (err) {
        console.error('Erro ao processar evento:', err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      onError('Erro na conexão com o servidor');
    };

    return () => {
      eventSource.close();
    };
  }, [itemId, forceRefresh, onComplete, onError]);

  const getIcon = () => {
    if (progresso === 100) {
      return <CheckCircle2 className="h-8 w-8 text-green-500 animate-in zoom-in" />;
    }
    if (progresso === 0) {
      return <Loader2 className="h-8 w-8 animate-spin text-blue-500" />;
    }
    return <Loader2 className="h-8 w-8 animate-spin text-blue-500" />;
  };

  return (
    <Card className="p-6 w-full max-w-2xl mx-auto">
      <div className="flex flex-col items-center space-y-4">
        {/* Ícone */}
        <div className="flex items-center justify-center">
          {getIcon()}
        </div>

        {/* Etapa Atual */}
        <div className="text-center">
          <h3 className="text-lg font-semibold">{etapaAtual}</h3>
          {fromCache && (
            <p className="text-sm text-muted-foreground mt-1">
              ⚡ Carregado do cache (atualizado há menos de 1 hora)
            </p>
          )}
        </div>

        {/* Barra de Progresso */}
        <div className="w-full space-y-2">
          <Progress value={progresso} className="w-full" />
          <p className="text-sm text-center text-muted-foreground">
            {progresso}% completo
          </p>
        </div>

        {/* Mensagens Recentes */}
        {mensagens.length > 0 && (
          <div className="w-full mt-4 space-y-1">
            {mensagens.map((msg, idx) => (
              <div
                key={idx}
                className="text-xs text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                {msg}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
