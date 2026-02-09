import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, Truck, Clock, Shield, Star, ArrowRight, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import EnvioNavigation from "./EnvioNavigation";

interface CotacaoFrete {
  id: string;
  transportadora_nome: string;
  servico: string;
  valor_frete: number;
  prazo_dias: number;
}

interface CotacaoRequest {
  cepDestino: string;
  peso: number;
  altura: number;
  largura: number;
  comprimento: number;
  valorDeclarado: number;
}

// CEP de origem fixo (associado ao REID da TotalExpress)
// Este CEP é configurado na conta TotalExpress e não pode ser alterado
const CEP_ORIGEM_FIXO = "32315-090"; // Contagem/MG - Ponto principal

const EnvioCotacao = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [cotacoes, setCotacoes] = useState<CotacaoFrete[]>([]);
  const [formData, setFormData] = useState({
    cepDestino: "",
    peso: "0.5",
    altura: "10",
    largura: "15",
    comprimento: "20",
    valorDeclarado: "100.00"
  });

  const calcularMutation = useMutation({
    mutationFn: async (data: CotacaoRequest) => {
      // Usar a rota pública de cotação TotalExpress (não requer autenticação)
      const response = await fetch("/api/public/frete/cotar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cepDestino: data.cepDestino.replace(/\D/g, ''),
          peso: data.peso,
          altura: data.altura,
          largura: data.largura,
          comprimento: data.comprimento,
          valorDeclarado: data.valorDeclarado
        })
      });
      const result = await response.json();
      
      // A API retorna um único resultado do TotalExpress
      // Transformar em array para compatibilidade com a interface
      if (result.success && result.valor_frete > 0) {
        return [{
          id: 'total-express-1',
          transportadora_nome: result.transportadora_nome,
          servico: result.servico,
          valor_frete: result.valor_frete,
          prazo_dias: result.prazo_dias
        }];
      } else if (result.error) {
        throw new Error(result.error);
      }
      return [];
    },
    onSuccess: (data: CotacaoFrete[]) => {
      setCotacoes(data);
      if (data.length > 0) {
        toast({
          title: "Cotação realizada",
          description: `Frete: R$ ${data[0].valor_frete.toFixed(2).replace('.', ',')} - ${data[0].prazo_dias} dias úteis`
        });
      } else {
        toast({
          variant: "destructive",
          title: "Nenhuma cotação disponível",
          description: "Não foi possível obter cotação para este destino."
        });
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao calcular frete",
        description: error.message || "Verifique se as credenciais TotalExpress estão configuradas."
      });
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cepDestino || formData.cepDestino.replace(/\D/g, '').length < 8) {
      toast({
        variant: "destructive",
        title: "CEP inválido",
        description: "Digite um CEP de destino válido com 8 dígitos."
      });
      return;
    }
    
    const request: CotacaoRequest = {
      cepDestino: formData.cepDestino,
      peso: parseFloat(formData.peso) || 0.5,
      altura: parseFloat(formData.altura) || 10,
      largura: parseFloat(formData.largura) || 15,
      comprimento: parseFloat(formData.comprimento) || 20,
      valorDeclarado: parseFloat(formData.valorDeclarado) || 100
    };

    calcularMutation.mutate(request);
  };

  const getCarrierIcon = (transportadora: string) => {
    const lower = transportadora.toLowerCase();
    if (lower.includes("correios")) return Package;
    if (lower.includes("jadlog")) return Truck;
    return Truck;
  };

  const showResults = cotacoes.length > 0;
  const loading = calcularMutation.isPending;
  const hasError = calcularMutation.isError;

  const handleSelectCotacao = (cotacao: CotacaoFrete) => {
    // Store cotação data in sessionStorage for the next page
    const cotacaoData = {
      ...cotacao,
      cepOrigem: CEP_ORIGEM_FIXO,
      cepDestino: formData.cepDestino,
      peso: formData.peso,
      altura: formData.altura,
      largura: formData.largura,
      comprimento: formData.comprimento,
      valorDeclarado: formData.valorDeclarado
    };
    sessionStorage.setItem('cotacaoSelecionada', JSON.stringify(cotacaoData));
    navigate("/envio/enviar");
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Cotação de Frete
              </h1>
              <p className="text-muted-foreground mt-1">
                Compare preços e prazos das melhores transportadoras
              </p>
            </div>
            <EnvioNavigation />
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Dados do envio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Endereços</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="cepOrigem">CEP de origem</Label>
                        <Input 
                          id="cepOrigem" 
                          value={CEP_ORIGEM_FIXO}
                          className="mt-1.5 bg-muted cursor-not-allowed" 
                          disabled
                          readOnly
                          data-testid="input-cep-origem"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Ponto principal (fixo)</p>
                      </div>
                      <div>
                        <Label htmlFor="cepDestino">CEP de destino</Label>
                        <Input 
                          id="cepDestino" 
                          placeholder="00000-000" 
                          className="mt-1.5" 
                          required
                          value={formData.cepDestino}
                          onChange={handleInputChange}
                          data-testid="input-cep-destino"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Dimensões do pacote</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="peso">Peso (kg)</Label>
                        <Input 
                          id="peso" 
                          type="number" 
                          step="0.1" 
                          placeholder="0.5" 
                          className="mt-1.5" 
                          required 
                          min="0.1"
                          value={formData.peso}
                          onChange={handleInputChange}
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
                          required 
                          min="1"
                          value={formData.altura}
                          onChange={handleInputChange}
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
                          required 
                          min="1"
                          value={formData.largura}
                          onChange={handleInputChange}
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
                          required 
                          min="1"
                          value={formData.comprimento}
                          onChange={handleInputChange}
                          data-testid="input-comprimento"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Valor declarado</h4>
                    <div>
                      <Label htmlFor="valorDeclarado">Valor do produto (R$)</Label>
                      <Input 
                        id="valorDeclarado" 
                        type="number" 
                        step="0.01" 
                        placeholder="100.00" 
                        className="mt-1.5"
                        value={formData.valorDeclarado}
                        onChange={handleInputChange}
                        data-testid="input-valor-declarado"
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading}
                    data-testid="button-calcular-frete"
                  >
                    {loading ? "Calculando..." : "Calcular frete"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="lg:col-span-2">
              {loading && (
                <Card className="h-full flex items-center justify-center min-h-[400px]">
                  <div className="text-center p-8">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <Truck className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Calculando...
                    </h3>
                    <p className="text-muted-foreground">
                      Buscando as melhores opções de frete
                    </p>
                  </div>
                </Card>
              )}

              {hasError && !loading && (
                <Card className="h-full flex items-center justify-center min-h-[400px]">
                  <div className="text-center p-8">
                    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="h-8 w-8 text-destructive" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Erro ao calcular frete
                    </h3>
                    <p className="text-muted-foreground">
                      Verifique os dados e tente novamente
                    </p>
                  </div>
                </Card>
              )}

              {!showResults && !loading && !hasError && (
                <Card className="h-full flex items-center justify-center min-h-[400px]">
                  <div className="text-center p-8">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Truck className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Preencha os dados do envio
                    </h3>
                    <p className="text-muted-foreground">
                      Os resultados aparecerão aqui após o cálculo
                    </p>
                  </div>
                </Card>
              )}

              {showResults && !loading && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">
                      {cotacoes.length} opções encontradas
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Ordenado por preço
                    </p>
                  </div>

                  {cotacoes.map((cotacao, index) => {
                    const IconComponent = getCarrierIcon(cotacao.transportadora_nome);
                    const isRecommended = index === 0;
                    
                    return (
                      <Card 
                        key={cotacao.id} 
                        className={`hover:border-primary/50 transition-colors ${isRecommended ? 'border-primary ring-1 ring-primary/20' : ''}`}
                        data-testid={`card-cotacao-${cotacao.id}`}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                                <IconComponent className="h-6 w-6 text-muted-foreground" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-foreground">
                                    {cotacao.transportadora_nome}
                                  </h4>
                                  {isRecommended && (
                                    <Badge className="bg-primary text-primary-foreground">
                                      <Star className="h-3 w-3 mr-1" />
                                      Recomendado
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {cotacao.servico}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-8">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span className="text-sm" data-testid={`text-prazo-${cotacao.id}`}>
                                  {cotacao.prazo_dias === 1 
                                    ? "1 dia útil" 
                                    : `${cotacao.prazo_dias} dias úteis`
                                  }
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Shield className="h-4 w-4" />
                                <span className="text-sm">Seguro incluso</span>
                              </div>

                              <div className="text-right">
                                <p className="text-2xl font-bold text-foreground" data-testid={`text-valor-${cotacao.id}`}>
                                  R$ {cotacao.valor_frete.toFixed(2).replace('.', ',')}
                                </p>
                              </div>

                              <Button 
                                className="gap-2" 
                                data-testid={`button-selecionar-${cotacao.id}`}
                                onClick={() => handleSelectCotacao(cotacao)}
                              >
                                Selecionar
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EnvioCotacao;
