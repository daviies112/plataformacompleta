import { useEffect, useState } from "react";
import { PluggyConnect } from "react-pluggy-connect";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { fetchWithPluggyAuth } from "@/lib/pluggyClient";

interface PluggyModalProps {
  open: boolean;
  onClose: () => void;
}

export default function PluggyModal({ open, onClose }: PluggyModalProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchConnectToken();
    } else {
      setConnectToken(null);
      setIsLoading(true);
    }
  }, [open]);

  const fetchConnectToken = async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithPluggyAuth('/api/pluggy/connect-token');
      
      if (!response.ok) {
        throw new Error('Falha ao gerar token de conexão');
      }

      const data = await response.json();
      setConnectToken(data.accessToken);
    } catch (err) {
      console.error('Erro ao carregar:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ⚠️ ⚠️ ⚠️ CRÍTICO - NÃO REMOVER ESTE CÓDIGO ⚠️ ⚠️ ⚠️
  // Este é o padrão CORRETO de implementação para handlers do Pluggy.
  // SEMPRE salvar item no banco após conexão bem-sucedida.
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
            connectorName: item.connector?.name || 'Banco',
            status: item.status || 'UPDATED',
            executionStatus: item.executionStatus || 'SUCCESS',
          }),
        });
        
        console.log(`✅ Item ${item.id.substring(0, 8)}... salvo no banco após conexão`);
        
        queryClient.invalidateQueries({ queryKey: ['/api/items'] });
        console.log('🔄 Cache do React Query invalidado - items serão recarregados');
        
        window.dispatchEvent(new CustomEvent('pluggy-item-added', { detail: { itemId: item.id } }));
      } catch (err) {
        console.error('Erro ao salvar item no banco:', err);
      }
    }
    
    onClose();
    setLocation("/dashboard");
  };
  // ⚠️ FIM DO CÓDIGO CRÍTICO - Este é o padrão de referência para outros componentes

  const handlePluggyError = (error: any) => {
    console.error('Erro no widget Pluggy:', error);
  };

  if (!open) return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Carregando widget...</p>
        </div>
      </div>
    );
  }

  if (!connectToken) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
        <p className="text-destructive">Erro ao carregar o widget</p>
      </div>
    );
  }

  return (
    <PluggyConnect
      connectToken={connectToken}
      includeSandbox={true}
      theme="dark"
      onSuccess={handlePluggySuccess}
      onError={handlePluggyError}
      onClose={onClose}
    />
  );
}
