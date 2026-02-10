import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Package, 
  User, 
  MapPin, 
  FileText, 
  CheckCircle2, 
  Printer,
  Loader2,
  AlertCircle,
  Copy,
  Truck,
  Search,
  History,
  X
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import EnvioNavigation from "./EnvioNavigation";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ContratoPendente {
  id: string;
  client_name: string;
  client_cpf?: string;
  client_email?: string;
  client_phone?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_city?: string;
  address_state?: string;
  address_zipcode?: string;
  signed_at?: string;
}

interface TotalExpressRegistroRequest {
  envio_id?: string;
  pedido: string;
  destinatarioNome: string;
  destinatarioCpfCnpj?: string;
  destinatarioTelefone?: string;
  destinatarioEmail?: string;
  destinatarioCep: string;
  destinatarioLogradouro?: string;
  destinatarioNumero?: string;
  destinatarioComplemento?: string;
  destinatarioBairro?: string;
  destinatarioCidade?: string;
  destinatarioUf?: string;
  peso: number;
  altura: number;
  largura: number;
  comprimento: number;
  valorDeclarado: number;
  descricaoConteudo?: string;
  custoFrete?: number;
}

interface TotalExpressRegistroResponse {
  success: boolean;
  awb?: string;
  codigoRastreio?: string;
  etiquetaUrl?: string;
  numeroPedido?: string;
  error?: string;
}

interface EnvioResult {
  id: string;
  codigo_rastreio: string;
  status: string;
  etiquetaUrl?: string;
}

interface CotacaoSelecionada {
  id: string;
  transportadora_nome: string;
  servico: string;
  valor_frete: number;
  prazo_dias: number;
  cepOrigem: string;
  cepDestino: string;
  peso: string;
  altura: string;
  largura: string;
  comprimento: string;
  valorDeclarado: string;
}

interface DestinatarioAnterior {
  id: string;
  destinatario_nome: string;
  destinatario_cpf_cnpj?: string;
  destinatario_telefone?: string;
  destinatario_email?: string;
  destinatario_cep?: string;
  destinatario_logradouro?: string;
  destinatario_numero?: string;
  destinatario_complemento?: string;
  destinatario_bairro?: string;
  destinatario_cidade?: string;
  destinatario_uf?: string;
  ultimo_envio?: string;
}

