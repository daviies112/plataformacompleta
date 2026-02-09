import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  FileText,
  TrendingUp,
  Wallet,
  Store,
  Building2,
  Calendar,
  UserPlus,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Reseller = {
  id: string;
  company_id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  cpf_cnpj: string | null;
  store_url: string | null;
  store_slug: string | null;
  commission_percentage: number | null;
  level: number | null;
  sponsor_id: string | null;
  available_balance: number | null;
  pending_balance: number | null;
  total_sales: number | null;
  total_commissions: number | null;
  bank_account: any;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

export default function ResellerDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: reseller, isLoading, isError } = useQuery({
    queryKey: ['/api/resellers', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resellers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Reseller;
    },
    enabled: !!id,
  });

  const { data: sponsor, isError: isSponsorError } = useQuery({
    queryKey: ['/api/resellers', reseller?.sponsor_id],
    queryFn: async () => {
      if (!reseller?.sponsor_id) return null;
      
      const { data, error } = await supabase
        .from('resellers')
        .select('id, full_name, email')
        .eq('id', reseller.sponsor_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!reseller?.sponsor_id,
  });

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const formatPercentage = (value: number | null) => {
    if (value === null || value === undefined) return '0%';
    return `${value.toFixed(2)}%`;
  };

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar dados dos revendedores. Verifique sua conexão ou tente novamente.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!reseller) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-xl text-muted-foreground">Revendedor não encontrado</p>
        <Button onClick={() => navigate('/revendedora/admin/resellers')} data-testid="button-back">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para lista
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/revendedora/admin/resellers')}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{reseller.full_name}</h1>
            <Badge
              variant={reseller.is_active ? 'default' : 'secondary'}
              className={
                reseller.is_active
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-red-500 hover:bg-red-600'
              }
              data-testid="status-badge"
            >
              {reseller.is_active ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
          <p className="text-muted-foreground">Detalhes do revendedor</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Dados Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Nome Completo</p>
              <p className="font-medium" data-testid="text-reseller-fullname">{reseller.full_name}</p>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground mb-1">Email</p>
              <p className="font-medium flex items-center gap-2" data-testid="text-reseller-email">
                <Mail className="h-4 w-4" />
                {reseller.email}
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground mb-1">Telefone</p>
              <p className="font-medium flex items-center gap-2" data-testid="text-reseller-phone">
                <Phone className="h-4 w-4" />
                {reseller.phone || '-'}
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground mb-1">CPF/CNPJ</p>
              <p className="font-medium flex items-center gap-2" data-testid="text-reseller-cpf">
                <FileText className="h-4 w-4" />
                {reseller.cpf_cnpj || '-'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Dados de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Nível</p>
              <Badge variant="outline" data-testid="badge-reseller-level">
                Nível {reseller.level || 1}
              </Badge>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground mb-1">Comissão %</p>
              <p className="font-medium text-lg" data-testid="text-commission-percentage">
                {formatPercentage(reseller.commission_percentage)}
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total de Vendas</p>
              <p className="font-medium text-lg text-green-600" data-testid="text-total-sales">
                {formatCurrency(reseller.total_sales)}
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total de Comissões</p>
              <p className="font-medium text-lg text-blue-600" data-testid="text-total-commissions">
                {formatCurrency(reseller.total_commissions)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Saldos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Saldo Disponível</p>
              <p className="font-medium text-2xl text-green-600" data-testid="text-available-balance">
                {formatCurrency(reseller.available_balance)}
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground mb-1">Saldo Pendente</p>
              <p className="font-medium text-2xl text-yellow-600" data-testid="text-pending-balance">
                {formatCurrency(reseller.pending_balance)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Loja
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">URL da Loja</p>
              {reseller.store_url ? (
                <a
                  href={reseller.store_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 hover:underline"
                  data-testid="text-store-url"
                >
                  {reseller.store_url}
                </a>
              ) : (
                <p className="text-muted-foreground" data-testid="text-store-url">-</p>
              )}
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground mb-1">Slug da Loja</p>
              <p className="font-mono font-medium" data-testid="text-store-slug">
                {reseller.store_slug || '-'}
              </p>
            </div>
          </CardContent>
        </Card>

        {reseller.bank_account && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Dados Bancários
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Banco</p>
                <p className="font-medium" data-testid="text-bank-name">
                  {reseller.bank_account.bank_name || '-'}
                </p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Agência</p>
                <p className="font-medium" data-testid="text-agency">
                  {reseller.bank_account.agency || '-'}
                </p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Conta</p>
                <p className="font-medium" data-testid="text-account">
                  {reseller.bank_account.account || '-'}
                </p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Tipo de Conta</p>
                <p className="font-medium" data-testid="text-account-type">
                  {reseller.bank_account.account_type || '-'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Patrocinador
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sponsor ? (
              <>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Nome</p>
                  <p className="font-medium" data-testid="text-sponsor-name">
                    {sponsor.full_name}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Email</p>
                  <p className="font-medium" data-testid="text-sponsor-email">
                    {sponsor.email}
                  </p>
                </div>
                <Separator />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/admin/resellers/${sponsor.id}`)}
                  data-testid="button-view-sponsor"
                >
                  Ver Patrocinador
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground" data-testid="text-no-sponsor">
                Sem patrocinador
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Datas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Criado em</p>
              <p className="font-medium" data-testid="text-created-at">
                {formatDate(reseller.created_at)}
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground mb-1">Atualizado em</p>
              <p className="font-medium" data-testid="text-updated-at">
                {formatDate(reseller.updated_at)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
