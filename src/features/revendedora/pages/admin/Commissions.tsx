import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getResellerId as getStoredResellerId } from '@/features/revendedora/lib/resellerAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet } from 'lucide-react';
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

export default function AdminCommissions() {
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getResellerId = (): string | null => {
    const storedReseller = getStoredResellerId();
    if (storedReseller) return storedReseller;
    console.error('[AdminCommissions] Reseller ID não encontrado no localStorage');
    return null;
  };

  useEffect(() => {
    loadCommissions();
  }, []);

  const loadCommissions = async () => {
    try {
      const resellerId = getResellerId();
      if (!resellerId) {
        console.error('[AdminCommissions] Cannot load commissions: reseller_id is missing');
        toast.error('Por favor, faça login novamente');
        setLoading(false);
        return;
      }
      console.log('[AdminCommissions] Loading commissions for reseller:', resellerId);

      const { data, error } = await supabase
        .from('commission_splits')
        .select('*')
        .eq('reseller_id', resellerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('[AdminCommissions] Loaded', (data || []).length, 'commissions for reseller:', resellerId);
      setCommissions(data || []);
    } catch (error) {
      console.error('[AdminCommissions] Error loading commissions:', error);
      toast.error('Erro ao carregar comissões');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      pending: { label: 'Pendente', variant: 'outline' },
      released: { label: 'Liberado', variant: 'default' },
      paid: { label: 'Pago', variant: 'default' },
    };
    const statusInfo = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando comissões...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Comissões</h1>
        <p className="text-muted-foreground">
          Gerencie todas as comissões da plataforma
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Comissões</CardTitle>
          <CardDescription>
            {commissions.length} comiss{commissions.length !== 1 ? 'ões' : 'ão'} registrada{commissions.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead>Percentual</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissions.map((commission) => (
                <TableRow key={commission.id}>
                  <TableCell>
                    {commission.created_at ? new Date(commission.created_at).toLocaleDateString('pt-BR') : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">Nível {commission.level || 1}</Badge>
                  </TableCell>
                  <TableCell>{commission.percentage ? `${commission.percentage}%` : '-'}</TableCell>
                  <TableCell className="font-semibold">
                    {commission.amount ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(commission.amount) : '-'}
                  </TableCell>
                  <TableCell>{getStatusBadge(commission.status || 'pending')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {commissions.length === 0 && (
            <div className="text-center py-12">
              <Wallet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma comissão registrada ainda</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}