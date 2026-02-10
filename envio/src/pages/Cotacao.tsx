import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, Truck, Clock, Shield, Star, ArrowRight } from "lucide-react";
import { useState } from "react";

interface QuoteResult {
  id: string;
  carrier: string;
  service: string;
  price: number;
  deliveryDays: number;
  logo: string;
  recommended?: boolean;
}

const mockResults: QuoteResult[] = [
  {
    id: "1",
    carrier: "Correios",
    service: "SEDEX",
    price: 32.50,
    deliveryDays: 3,
    logo: "📦",
    recommended: true
  },
  {
    id: "2",
    carrier: "Correios",
    service: "PAC",
    price: 21.80,
    deliveryDays: 7,
    logo: "📦"
  },
  {
    id: "3",
    carrier: "Jadlog",
    service: ".Package",
    price: 28.90,
    deliveryDays: 4,
    logo: "🚚"
  },
  {
    id: "4",
    carrier: "Loggi",
    service: "Express",
    price: 35.00,
    deliveryDays: 2,
    logo: "📬"
  },
  {
    id: "5",
    carrier: "Azul Cargo",
    service: "Amanhã",
    price: 89.90,
    deliveryDays: 1,
    logo: "✈️"
  }
];

const Cotacao = () => {
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setShowResults(true);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Cotação de Frete
            </h1>
            <p className="text-lg text-muted-foreground">
              Compare preços e prazos das melhores transportadoras
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Form */}
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
                        <Input id="cepOrigem" placeholder="00000-000" className="mt-1.5" required />
                      </div>
                      <div>
                        <Label htmlFor="cepDestino">CEP de destino</Label>
                        <Input id="cepDestino" placeholder="00000-000" className="mt-1.5" required />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Dimensões do pacote</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="peso">Peso (kg)</Label>
                        <Input id="peso" type="number" step="0.1" placeholder="0.5" className="mt-1.5" required min="0.1" />
                      </div>
                      <div>
                        <Label htmlFor="altura">Altura (cm)</Label>
                        <Input id="altura" type="number" placeholder="10" className="mt-1.5" required min="1" />
                      </div>
                      <div>
                        <Label htmlFor="largura">Largura (cm)</Label>
                        <Input id="largura" type="number" placeholder="15" className="mt-1.5" required min="1" />
                      </div>
                      <div>
                        <Label htmlFor="comprimento">Comprimento (cm)</Label>
                        <Input id="comprimento" type="number" placeholder="20" className="mt-1.5" required min="1" />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Valor declarado</h4>
                    <div>
                      <Label htmlFor="valor">Valor do produto (R$)</Label>
                      <Input id="valor" type="number" step="0.01" placeholder="100.00" className="mt-1.5" />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Calculando..." : "Calcular frete"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Results */}
            <div className="lg:col-span-2">
              {!showResults ? (
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
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">
                      {mockResults.length} opções encontradas
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Ordenado por preço
                    </p>
                  </div>

                  {mockResults.map((result) => (
                    <Card 
                      key={result.id} 
                      className={`hover:border-primary/50 transition-colors ${result.recommended ? 'border-primary ring-1 ring-primary/20' : ''}`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex items-center gap-4">
                            <div className="text-4xl">{result.logo}</div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-foreground">
                                  {result.carrier}
                                </h4>
                                {result.recommended && (
                                  <Badge className="bg-primary text-primary-foreground">
                                    <Star className="h-3 w-3 mr-1" />
                                    Recomendado
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {result.service}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-8">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span className="text-sm">
                                {result.deliveryDays === 1 
                                  ? "1 dia útil" 
                                  : `${result.deliveryDays} dias úteis`
                                }
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Shield className="h-4 w-4" />
                              <span className="text-sm">Seguro incluso</span>
                            </div>

                            <div className="text-right">
                              <p className="text-2xl font-bold text-foreground">
                                R$ {result.price.toFixed(2).replace('.', ',')}
                              </p>
                            </div>

                            <Button className="gap-2">
                              Selecionar
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Cotacao;
