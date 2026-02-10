import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Package, 
  Search, 
  Plus, 
  Filter, 
  Download, 
  Eye, 
  Printer,
  MoreHorizontal,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import EnvioNavigation from "./EnvioNavigation";
import { Skeleton } from "@/components/ui/skeleton";

interface Envio {
  id: string;
  codigo_rastreio: string;
  destinatario_nome: string;
  destinatario_cidade: string;
  destinatario_uf: string;
  transportadora_nome: string;
  status: 'pendente' | 'aguardando_coleta' | 'coletado' | 'em_transito' | 'saiu_entrega' | 'entregue' | 'cancelado' | 'devolvido';
  created_at: string;
  valor_frete: number;
}

interface Stats {
  total: number;
  pendentes: number;
  em_transito: number;
  entregues: number;
  cancelados: number;
}

type UIStatus = "pending" | "transit" | "delivered" | "cancelled";

const statusConfig: Record<UIStatus, { label: string; icon: typeof Clock; className: string }> = {
  pending: {
    label: "Pendente",
    icon: Clock,
    className: "bg-warning/10 text-warning border-warning/20"
  },
  transit: {
    label: "Em trânsito",
    icon: Truck,
    className: "bg-info/10 text-info border-info/20"
  },
  delivered: {
    label: "Entregue",
    icon: CheckCircle2,
    className: "bg-success/10 text-success border-success/20"
  },
  cancelled: {
    label: "Cancelado",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20"
  }
};

function mapApiStatusToUIStatus(apiStatus: Envio['status']): UIStatus {
  switch (apiStatus) {
    case 'pendente':
    case 'aguardando_coleta':
      return 'pending';
    case 'coletado':
    case 'em_transito':
    case 'saiu_entrega':
      return 'transit';
    case 'entregue':
      return 'delivered';
    case 'cancelado':
    case 'devolvido':
      return 'cancelled';
    default:
      return 'pending';
  }
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return dateString;
  }
}

const EnvioList = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const { data: envios = [], isLoading: isLoadingEnvios, error: enviosError } = useQuery<Envio[]>({
    queryKey: ['/api/envio/envios'],
  });

  const { data: stats, isLoading: isLoadingStats } = useQuery<Stats>({
    queryKey: ['/api/envio/envios/stats'],
  });

  const filteredShipments = envios.filter(s => 
    s.codigo_rastreio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.destinatario_nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filterByTab = (shipments: Envio[], tab: string): Envio[] => {
    if (tab === 'all') return shipments;
    return shipments.filter(s => mapApiStatusToUIStatus(s.status) === tab);
  };

  if (enviosError) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container py-8">
          <Card>
            <CardContent className="p-8">
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <h2 className="text-xl font-semibold">Erro ao carregar envios</h2>
                <p className="text-muted-foreground">
                  {enviosError instanceof Error ? enviosError.message : 'Ocorreu um erro ao carregar os dados.'}
                </p>
                <Button onClick={() => window.location.reload()}>
                  Tentar novamente
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8">
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Meus Envios
              </h1>
              <p className="text-muted-foreground mt-1">
                Gerencie todos os seus envios em um só lugar
              </p>
            </div>
            <EnvioNavigation />
          </div>
          <div className="flex justify-end">
            <Button className="gap-2" onClick={() => navigate("/envio")}>
              <Plus className="h-4 w-4" />
              Novo envio
            </Button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  {isLoadingStats ? (
                    <Skeleton className="h-8 w-12 mb-1" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{stats?.total ?? 0}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Total de envios</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
                <div>
                  {isLoadingStats ? (
                    <Skeleton className="h-8 w-12 mb-1" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{stats?.pendentes ?? 0}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-info/10 flex items-center justify-center">
                  <Truck className="h-6 w-6 text-info" />
                </div>
                <div>
                  {isLoadingStats ? (
                    <Skeleton className="h-8 w-12 mb-1" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{stats?.em_transito ?? 0}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Em trânsito</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <div>
                  {isLoadingStats ? (
                    <Skeleton className="h-8 w-12 mb-1" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{stats?.entregues ?? 0}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Entregues</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por código ou destinatário" 
                  className="pl-9" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-envios"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2" data-testid="button-filter">
                  <Filter className="h-4 w-4" />
                  Filtros
                </Button>
                <Button variant="outline" size="sm" className="gap-2" data-testid="button-export">
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all" data-testid="tab-all">Todos</TabsTrigger>
                <TabsTrigger value="pending" data-testid="tab-pending">Pendentes</TabsTrigger>
                <TabsTrigger value="transit" data-testid="tab-transit">Em trânsito</TabsTrigger>
                <TabsTrigger value="delivered" data-testid="tab-delivered">Entregues</TabsTrigger>
              </TabsList>

              {["all", "pending", "transit", "delivered"].map((tab) => (
                <TabsContent key={tab} value={tab}>
                  {isLoadingEnvios ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Destinatário</TableHead>
                          <TableHead>Destino</TableHead>
                          <TableHead>Transportadora</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filterByTab(filteredShipments, tab).map((shipment) => {
                          const uiStatus = mapApiStatusToUIStatus(shipment.status);
                          const status = statusConfig[uiStatus];
                          const StatusIcon = status.icon;
                          
                          return (
                            <TableRow key={shipment.id} data-testid={`row-envio-${shipment.id}`}>
                              <TableCell className="font-mono font-medium">
                                {shipment.codigo_rastreio || '-'}
                              </TableCell>
                              <TableCell>{shipment.destinatario_nome || '-'}</TableCell>
                              <TableCell>
                                {shipment.destinatario_cidade && shipment.destinatario_uf 
                                  ? `${shipment.destinatario_cidade}, ${shipment.destinatario_uf}`
                                  : '-'}
                              </TableCell>
                              <TableCell>{shipment.transportadora_nome || '-'}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={status.className}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {status.label}
                                </Badge>
                              </TableCell>
                              <TableCell>{formatDate(shipment.created_at)}</TableCell>
                              <TableCell>
                                R$ {(shipment.valor_frete || 0).toFixed(2).replace('.', ',')}
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" data-testid={`button-actions-${shipment.id}`}>
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem className="gap-2" data-testid={`button-view-${shipment.id}`}>
                                      <Eye className="h-4 w-4" />
                                      Ver detalhes
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="gap-2" data-testid={`button-print-${shipment.id}`}>
                                      <Printer className="h-4 w-4" />
                                      Imprimir etiqueta
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {filterByTab(filteredShipments, tab).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                              Nenhum envio encontrado nesta categoria.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default EnvioList;
