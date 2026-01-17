import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Package, MapPin, Truck, Clock, AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import EnvioNavigation from "./EnvioNavigation";

interface RastreamentoEvento {
  id: string;
  data_hora: string;
  status: string;
  descricao: string;
  local: string;
  cidade: string;
  uf: string;
}

interface RastreamentoEnvio {
  id: string;
  codigo_rastreio: string;
  transportadora_nome: string;
  servico: string;
  status: string;
  data_previsao_entrega: string;
  destinatario_nome: string;
  destinatario_cidade: string;
  destinatario_uf: string;
}

interface RastreamentoResponse {
  envio: RastreamentoEnvio | null;
  eventos: RastreamentoEvento[];
}

function formatarDataBrasileira(dataISO: string): { data: string; hora: string } {
  try {
    const date = new Date(dataISO);
    const data = date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const hora = date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    return { data, hora };
  } catch {
    return { data: '-', hora: '-' };
  }
}

function formatarDataPrevisao(dataISO: string | null | undefined): string {
  if (!dataISO) return 'Não informada';
  try {
    const date = new Date(dataISO);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return 'Não informada';
  }
}

const EnvioRastreamento = () => {
  const [trackingCode, setTrackingCode] = useState("");
  const [searchCode, setSearchCode] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery<RastreamentoResponse>({
    queryKey: ['/api/envio/rastreamento', searchCode],
    enabled: !!searchCode,
    retry: false,
    queryFn: async () => {
      const response = await fetch(`/api/envio/rastreamento/${encodeURIComponent(searchCode!)}`);
      if (!response.ok) {
        if (response.status === 404) {
          return { envio: null, eventos: [] };
        }
        throw new Error('Erro ao buscar rastreamento');
      }
      return response.json();
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedInput = trackingCode.trim().toUpperCase();
    if (!normalizedInput) return;
    setSearchCode(normalizedInput);
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('entreg')) {
      return "bg-success text-success-foreground";
    }
    if (statusLower.includes('transit') || statusLower.includes('saiu')) {
      return "bg-info text-info-foreground";
    }
    if (statusLower.includes('cancel') || statusLower.includes('devolv')) {
      return "bg-destructive text-destructive-foreground";
    }
    return "bg-muted text-muted-foreground";
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      'pendente': 'Pendente',
      'aguardando_coleta': 'Aguardando Coleta',
      'coletado': 'Coletado',
      'em_transito': 'Em Trânsito',
      'saiu_entrega': 'Saiu para Entrega',
      'entregue': 'Entregue',
      'cancelado': 'Cancelado',
      'devolvido': 'Devolvido'
    };
    return labels[status] || status;
  };

  const envio = data?.envio;
  const eventos = data?.eventos || [];
  const hasResults = !!envio;
  const notFound = searchCode && !isLoading && !isError && !envio;

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Rastreamento de Encomendas
              </h1>
              <p className="text-muted-foreground mt-1">
                Acompanhe suas encomendas em tempo real
              </p>
            </div>
            <EnvioNavigation />
          </div>

          <Card className="mb-8">
            <CardContent className="p-6">
              <form onSubmit={handleSearch} className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Digite o código de rastreamento"
                    className="pl-10 h-12"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    data-testid="input-tracking-code"
                  />
                </div>
                <Button type="submit" size="lg" disabled={isLoading} data-testid="button-search">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Buscando...
                    </>
                  ) : (
                    "Rastrear"
                  )}
                </Button>
              </form>
              <p className="text-sm text-muted-foreground mt-3">
                Exemplo: ME123456789BR
              </p>
            </CardContent>
          </Card>

          {isLoading && (
            <Card className="text-center p-12">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Buscando rastreamento...
              </h3>
              <p className="text-muted-foreground">
                Aguarde enquanto consultamos o status da sua encomenda
              </p>
            </Card>
          )}

          {isError && (
            <Card className="text-center p-12 border-destructive">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Erro ao buscar rastreamento
              </h3>
              <p className="text-muted-foreground">
                {error instanceof Error ? error.message : 'Ocorreu um erro ao buscar o rastreamento. Tente novamente.'}
              </p>
            </Card>
          )}

          {notFound && (
            <Card className="text-center p-12">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Código não encontrado
              </h3>
              <p className="text-muted-foreground">
                O código de rastreamento "{searchCode}" não foi encontrado em nossa base de dados.
              </p>
            </Card>
          )}

          {hasResults && envio && (
            <div className="space-y-6 animate-fade-in">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg" data-testid="text-tracking-code">
                          {envio.codigo_rastreio}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {envio.transportadora_nome || 'Transportadora'} - {envio.servico || 'Serviço'}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(envio.status)} data-testid="badge-status">
                      {getStatusLabel(envio.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-8 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Previsão de entrega:</span>
                      <span className="font-medium text-foreground">
                        {formatarDataPrevisao(envio.data_previsao_entrega)}
                      </span>
                    </div>
                    {envio.destinatario_cidade && envio.destinatario_uf && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Destino:</span>
                        <span className="font-medium text-foreground">
                          {envio.destinatario_cidade}, {envio.destinatario_uf}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Histórico de movimentações</CardTitle>
                </CardHeader>
                <CardContent>
                  {eventos.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      Nenhum evento de rastreamento encontrado.
                    </p>
                  ) : (
                    <div className="relative">
                      {eventos.map((evento, index) => {
                        const { data, hora } = formatarDataBrasileira(evento.data_hora);
                        const isFirst = index === 0;
                        const isLast = index === eventos.length - 1;
                        const isPosted = evento.status.toLowerCase().includes('postado') || 
                                         evento.status.toLowerCase().includes('criado');
                        
                        return (
                          <div key={evento.id} className="flex gap-4 pb-8 last:pb-0" data-testid={`tracking-event-${index}`}>
                            <div className="flex flex-col items-center">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                isFirst ? 'bg-primary text-primary-foreground' : 'bg-muted'
                              }`}>
                                {isFirst ? (
                                  <Truck className="h-5 w-5" />
                                ) : isPosted ? (
                                  <Package className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                  <MapPin className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                              {!isLast && (
                                <div className="w-0.5 h-full bg-border mt-2" />
                              )}
                            </div>

                            <div className="flex-1 pt-1">
                              <div className="flex items-center gap-3 mb-1">
                                <span className="text-sm font-medium text-foreground">
                                  {data}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {hora}
                                </span>
                              </div>
                              <p className="font-medium text-foreground mb-1">
                                {evento.descricao || evento.status}
                              </p>
                              {(evento.local || evento.cidade) && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {evento.local || `${evento.cidade}${evento.uf ? `, ${evento.uf}` : ''}`}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {!searchCode && (
            <Card className="text-center p-12">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Busque seu pedido
              </h3>
              <p className="text-muted-foreground">
                Digite o código de rastreamento para ver o status da sua encomenda
              </p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default EnvioRastreamento;
