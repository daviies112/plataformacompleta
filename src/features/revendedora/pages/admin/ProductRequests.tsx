import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Package, ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProductRequest {
  id: string;
  reseller_id: string;
  product_id: string;
  quantity: number;
  notes: string | null;
  status: string;
  created_at: string;
  reseller: {
    id: string;
    nome: string | null;
    telefone: string | null;
    email: string | null;
  } | null;
  product: {
    id: string;
    description: string | null;
    reference: string | null;
    image: string | null;
  } | null;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendente', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'approved', label: 'Aprovado', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'rejected', label: 'Rejeitado', color: 'bg-red-100 text-red-800 border-red-300' },
  { value: 'fulfilled', label: 'Atendido', color: 'bg-blue-100 text-blue-800 border-blue-300' },
];

export default function AdminProductRequests() {
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      console.log('[AdminProductRequests] Loading ALL product requests via API');

      const response = await fetch('/api/split/product-requests', {
        credentials: 'include'
      });
      console.log('[AdminProductRequests] Response status:', response.status);
      
      const result = await response.json();
      console.log('[AdminProductRequests] Response body:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao carregar solicitações');
      }

      console.log('[AdminProductRequests] Loaded', (result.data || []).length, 'requests');
      setRequests(result.data || []);
    } catch (error: any) {
      console.error('[AdminProductRequests] Error loading product requests:', error);
      toast.error('Erro ao carregar solicitações de produtos');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (requestId: string, newStatus: string) => {
    setUpdatingId(requestId);
    try {
      const response = await fetch(`/api/split/product-requests/${requestId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao atualizar status');
      }

      console.log('[AdminProductRequests] Updated status for request:', requestId, 'to:', newStatus);

      setRequests(prev =>
        prev.map(req =>
          req.id === requestId ? { ...req, status: newStatus } : req
        )
      );

      const statusLabel = STATUS_OPTIONS.find(s => s.value === newStatus)?.label || newStatus;
      toast.success(`Status atualizado para: ${statusLabel}`);
    } catch (error: any) {
      console.error('[AdminProductRequests] Error updating status:', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusInfo = STATUS_OPTIONS.find(s => s.value === status);
    if (!statusInfo) {
      return <Badge variant="outline">{status}</Badge>;
    }
    return (
      <Badge className={`${statusInfo.color} border`}>
        {statusInfo.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredRequests = requests.filter(request => {
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      searchTerm === '' ||
      (request.product?.description || '').toLowerCase().includes(searchLower) ||
      (request.product?.reference || '').toLowerCase().includes(searchLower) ||
      (request.reseller?.nome || '').toLowerCase().includes(searchLower) ||
      (request.reseller?.email || '').toLowerCase().includes(searchLower);
    
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando solicitações...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Solicitações de Produtos</h1>
        <p className="text-muted-foreground">
          Gerencie as solicitações de produtos das revendedoras
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Solicitações</CardTitle>
          <CardDescription>
            {filteredRequests.length} solicitaç{filteredRequests.length !== 1 ? 'ões' : 'ão'} encontrada{filteredRequests.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por produto ou revendedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {STATUS_OPTIONS.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center">Qtd.</TableHead>
                  <TableHead>Revendedor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(request.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 border">
                          {request.product?.image ? (
                            <img
                              src={request.product.image}
                              alt={request.product?.description || 'Produto'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="w-6 h-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[200px]">
                            {request.product?.description || 'Produto não encontrado'}
                          </p>
                          {request.product?.reference && (
                            <p className="text-sm text-muted-foreground">
                              REF: {request.product.reference}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {request.quantity}
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-medium truncate max-w-[180px]">
                          {request.reseller?.nome || 'Revendedor não encontrado'}
                        </p>
                        {request.reseller?.telefone && (
                          <p className="text-sm text-muted-foreground">
                            {request.reseller.telefone}
                          </p>
                        )}
                        {request.reseller?.email && (
                          <p className="text-sm text-muted-foreground truncate max-w-[180px]">
                            {request.reseller.email}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(request.status)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={request.status}
                        onValueChange={(value) => updateStatus(request.id, value)}
                        disabled={updatingId === request.id}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Alterar status" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map(status => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredRequests.length === 0 && (
            <div className="text-center py-12">
              <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all'
                  ? 'Nenhuma solicitação encontrada com os filtros aplicados'
                  : 'Nenhuma solicitação de produto registrada ainda'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
