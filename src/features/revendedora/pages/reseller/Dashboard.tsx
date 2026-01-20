import { useEffect, useState } from 'react';
import { useSupabase } from '@/features/revendedora/contexts/SupabaseContext';
import { useCompany } from '@/features/revendedora/contexts/CompanyContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/revendedora/components/ui/card';
import { Users, Package, Building2 } from 'lucide-react';
import { getProjectName } from '../../lib/resellerAuth';

export default function ResellerDashboard() {
  const { reseller, loading: companyLoading } = useCompany();
  const { client: supabase, loading: supabaseLoading, configured } = useSupabase();
  const [stats, setStats] = useState({
    totalResellers: 0,
    totalProducts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [supabase]);

  const loadStats = async () => {
    try {
      if (supabaseLoading || !configured || !supabase) {
        console.log('[Dashboard] Supabase not ready', { supabaseLoading, configured, supabase: !!supabase });
        setLoading(false);
        return;
      }

      const { count: resellersCount } = await supabase
        .from('resellers')
        .select('id', { count: 'exact', head: true });

      const { count: productsCount } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true });

      setStats({
        totalResellers: resellersCount || 0,
        totalProducts: productsCount || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total de Revendedores',
      value: stats.totalResellers,
      description: 'Revendedores cadastrados',
      icon: Users,
    },
    {
      title: 'Total de Produtos',
      value: stats.totalProducts,
      description: 'Produtos no catálogo',
      icon: Package,
    },
  ];

  if (loading || companyLoading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  const projectName = getProjectName();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">{projectName}</h1>
          <p className="text-muted-foreground">
            {reseller?.nome && `Olá, ${reseller.nome}! `}
            Visão geral do sistema
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
