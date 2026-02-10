import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AssinaturaNav } from '@/components/assinatura/AssinaturaNav';
import { ContractDetailsModal } from '@/components/assinatura/modals/ContractDetailsModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { 
  FileText, 
  Copy, 
  Clock, 
  CheckCircle2, 
  Loader2, 
  Eye,
  Search,
  Calendar,
  Mail,
  User
} from 'lucide-react';

interface Contract {
  id: string;
  client_name: string;
  client_cpf: string;
  client_email: string;
  client_phone?: string | null;
  status?: string | null;
  access_token?: string | null;
  created_at?: string;
  signed_at?: string | null;
  protocol_number?: string | null;
}

const ContratosListaPage = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: contracts = [], isLoading } = useQuery<Contract[]>({
    queryKey: ['/api/assinatura/contracts'],
  });

  const filteredContracts = contracts.filter(contract => 
    contract.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.client_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.protocol_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case 'signed':
        return <Badge className="bg-green-600 gap-1"><CheckCircle2 className="w-3 h-3" />Assinado</Badge>;
      case 'pending':
      default:
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />Pendente</Badge>;
    }
  };

  const copyUrl = (contract: Contract) => {
    const url = `${window.location.origin}/assinar/${contract.access_token}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'URL copiada!' });
  };

  return (
    <div className="flex flex-col h-full">
      <AssinaturaNav />
      
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                Contratos
              </h1>
              <p className="text-muted-foreground">
                Gerencie e acompanhe todos os contratos de assinatura
              </p>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou protocolo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-20">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Carregando contratos...</p>
            </div>
          ) : filteredContracts.length === 0 ? (
            <Card className="border-2 border-dashed glass">
              <CardContent className="py-20 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-xl font-bold mb-2">
                  {searchTerm ? 'Nenhum contrato encontrado' : 'Nenhum contrato criado'}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Tente buscar com outros termos' : 'Crie seu primeiro contrato para começar'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredContracts.map((contract, index) => (
                <Card 
                  key={contract.id} 
                  className="glass hover-lift border-2 border-border/50 hover:border-primary/30 cursor-pointer group animate-slide-up"
                  onClick={() => {
                    setSelectedContract(contract);
                    setModalOpen(true);
                  }}
                  data-testid={`card-contract-${contract.id}`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        {contract.client_name}
                      </CardTitle>
                      {getStatusBadge(contract.status)}
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <Mail className="w-3 h-3" />
                      {contract.client_email}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {contract.created_at && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(contract.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </div>
                      )}
                      
                      {contract.protocol_number && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {contract.protocol_number}
                        </p>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyUrl(contract);
                          }}
                          data-testid={`button-copy-${contract.id}`}
                        >
                          <Copy className="w-3 h-3" />
                          Copiar URL
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`/assinar/${contract.access_token}`, '_blank');
                          }}
                          data-testid={`button-view-${contract.id}`}
                        >
                          <Eye className="w-3 h-3" />
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

      <ContractDetailsModal
        contract={selectedContract}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
};

export default ContratosListaPage;
