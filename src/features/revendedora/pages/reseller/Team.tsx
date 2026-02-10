import { useState, useEffect } from 'react';
import { useSupabase } from '@/features/revendedora/contexts/SupabaseContext';
import { useAuth } from '@/features/revendedora/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/revendedora/components/ui/card';
import { Users, TrendingUp, Award, Link as LinkIcon } from 'lucide-react';
import { ResellerCard } from '@/features/revendedora/components/Cards';
import { Button } from '@/features/revendedora/components/ui/button';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  tipo: string | null;
  nivel: number | null;
  created_at: string | null;
}

export default function Team() {
  const { client: supabase, loading: supabaseLoading, configured } = useSupabase();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (configured && supabase) {
      loadTeam();
    } else if (!supabaseLoading && !configured) {
      setLoading(false);
    }
  }, [configured, supabase, supabaseLoading]);

  const loadTeam = async () => {
    if (!supabase) {
      toast.error('Cliente Supabase não configurado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Buscar todos os resellers
      const { data: team, error } = await supabase
        .from('resellers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeamMembers(team || []);
    } catch (error) {
      console.error('Error loading team:', error);
      toast.error('Erro ao carregar equipe');
    } finally {
      setLoading(false);
    }
  };

  if (supabaseLoading || loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  if (!configured || !supabase) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Supabase não configurado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Revendedores</h1>
        <p className="text-muted-foreground">Lista de todos os revendedores cadastrados</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Revendedores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamMembers.length}</div>
            <p className="text-xs text-muted-foreground">Cadastrados no sistema</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos os Revendedores</CardTitle>
          <CardDescription>
            {teamMembers.length} revendedor{teamMembers.length !== 1 ? 'es' : ''} cadastrado{teamMembers.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhum revendedor cadastrado
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {teamMembers.map((member) => (
                <Card key={member.id} className="p-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold">{member.nome || 'Sem nome'}</h3>
                    <p className="text-sm text-muted-foreground">{member.email || 'Sem email'}</p>
                    {member.telefone && (
                      <p className="text-sm text-muted-foreground">
                        Tel: {member.telefone}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      {member.tipo && (
                        <span className="text-muted-foreground">Tipo: {member.tipo}</span>
                      )}
                      {member.nivel !== null && member.nivel !== undefined && (
                        <span className="text-muted-foreground">Nível: {member.nivel}</span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
