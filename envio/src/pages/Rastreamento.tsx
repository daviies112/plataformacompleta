import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Package, MapPin, CheckCircle2, Truck, Clock } from "lucide-react";
import { useState } from "react";

interface TrackingEvent {
  date: string;
  time: string;
  location: string;
  status: string;
  description: string;
}

const mockTracking = {
  code: "ME123456789BR",
  carrier: "Correios",
  service: "SEDEX",
  status: "Em trânsito",
  estimatedDelivery: "25/12/2024",
  events: [
    {
      date: "23/12/2024",
      time: "14:30",
      location: "São Paulo, SP",
      status: "Em trânsito",
      description: "Objeto em transferência - por favor aguarde"
    },
    {
      date: "23/12/2024",
      time: "08:15",
      location: "São Paulo, SP",
      status: "Em trânsito",
      description: "Objeto saiu para entrega ao destinatário"
    },
    {
      date: "22/12/2024",
      time: "22:00",
      location: "Campinas, SP",
      status: "Em trânsito",
      description: "Objeto encaminhado"
    },
    {
      date: "22/12/2024",
      time: "16:45",
      location: "Campinas, SP",
      status: "Em trânsito",
      description: "Objeto recebido pelos Correios do Brasil"
    },
    {
      date: "21/12/2024",
      time: "10:00",
      location: "Online",
      status: "Postado",
      description: "Objeto postado"
    }
  ]
};

const Rastreamento = () => {
  const [trackingCode, setTrackingCode] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedInput = trackingCode.trim().toUpperCase();
    if (!normalizedInput) return;
    
    setLoading(true);
    setTimeout(() => {
      // Simulando que o código "ERRO" ou códigos vazios não retornam nada
      if (normalizedInput === "ERRO") {
        setShowResults(false);
      } else {
        setShowResults(true);
      }
      setLoading(false);
    }, 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Entregue":
        return "bg-success text-success-foreground";
      case "Em trânsito":
        return "bg-info text-info-foreground";
      case "Postado":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Rastreamento de Encomendas
            </h1>
            <p className="text-lg text-muted-foreground">
              Acompanhe suas encomendas em tempo real
            </p>
          </div>

          {/* Search Form */}
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
                  />
                </div>
                <Button type="submit" size="lg" disabled={loading}>
                  {loading ? "Buscando..." : "Rastrear"}
                </Button>
              </form>
              <p className="text-sm text-muted-foreground mt-3">
                Exemplo: ME123456789BR, JD123456789BR
              </p>
            </CardContent>
          </Card>

          {/* Results */}
          {showResults && (
            <div className="space-y-6 animate-fade-in">
              {/* Summary Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-success-light flex items-center justify-center">
                        <Package className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{mockTracking.code}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {mockTracking.carrier} - {mockTracking.service}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(mockTracking.status)}>
                      {mockTracking.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-8 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Previsão de entrega:</span>
                      <span className="font-medium text-foreground">{mockTracking.estimatedDelivery}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de movimentações</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    {mockTracking.events.map((event, index) => (
                      <div key={index} className="flex gap-4 pb-8 last:pb-0">
                        {/* Timeline line */}
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            index === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          }`}>
                            {index === 0 ? (
                              <Truck className="h-5 w-5" />
                            ) : event.status === "Postado" ? (
                              <Package className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <MapPin className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          {index < mockTracking.events.length - 1 && (
                            <div className="w-0.5 h-full bg-border mt-2" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 pt-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-sm font-medium text-foreground">
                              {event.date}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {event.time}
                            </span>
                          </div>
                          <p className="font-medium text-foreground mb-1">
                            {event.description}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Empty State */}
          {!showResults && (
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

export default Rastreamento;
