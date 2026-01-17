import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  XCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import { useState } from "react";

interface Shipment {
  id: string;
  trackingCode: string;
  recipient: string;
  destination: string;
  carrier: string;
  status: "pending" | "transit" | "delivered" | "cancelled";
  createdAt: string;
  price: number;
}

const mockShipments: Shipment[] = [
  {
    id: "1",
    trackingCode: "ME123456789BR",
    recipient: "João Silva",
    destination: "São Paulo, SP",
    carrier: "Correios",
    status: "transit",
    createdAt: "23/12/2024",
    price: 32.50
  },
  {
    id: "2",
    trackingCode: "ME987654321BR",
    recipient: "Maria Santos",
    destination: "Rio de Janeiro, RJ",
    carrier: "Jadlog",
    status: "delivered",
    createdAt: "22/12/2024",
    price: 28.90
  },
  {
    id: "3",
    trackingCode: "ME456789123BR",
    recipient: "Pedro Costa",
    destination: "Belo Horizonte, MG",
    carrier: "Loggi",
    status: "pending",
    createdAt: "21/12/2024",
    price: 45.00
  },
  {
    id: "4",
    trackingCode: "ME789123456BR",
    recipient: "Ana Lima",
    destination: "Curitiba, PR",
    carrier: "Correios",
    status: "delivered",
    createdAt: "20/12/2024",
    price: 21.80
  },
  {
    id: "5",
    trackingCode: "ME321654987BR",
    recipient: "Carlos Oliveira",
    destination: "Porto Alegre, RS",
    carrier: "Azul Cargo",
    status: "cancelled",
    createdAt: "19/12/2024",
    price: 89.90
  }
];

const statusConfig = {
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

const Envios = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredShipments = mockShipments.filter(s => 
    s.trackingCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.recipient.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: mockShipments.length,
    pending: mockShipments.filter(s => s.status === "pending").length,
    transit: mockShipments.filter(s => s.status === "transit").length,
    delivered: mockShipments.filter(s => s.status === "delivered").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Meus Envios
            </h1>
            <p className="text-muted-foreground">
              Gerencie todos os seus envios em um só lugar
            </p>
          </div>
          <Button asChild className="gap-2">
            <Link to="/">
              <Plus className="h-4 w-4" />
              Novo envio
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
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
                  <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
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
                  <p className="text-2xl font-bold text-foreground">{stats.transit}</p>
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
                  <p className="text-2xl font-bold text-foreground">{stats.delivered}</p>
                  <p className="text-sm text-muted-foreground">Entregues</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Table */}
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
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="pending">Pendentes</TabsTrigger>
                <TabsTrigger value="transit">Em trânsito</TabsTrigger>
                <TabsTrigger value="delivered">Entregues</TabsTrigger>
              </TabsList>

              {["all", "pending", "transit", "delivered"].map((tab) => (
                <TabsContent key={tab} value={tab}>
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
                      {filteredShipments
                        .filter(s => tab === "all" || s.status === tab)
                        .map((shipment) => {
                          const status = statusConfig[shipment.status];
                          const StatusIcon = status.icon;
                          
                          return (
                            <TableRow key={shipment.id}>
                              <TableCell className="font-mono font-medium">
                                {shipment.trackingCode}
                              </TableCell>
                              <TableCell>{shipment.recipient}</TableCell>
                              <TableCell>{shipment.destination}</TableCell>
                              <TableCell>{shipment.carrier}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={status.className}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {status.label}
                                </Badge>
                              </TableCell>
                              <TableCell>{shipment.createdAt}</TableCell>
                              <TableCell>
                                R$ {shipment.price.toFixed(2).replace('.', ',')}
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem className="gap-2">
                                      <Eye className="h-4 w-4" />
                                      Ver detalhes
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="gap-2">
                                      <Printer className="h-4 w-4" />
                                      Imprimir etiqueta
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      {filteredShipments.filter(s => tab === "all" || s.status === tab).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            Nenhum envio encontrado nesta categoria.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Envios;