const EnvioEnviar = () => {
  const { toast } = useToast();
  const [selectedContrato, setSelectedContrato] = useState<ContratoPendente | null>(null);
  const [envioResult, setEnvioResult] = useState<EnvioResult | null>(null);
  const [cotacaoSelecionada, setCotacaoSelecionada] = useState<CotacaoSelecionada | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedDestinatario, setSelectedDestinatario] = useState<DestinatarioAnterior | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [formData, setFormData] = useState({
    peso: "",
    altura: "",
    largura: "",
    comprimento: "",
    valor_declarado: ""
  });

  // Load cotação data from sessionStorage on mount
  useEffect(() => {
    const cotacaoData = sessionStorage.getItem('cotacaoSelecionada');
    if (cotacaoData) {
      try {
        const cotacao = JSON.parse(cotacaoData) as CotacaoSelecionada;
        setCotacaoSelecionada(cotacao);
        setFormData({
          peso: cotacao.peso || "",
          altura: cotacao.altura || "",
          largura: cotacao.largura || "",
          comprimento: cotacao.comprimento || "",
          valor_declarado: cotacao.valorDeclarado || ""
        });
        setAddressData(prev => ({
          ...prev,
          cep: cotacao.cepDestino || ""
        }));
      } catch (e) {
        console.error("Error parsing cotacao data:", e);
      }
    }
  }, []);

  const [addressData, setAddressData] = useState({
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    cep: ""
  });

  const { data: contratos = [], isLoading, error } = useQuery<ContratoPendente[]>({
    queryKey: ['/api/envio/contratos-pendentes'],
  });

  const { data: destinatariosAnteriores = [], isLoading: isLoadingDestinatarios } = useQuery<DestinatarioAnterior[]>({
    queryKey: ['/api/envio/envios/destinatarios', debouncedSearch],
    queryFn: async () => {
      const response = await fetch(`/api/envio/envios/destinatarios?search=${encodeURIComponent(debouncedSearch)}&limit=10`);
      if (!response.ok) throw new Error('Erro ao buscar destinatários');
      return response.json();
    },
    enabled: showSearchResults || debouncedSearch.length > 0,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectDestinatario = (destinatario: DestinatarioAnterior) => {
    setSelectedDestinatario(destinatario);
    setSelectedContrato(null);
    setShowSearchResults(false);
    setSearchQuery("");
    setEnvioResult(null);
    setFormData({
      peso: cotacaoSelecionada?.peso || "",
      altura: cotacaoSelecionada?.altura || "",
      largura: cotacaoSelecionada?.largura || "",
      comprimento: cotacaoSelecionada?.comprimento || "",
      valor_declarado: cotacaoSelecionada?.valorDeclarado || ""
    });
    setAddressData({
      rua: destinatario.destinatario_logradouro || "",
      numero: destinatario.destinatario_numero || "",
      complemento: destinatario.destinatario_complemento || "",
      bairro: destinatario.destinatario_bairro || "",
      cidade: destinatario.destinatario_cidade || "",
      uf: destinatario.destinatario_uf || "",
      cep: destinatario.destinatario_cep || cotacaoSelecionada?.cepDestino || ""
    });
    toast({
      title: "Destinatário selecionado",
      description: `${destinatario.destinatario_nome} - ${destinatario.destinatario_cidade}, ${destinatario.destinatario_uf}`
    });
  };

  const clearDestinatario = () => {
    setSelectedDestinatario(null);
    setAddressData({
      rua: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      uf: "",
      cep: ""
    });
  };

  const createEnvioMutation = useMutation({
    mutationFn: async (data: TotalExpressRegistroRequest) => {
      const response = await apiRequest("POST", "/api/envio/total-express/registrar", data);
      return response.json();
    },
    onSuccess: (data: TotalExpressRegistroResponse) => {
      if (data.success && data.codigoRastreio) {
        setEnvioResult({
          id: data.numeroPedido || '',
          codigo_rastreio: data.codigoRastreio,
          status: 'aguardando_coleta',
          etiquetaUrl: data.etiquetaUrl
        });
        queryClient.invalidateQueries({ queryKey: ['/api/envio/contratos-pendentes'] });
        queryClient.invalidateQueries({ queryKey: ['/api/envio/envios'] });
        toast({
          title: "Envio registrado na TotalExpress!",
          description: `Código de rastreio: ${data.codigoRastreio}`
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao registrar envio",
          description: data.error || "Não foi possível obter o código de rastreio"
        });
      }
    },
    onError: (error: any) => {
      const errorData = error?.data || {};
      toast({
        variant: "destructive",
        title: "Erro ao criar envio",
        description: errorData.error || error.message || "Tente novamente mais tarde."
      });
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setAddressData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectContrato = (contrato: ContratoPendente) => {
    setSelectedContrato(contrato);
    setEnvioResult(null);
    setFormData({
      peso: cotacaoSelecionada?.peso || "",
      altura: cotacaoSelecionada?.altura || "",
      largura: cotacaoSelecionada?.largura || "",
      comprimento: cotacaoSelecionada?.comprimento || "",
      valor_declarado: cotacaoSelecionada?.valorDeclarado || ""
    });
    setAddressData({
      rua: contrato.address_street || "",
      numero: contrato.address_number || "",
      complemento: contrato.address_complement || "",
      bairro: "",
      cidade: contrato.address_city || "",
      uf: contrato.address_state || "",
      cep: contrato.address_zipcode || cotacaoSelecionada?.cepDestino || ""
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedContrato && !selectedDestinatario) return;

    if (!addressData.cep || addressData.cep.trim() === "") {
      toast({
        variant: "destructive",
        title: "CEP obrigatório",
        description: "Por favor, preencha o CEP para criar o envio."
      });
      return;
    }

    const sourceId = selectedContrato?.id || selectedDestinatario?.id || Date.now().toString();
    const pedido = `PED-${sourceId.substring(0, 8).toUpperCase()}-${Date.now().toString().slice(-6)}`;

    const request: TotalExpressRegistroRequest = {
      pedido,
      destinatarioNome: selectedContrato?.client_name || selectedDestinatario?.destinatario_nome || "",
      destinatarioCpfCnpj: selectedContrato?.client_cpf || selectedDestinatario?.destinatario_cpf_cnpj,
      destinatarioEmail: selectedContrato?.client_email || selectedDestinatario?.destinatario_email,
      destinatarioTelefone: selectedContrato?.client_phone || selectedDestinatario?.destinatario_telefone,
      destinatarioLogradouro: addressData.rua,
      destinatarioNumero: addressData.numero,
      destinatarioComplemento: addressData.complemento,
      destinatarioBairro: addressData.bairro || '',
      destinatarioCidade: addressData.cidade,
      destinatarioUf: addressData.uf,
      destinatarioCep: addressData.cep,
      peso: parseFloat(formData.peso) || 0.5,
      altura: parseFloat(formData.altura) || 10,
      largura: parseFloat(formData.largura) || 10,
      comprimento: parseFloat(formData.comprimento) || 10,
      valorDeclarado: parseFloat(formData.valor_declarado) || 50,
      descricaoConteudo: 'Produtos',
      custoFrete: cotacaoSelecionada?.valor_frete || 0
    };

    createEnvioMutation.mutate(request);
  };

  const handleCopyTracking = () => {
    if (envioResult?.codigo_rastreio) {
      navigator.clipboard.writeText(envioResult.codigo_rastreio);
      toast({
        title: "Código copiado!",
        description: "O código de rastreio foi copiado para a área de transferência."
      });
    }
  };

  const handlePrintLabel = () => {
    if (envioResult?.codigo_rastreio) {
      window.open(`/api/envio/total-express/etiqueta/${envioResult.codigo_rastreio}`, '_blank');
    }
  };

  const handleNewEnvio = () => {
    setSelectedContrato(null);
    setSelectedDestinatario(null);
    setEnvioResult(null);
    setSearchQuery("");
    setFormData({
      peso: "",
      altura: "",
      largura: "",
      comprimento: "",
      valor_declarado: ""
    });
    setAddressData({
      rua: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      uf: "",
      cep: ""
    });
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container py-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  Criar Envio
                </h1>
                <p className="text-muted-foreground mt-1">
                  Envie produtos de contratos assinados
                </p>
              </div>
              <EnvioNavigation />
            </div>
            <Card>
              <CardContent className="p-8">
                <div className="flex flex-col items-center justify-center gap-4 text-center">
                  <AlertCircle className="h-12 w-12 text-destructive" />
                  <h2 className="text-xl font-semibold">Erro ao carregar contratos</h2>
                  <p className="text-muted-foreground">
                    {error instanceof Error ? error.message : 'Ocorreu um erro ao carregar os dados.'}
                  </p>
                  <Button onClick={() => window.location.reload()} data-testid="button-retry">
                    Tentar novamente
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Criar Envio
              </h1>
              <p className="text-muted-foreground mt-1">
                Envie produtos de contratos assinados
              </p>
            </div>
            <EnvioNavigation />
          </div>

          {/* Cotação Selecionada */}
          {cotacaoSelecionada && (
            <Card className="mb-6 border-primary/50 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Truck className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-foreground">
                          {cotacaoSelecionada.transportadora_nome}
                        </h4>
                        <Badge className="bg-primary text-primary-foreground">
                          Cotação Selecionada
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {cotacaoSelecionada.servico} - {cotacaoSelecionada.prazo_dias} dias úteis
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">CEP:</span> {cotacaoSelecionada.cepOrigem} → {cotacaoSelecionada.cepDestino}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        R$ {cotacaoSelecionada.valor_frete.toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <History className="h-5 w-5 text-amber-500" />
                    Reenviar para Destinatário
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div ref={searchRef} className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nome..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowSearchResults(true);
                        }}
                        onFocus={() => setShowSearchResults(true)}
                        className="pl-9 pr-8"
                        data-testid="input-search-destinatario"
                      />
                      {searchQuery && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                          onClick={() => {
                            setSearchQuery("");
                            setShowSearchResults(false);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    
                    {showSearchResults && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-64 overflow-auto">
                        {isLoadingDestinatarios ? (
                          <div className="p-3 text-center">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          </div>
                        ) : destinatariosAnteriores.length === 0 ? (
                          <div className="p-3 text-center text-sm text-muted-foreground">
                            {searchQuery ? "Nenhum destinatário encontrado" : "Digite para buscar"}
                          </div>
                        ) : (
                          destinatariosAnteriores.map((dest) => (
                            <div
                              key={dest.id}
                              className="p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
                              onClick={() => handleSelectDestinatario(dest)}
                              data-testid={`option-destinatario-${dest.id}`}
                            >
                              <div className="font-medium text-sm">{dest.destinatario_nome}</div>
                              <div className="text-xs text-muted-foreground">
                                {dest.destinatario_cidade}, {dest.destinatario_uf} - CEP: {dest.destinatario_cep}
                              </div>
                              {dest.ultimo_envio && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Último envio: {formatDate(dest.ultimo_envio)}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  
                  {selectedDestinatario && (
                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium text-sm flex items-center gap-2">
                            <History className="h-4 w-4 text-amber-600" />
                            {selectedDestinatario.destinatario_nome}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {selectedDestinatario.destinatario_cidade}, {selectedDestinatario.destinatario_uf}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={clearDestinatario}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Contratos Pendentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                      ))}
                    </div>
                  ) : contratos.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Nenhum contrato pendente de envio
                      </p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-3">
                        {contratos.map((contrato) => (
                          <Card
                            key={contrato.id}
                            className={`cursor-pointer transition-all hover:border-primary/50 ${
                              selectedContrato?.id === contrato.id 
                                ? 'border-primary ring-1 ring-primary/20' 
                                : ''
                            }`}
                            onClick={() => {
                              handleSelectContrato(contrato);
                              setSelectedDestinatario(null);
                            }}
                            data-testid={`card-contrato-${contrato.id}`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h4 className="font-medium text-foreground line-clamp-1">
                                  {contrato.client_name}
                                </h4>
                                <Badge variant="outline" className="shrink-0">
                                  {formatDate(contrato.signed_at || "")}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">
                                {contrato.address_city}, {contrato.address_state}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              {envioResult ? (
                <Card>
                  <CardContent className="p-8">
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="h-10 w-10 text-success" />
                      </div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">
                        Envio Criado com Sucesso!
                      </h2>
                      <p className="text-muted-foreground mb-6">
                        O envio foi registrado e está pronto para coleta
                      </p>

                      <Card className="bg-muted/50 mb-6">
                        <CardContent className="p-6">
                          <Label className="text-sm text-muted-foreground">
                            Código de Rastreio
                          </Label>
                          <div className="flex items-center justify-center gap-3 mt-2">
                            <span 
                              className="text-3xl font-mono font-bold text-foreground tracking-wider"
                              data-testid="text-tracking-code"
                            >
                              {envioResult.codigo_rastreio}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={handleCopyTracking}
                              data-testid="button-copy-tracking"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button 
                          className="gap-2"
                          onClick={handlePrintLabel}
                          data-testid="button-print-label"
                        >
                          <Printer className="h-4 w-4" />
                          Imprimir Etiqueta
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={handleNewEnvio}
                          data-testid="button-new-envio"
                        >
                          Criar Novo Envio
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : !selectedContrato && !selectedDestinatario ? (
                <Card className="h-full flex items-center justify-center min-h-[500px]">
                  <div className="text-center p-8">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Selecione um destinatário
                    </h3>
                    <p className="text-muted-foreground">
                      Escolha um contrato pendente ou busque um destinatário anterior
                    </p>
                  </div>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-primary" />
                      Dados do Envio
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-foreground">
                          <User className="h-4 w-4" />
                          <h4 className="font-medium">Dados do Cliente</h4>
                          {selectedDestinatario && (
                            <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                              <History className="h-3 w-3 mr-1" />
                              Reenvio
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="nome">Nome</Label>
                            <Input 
                              id="nome" 
                              value={selectedContrato?.client_name || selectedDestinatario?.destinatario_nome || ''} 
                              readOnly 
                              className="mt-1.5 bg-muted"
                              data-testid="input-nome"
                            />
                          </div>
                          <div>
                            <Label htmlFor="cpf">CPF</Label>
                            <Input 
                              id="cpf" 
                              value={selectedContrato?.client_cpf || selectedDestinatario?.destinatario_cpf_cnpj || ''} 
                              readOnly 
                              className="mt-1.5 bg-muted"
                              data-testid="input-cpf"
                            />
                          </div>
                          <div>
                            <Label htmlFor="email">Email</Label>
                            <Input 
                              id="email" 
                              value={selectedContrato?.client_email || selectedDestinatario?.destinatario_email || ''} 
                              readOnly 
                              className="mt-1.5 bg-muted"
                              data-testid="input-email"
                            />
                          </div>
                          <div>
                            <Label htmlFor="telefone">Telefone</Label>
                            <Input 
                              id="telefone" 
                              value={selectedContrato?.client_phone || selectedDestinatario?.destinatario_telefone || ''} 
                              readOnly 
                              className="mt-1.5 bg-muted"
                              data-testid="input-telefone"
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-foreground">
                          <MapPin className="h-4 w-4" />
                          <h4 className="font-medium">Endereço de Entrega</h4>
                        </div>
                        {!addressData.cep && (
                          <div className="flex items-center gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                            <p className="text-sm text-amber-700 dark:text-amber-300">
                              Endereço incompleto. Por favor, preencha os campos obrigatórios.
                            </p>
                          </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="sm:col-span-2">
                            <Label htmlFor="rua">Rua</Label>
                            <Input 
                              id="rua" 
                              value={addressData.rua}
                              onChange={handleAddressChange}
                              placeholder="Digite a rua"
                              className="mt-1.5"
                              data-testid="input-rua"
                            />
                          </div>
                          <div>
                            <Label htmlFor="numero">Número</Label>
                            <Input 
                              id="numero" 
                              value={addressData.numero}
                              onChange={handleAddressChange}
                              placeholder="Nº"
                              className="mt-1.5"
                              data-testid="input-numero"
                            />
                          </div>
                          <div>
                            <Label htmlFor="complemento">Complemento</Label>
                            <Input 
                              id="complemento" 
                              value={addressData.complemento}
                              onChange={handleAddressChange}
                              placeholder="Apto, Bloco, etc."
                              className="mt-1.5"
                              data-testid="input-complemento"
                            />
                          </div>
                          <div>
                            <Label htmlFor="cidade">Cidade</Label>
                            <Input 
                              id="cidade" 
                              value={addressData.cidade}
                              onChange={handleAddressChange}
                              placeholder="Cidade"
                              className="mt-1.5"
                              data-testid="input-cidade"
                            />
                          </div>
                          <div>
                            <Label htmlFor="uf">Estado</Label>
                            <Input 
                              id="uf" 
                              value={addressData.uf}
                              onChange={handleAddressChange}
                              placeholder="UF"
                              maxLength={2}
                              className="mt-1.5"
                              data-testid="input-uf"
                            />
                          </div>
                          <div>
                            <Label htmlFor="cep">CEP <span className="text-destructive">*</span></Label>
                            <Input 
                              id="cep" 
                              value={addressData.cep}
                              onChange={handleAddressChange}
                              placeholder="00000-000"
                              className="mt-1.5"
                              data-testid="input-cep"
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-foreground">
                          <Package className="h-4 w-4" />
                          <h4 className="font-medium">Dimensões do Pacote</h4>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="peso">Peso (kg)</Label>
                            <Input 
                              id="peso" 
                              type="number" 
                              step="0.1" 
                              placeholder="0.5" 
                              className="mt-1.5"
                              value={formData.peso}
                              onChange={handleInputChange}
                              required
                              min="0.1"
                              data-testid="input-peso"
                            />
                          </div>
                          <div>
                            <Label htmlFor="altura">Altura (cm)</Label>
                            <Input 
                              id="altura" 
                              type="number" 
                              placeholder="10" 
                              className="mt-1.5"
                              value={formData.altura}
                              onChange={handleInputChange}
                              required
                              min="1"
                              data-testid="input-altura"
                            />
                          </div>
                          <div>
                            <Label htmlFor="largura">Largura (cm)</Label>
                            <Input 
                              id="largura" 
                              type="number" 
                              placeholder="15" 
                              className="mt-1.5"
                              value={formData.largura}
                              onChange={handleInputChange}
                              required
                              min="1"
                              data-testid="input-largura"
                            />
                          </div>
                          <div>
                            <Label htmlFor="comprimento">Comprimento (cm)</Label>
                            <Input 
                              id="comprimento" 
                              type="number" 
                              placeholder="20" 
                              className="mt-1.5"
                              value={formData.comprimento}
                              onChange={handleInputChange}
                              required
                              min="1"
                              data-testid="input-comprimento"
                            />
                          </div>
                          <div className="col-span-2 sm:col-span-2">
                            <Label htmlFor="valor_declarado">Valor Declarado (R$)</Label>
                            <Input 
                              id="valor_declarado" 
                              type="number" 
                              step="0.01" 
                              placeholder="100.00" 
                              className="mt-1.5"
                              value={formData.valor_declarado}
                              onChange={handleInputChange}
                              required
                              min="0"
                              data-testid="input-valor-declarado"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setSelectedContrato(null)}
                          className="flex-1"
                          data-testid="button-cancel"
                        >
                          Cancelar
                        </Button>
                        <Button 
                          type="submit" 
                          className="flex-1 gap-2"
                          disabled={createEnvioMutation.isPending}
                          data-testid="button-create-envio"
                        >
                          {createEnvioMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Criando...
                            </>
                          ) : (
                            <>
                              <Package className="h-4 w-4" />
                              Criar Envio
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EnvioEnviar;
