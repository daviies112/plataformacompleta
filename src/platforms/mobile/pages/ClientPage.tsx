import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileCard } from '@/platforms/mobile/components/premium/MobileCard';
import { MobileButton } from '@/platforms/mobile/components/premium/MobileButton';
import { MobileInput } from '@/platforms/mobile/components/premium/MobileInput';
import { GlassCard } from '@/components/mobile/GlassCard';
import { MetricCard } from '@/components/mobile/MetricCard';
import { AnimatedNumber } from '@/components/mobile/AnimatedNumber';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  User, Mail, Phone, MessageCircle, Edit, Calendar, 
  FileText, Clock, DollarSign, Activity, ArrowLeft,
  ShoppingCart, Video, CheckCircle, AlertCircle, RefreshCw,
  Search, X, Users, Plus, Database, Bot, UserIcon, Loader2, Trash2, Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const hapticFeedback = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(10);
  }
};

interface ClientData {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  totalSpent?: number;
  conversationsCount: number;
  totalTranscriptions: number;
  lastContact?: string;
  plan?: string;
  [key: string]: any;
}

interface DashboardResponse {
  success: boolean;
  data?: any[];
  error?: string;
}

const ClientPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [activeTab, setActiveTab] = useState('info');
  const [searchQuery, setSearchQuery] = useState('');
  const [clientsData, setClientsData] = useState<ClientData[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<ClientData | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'active',
    plan: 'Standard'
  });

  const { 
    data: dashboardResponse, 
    isLoading: isDashboardLoading, 
    isError: isDashboardError,
    error: dashboardError,
    refetch: refetchDashboard 
  } = useQuery({
    queryKey: ['/api/dashboard/dashboard-data'],
    staleTime: 30000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; phone: string; status: string; plan: string }) => {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar cliente');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/dashboard-data'] });
      toast({
        title: "✅ Cliente criado!",
        description: "Cliente adicionado com sucesso",
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Erro ao criar",
        description: error.message,
        duration: 5000,
      });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<{ name: string; email: string; phone: string; status: string; plan: string }> }) => {
      const response = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao atualizar cliente');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/dashboard-data'] });
      toast({
        title: "✅ Cliente atualizado!",
        description: "Alterações salvas com sucesso",
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Erro ao atualizar",
        description: error.message,
        duration: 5000,
      });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/clients/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao deletar cliente');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/dashboard-data'] });
      toast({
        title: "✅ Cliente removido!",
        description: "Cliente excluído com sucesso",
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Erro ao deletar",
        description: error.message,
        duration: 5000,
      });
    },
  });

  useEffect(() => {
    const response = dashboardResponse as DashboardResponse;
    if (response?.success && response?.data) {
      const processedClients = response.data.map((client: any, index: number) => ({
        ...client,
        id: String(client.idx || index + 1),
        name: client.nome_completo,
        email: client.email_principal,
        phone: client.telefone ? client.telefone.replace('@s.whatsapp.net', '').replace('55', '+55 ') : 'N/A',
        status: client.status_atendimento || 'inactive',
        lastContact: client.ultimo_contato ? new Date(client.ultimo_contato).toISOString().split('T')[0] : 'N/A',
        conversationsCount: client.total_mensagens_chat || 0,
        totalTranscriptions: client.total_transcricoes || 0,
        plan: ['Premium', 'Standard', 'Enterprise'][index % 3]
      }));
      
      setClientsData(processedClients);
      console.log(`✅ Clientes carregados: ${processedClients.length} registros`);
      
      toast({
        title: "✅ Dados atualizados!",
        description: `${processedClients.length} clientes carregados`,
        duration: 3000,
      });
    } else if (response?.success && response?.data?.length === 0) {
      setClientsData([]);
      console.log('⚠️ Nenhum cliente encontrado');
    } else if (response && !response.success) {
      console.error('❌ Erro na resposta da API:', response);
      toast({
        title: "❌ Erro ao carregar",
        description: response.error || "Erro desconhecido",
        duration: 5000,
      });
    }
  }, [dashboardResponse, toast]);

  useEffect(() => {
    if (isDashboardError) {
      console.error('❌ Erro na query:', dashboardError);
      toast({
        title: "❌ Erro de conexão",
        description: "Não foi possível conectar com o servidor",
        duration: 5000,
      });
    }
  }, [isDashboardError, dashboardError, toast]);

  const filteredClients = clientsData.filter(client =>
    client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.phone?.includes(searchQuery)
  );

  const formatWhatsAppMessages = (client: any) => {
    if (!client.todas_mensagens_chat) return [];
    
    const messages = [];
    const rawMessages = client.todas_mensagens_chat.split('\n\n---\n\n');
    
    rawMessages.forEach((message: string, index: number) => {
      if (message.trim()) {
        const isClient = message.includes('👤');
        const isAgent = message.includes('🤖');
        const cleanMessage = message.replace(/[👤🤖]\s*/, '').trim();
        
        if (cleanMessage && (isClient || isAgent)) {
          messages.push({
            id: index,
            text: cleanMessage,
            isClient: isClient,
            timestamp: new Date(Date.now() - (1000 * 60 * (rawMessages.length - index))).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            sender: isClient ? 'Cliente' : 'Agente AI',
            originalOrder: index
          });
        }
      }
    });
    
    return messages.sort((a, b) => a.originalOrder - b.originalOrder);
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('pt-BR');
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return (
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 backdrop-blur-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
          Ativo
        </Badge>
      );
    }
    return (
      <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 backdrop-blur-sm">
        <div className="w-2 h-2 rounded-full bg-gray-400 mr-1.5" />
        Inativo
      </Badge>
    );
  };

  const getAttendanceStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      'active': { label: 'Ativo', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
      'pause': { label: 'Pausado', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      'waiting': { label: 'Aguardando', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      'inactive': { label: 'Inativo', className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' }
    };
    
    const config = statusMap[status] || statusMap['inactive'];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const handleSelectClient = (client: ClientData) => {
    hapticFeedback();
    setSelectedClient(client);
    setView('detail');
  };

  const handleBackToList = () => {
    hapticFeedback();
    setView('list');
    setSelectedClient(null);
  };

  const handleRefresh = () => {
    hapticFeedback();
    refetchDashboard();
  };

  const handleAction = (action: string, client: ClientData) => {
    hapticFeedback();
    
    switch (action) {
      case 'message':
        const cleanPhone = client.phone.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
        break;
      case 'call':
        window.location.href = `tel:${client.phone}`;
        break;
      case 'email':
        window.location.href = `mailto:${client.email}`;
        break;
      case 'edit':
        handleEditClient(client);
        break;
      case 'delete':
        handleDeleteConfirm(client);
        break;
    }
  };

  const handleCreateClient = () => {
    hapticFeedback();
    setFormData({
      name: '',
      email: '',
      phone: '',
      status: 'active',
      plan: 'Standard'
    });
    setShowCreateDrawer(true);
  };

  const handleEditClient = (client: ClientData) => {
    hapticFeedback();
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone,
      status: client.status,
      plan: client.plan || 'Standard'
    });
    setSelectedClient(client);
    setShowEditDrawer(true);
  };

  const handleDeleteConfirm = (client: ClientData) => {
    hapticFeedback();
    setClientToDelete(client);
    setShowDeleteAlert(true);
  };

  const handleSaveClient = () => {
    hapticFeedback();
    
    if (!formData.name || !formData.email || !formData.phone) {
      toast({
        title: "❌ Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        duration: 3000,
      });
      return;
    }

    createClientMutation.mutate({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      status: formData.status,
      plan: formData.plan
    });
    
    setShowCreateDrawer(false);
  };

  const handleUpdateClient = () => {
    hapticFeedback();
    
    if (!formData.name || !formData.email || !formData.phone) {
      toast({
        title: "❌ Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        duration: 3000,
      });
      return;
    }

    if (!selectedClient?.id) return;

    updateClientMutation.mutate({
      id: selectedClient.id,
      data: {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        status: formData.status,
        plan: formData.plan
      }
    });
    
    setShowEditDrawer(false);
  };

  const handleDeleteClient = () => {
    hapticFeedback();
    
    if (!clientToDelete?.id) return;

    deleteClientMutation.mutate(clientToDelete.id);
    
    if (selectedClient?.id === clientToDelete.id) {
      setView('list');
      setSelectedClient(null);
    }

    setShowDeleteAlert(false);
    setClientToDelete(null);
  };

  if (isDashboardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
        <GlassCard className="p-8 text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
          <h3 className="text-lg font-semibold mb-2">Carregando clientes</h3>
          <p className="text-sm text-muted-foreground">
            Aguarde enquanto buscamos os dados...
          </p>
        </GlassCard>
      </div>
    );
  }

  if (isDashboardError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
        <GlassCard className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <h3 className="text-lg font-semibold mb-2">Erro ao carregar</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Não foi possível conectar com o servidor
          </p>
          <MobileButton onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </MobileButton>
        </GlassCard>
      </div>
    );
  }

  if (view === 'detail' && selectedClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
        <div className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-white/10">
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              onClick={handleBackToList}
              className="p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-all touch-manipulation"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold">Detalhes do Cliente</h1>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <MobileCard variant="elevated" className="text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
            
            <div className="relative z-10 space-y-4">
              <div className="flex justify-center">
                <div className="relative">
                  <Avatar className="h-24 w-24 ring-4 ring-primary/20 ring-offset-4 ring-offset-background">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-2xl font-bold">
                      {selectedClient.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {selectedClient.status === 'active' && (
                    <div className="absolute bottom-1 right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-background flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">
                  {selectedClient.name}
                </h2>
                <div className="flex items-center justify-center gap-2">
                  {getStatusBadge(selectedClient.status)}
                  {selectedClient.plan && (
                    <Badge className="bg-primary/20 text-primary border-primary/30">
                      {selectedClient.plan}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span className="truncate max-w-[280px]">{selectedClient.email}</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{selectedClient.phone}</span>
                </div>
                {selectedClient.lastContact && (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs">
                    <Clock className="w-3 h-3" />
                    <span>Último contato: {selectedClient.lastContact}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 pt-4">
                <div className="text-center p-3 bg-gradient-to-br from-blue-500/10 to-transparent rounded-xl border border-blue-500/20">
                  <div className="text-2xl font-bold text-foreground">
                    <AnimatedNumber value={selectedClient.conversationsCount} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Conversas</div>
                </div>
                
                <div className="text-center p-3 bg-gradient-to-br from-purple-500/10 to-transparent rounded-xl border border-purple-500/20">
                  <div className="text-2xl font-bold text-foreground">
                    <AnimatedNumber value={selectedClient.totalTranscriptions} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Transcrições</div>
                </div>
                
                <div className="text-center p-3 bg-gradient-to-br from-green-500/10 to-transparent rounded-xl border border-green-500/20">
                  <div className="text-xl font-bold text-foreground">
                    <AnimatedNumber value={selectedClient.total_registros || 0} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Registros</div>
                </div>
              </div>
            </div>
          </MobileCard>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground px-1">Ações Rápidas</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              <div className="flex-shrink-0">
                <GlassCard 
                  variant="action"
                  className="p-4 min-w-[120px] text-center"
                  onClick={() => handleAction('message', selectedClient)}
                >
                  <MessageCircle className="w-6 h-6 mx-auto mb-2 text-blue-400" />
                  <div className="text-xs font-medium">Conversar</div>
                </GlassCard>
              </div>
              
              <div className="flex-shrink-0">
                <GlassCard 
                  variant="action"
                  className="p-4 min-w-[120px] text-center"
                  onClick={() => handleAction('call', selectedClient)}
                >
                  <Phone className="w-6 h-6 mx-auto mb-2 text-green-400" />
                  <div className="text-xs font-medium">Ligar</div>
                </GlassCard>
              </div>
              
              <div className="flex-shrink-0">
                <GlassCard 
                  variant="action"
                  className="p-4 min-w-[120px] text-center"
                  onClick={() => handleAction('email', selectedClient)}
                >
                  <Mail className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                  <div className="text-xs font-medium">Email</div>
                </GlassCard>
              </div>
              
              <div className="flex-shrink-0">
                <GlassCard 
                  variant="action"
                  className="p-4 min-w-[120px] text-center"
                  onClick={() => handleAction('edit', selectedClient)}
                >
                  <Edit className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
                  <div className="text-xs font-medium">Editar</div>
                </GlassCard>
              </div>

              <div className="flex-shrink-0">
                <GlassCard 
                  variant="action"
                  className="p-4 min-w-[120px] text-center"
                  onClick={() => handleAction('delete', selectedClient)}
                >
                  <Trash2 className="w-6 h-6 mx-auto mb-2 text-red-400" />
                  <div className="text-xs font-medium">Excluir</div>
                </GlassCard>
              </div>
            </div>
          </div>

          <MobileCard className="overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-3 bg-white/5 backdrop-blur-sm h-12">
                <TabsTrigger 
                  value="info" 
                  className={cn(
                    "text-sm font-medium transition-all",
                    "data-[state=active]:bg-primary/20",
                    "data-[state=active]:text-primary",
                    "data-[state=active]:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                  )}
                >
                  <User className="w-4 h-4 mr-1.5" />
                  Info
                </TabsTrigger>
                <TabsTrigger 
                  value="conversations"
                  className={cn(
                    "text-sm font-medium transition-all",
                    "data-[state=active]:bg-primary/20",
                    "data-[state=active]:text-primary",
                    "data-[state=active]:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                  )}
                >
                  <MessageCircle className="w-4 h-4 mr-1.5" />
                  Chat
                </TabsTrigger>
                <TabsTrigger 
                  value="stats"
                  className={cn(
                    "text-sm font-medium transition-all",
                    "data-[state=active]:bg-primary/20",
                    "data-[state=active]:text-primary",
                    "data-[state=active]:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                  )}
                >
                  <Activity className="w-4 h-4 mr-1.5" />
                  Stats
                </TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="mt-4 space-y-3">
                <GlassCard className="p-4">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Informações Pessoais
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nome:</span>
                      <span className="font-medium text-right">{selectedClient.nome_completo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium text-right text-xs break-all">{selectedClient.email_principal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Telefone:</span>
                      <span className="font-medium">{selectedClient.phone}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Status:</span>
                      {getAttendanceStatusBadge(selectedClient.status_atendimento)}
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="p-4">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Histórico de Contato
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Primeiro:</span>
                      <span className="font-medium text-xs text-right">{formatDateTime(selectedClient.primeiro_contato)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Último:</span>
                      <span className="font-medium text-xs text-right">{formatDateTime(selectedClient.ultimo_contato)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Atividade:</span>
                      <span className="font-medium text-xs text-right">{formatDateTime(selectedClient.ultima_atividade)}</span>
                    </div>
                  </div>
                </GlassCard>

                {selectedClient.tipo_reuniao_atual && (
                  <GlassCard className="p-4">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Video className="w-4 h-4 text-primary" />
                      Reunião Atual
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tipo:</span>
                        <span className="font-medium">{selectedClient.tipo_reuniao_atual}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ID:</span>
                        <span className="font-medium text-xs break-all">{selectedClient.id_reuniao_atual}</span>
                      </div>
                    </div>
                  </GlassCard>
                )}
              </TabsContent>

              <TabsContent value="conversations" className="mt-4 space-y-3">
                <div className="max-h-[500px] overflow-y-auto space-y-3">
                  {formatWhatsAppMessages(selectedClient).length > 0 ? (
                    formatWhatsAppMessages(selectedClient).map((message, index) => (
                      <div 
                        key={message.id}
                        className={cn(
                          "animate-fade-in",
                          message.isClient ? "pr-8" : "pl-8"
                        )}
                        style={{ 
                          animationDelay: `${index * 50}ms`,
                          animationFillMode: 'backwards'
                        }}
                      >
                        <GlassCard className={cn(
                          "p-4",
                          message.isClient 
                            ? "bg-blue-500/10 border-blue-500/20" 
                            : "bg-green-500/10 border-green-500/20"
                        )}>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold flex items-center gap-1.5">
                                {message.isClient ? (
                                  <>
                                    <UserIcon className="w-3.5 h-3.5 text-blue-400" />
                                    <span className="text-blue-400">{message.sender}</span>
                                  </>
                                ) : (
                                  <>
                                    <Bot className="w-3.5 h-3.5 text-green-400" />
                                    <span className="text-green-400">{message.sender}</span>
                                  </>
                                )}
                              </span>
                              <span className="text-xs text-muted-foreground/60">
                                {message.timestamp}
                              </span>
                            </div>
                            <p className="text-sm text-foreground/90 leading-relaxed break-words">
                              {message.text}
                            </p>
                          </div>
                        </GlassCard>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                      <h4 className="text-sm font-semibold mb-2">Nenhuma conversa</h4>
                      <p className="text-xs text-muted-foreground mb-4">
                        Histórico de conversas não disponível
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="stats" className="mt-4 space-y-3">
                <GlassCard className="p-4">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Estatísticas
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-gradient-to-br from-blue-500/10 to-transparent rounded-xl border border-blue-500/20">
                      <div className="text-2xl font-bold text-foreground">
                        {selectedClient.total_registros || 0}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Registros</div>
                    </div>
                    <div className="text-center p-3 bg-gradient-to-br from-purple-500/10 to-transparent rounded-xl border border-purple-500/20">
                      <div className="text-2xl font-bold text-foreground">
                        {selectedClient.total_mensagens_chat || 0}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Mensagens</div>
                    </div>
                    <div className="text-center p-3 bg-gradient-to-br from-green-500/10 to-transparent rounded-xl border border-green-500/20">
                      <div className="text-2xl font-bold text-foreground">
                        {selectedClient.total_transcricoes || 0}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Transcrições</div>
                    </div>
                    <div className="text-center p-3 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-xl border border-yellow-500/20">
                      <div className="text-2xl font-bold text-foreground">
                        {selectedClient.fontes_dados || 0}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Fontes</div>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="p-4">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Database className="w-4 h-4 text-primary" />
                    Disponibilidade de Dados
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Dados Cliente:</span>
                      {selectedClient.tem_dados_cliente ? 
                        <CheckCircle className="w-5 h-5 text-green-500" /> : 
                        <X className="w-5 h-5 text-red-500" />
                      }
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Histórico Chat:</span>
                      {selectedClient.tem_historico_chat ? 
                        <CheckCircle className="w-5 h-5 text-green-500" /> : 
                        <X className="w-5 h-5 text-red-500" />
                      }
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Transcrições:</span>
                      {selectedClient.tem_transcricoes ? 
                        <CheckCircle className="w-5 h-5 text-green-500" /> : 
                        <X className="w-5 h-5 text-red-500" />
                      }
                    </div>
                  </div>
                </GlassCard>
              </TabsContent>
            </Tabs>
          </MobileCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-white/10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isDashboardLoading}
                className="p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-all touch-manipulation"
              >
                <RefreshCw className={cn(
                  "w-5 h-5",
                  isDashboardLoading && "animate-spin"
                )} />
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <MobileInput
              placeholder="Buscar clientes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-white/5 active:scale-95 transition-all touch-manipulation"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between mt-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4 text-primary" />
              <span className="font-medium">{filteredClients.length} clientes</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="Total"
            value={filteredClients.length}
            icon={Users}
          />
          <MetricCard
            label="Ativos"
            value={filteredClients.filter(c => c.status === 'active').length}
            icon={CheckCircle}
          />
        </div>

        {filteredClients.length === 0 ? (
          <div className="text-center py-12">
            <GlassCard className="p-8">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">Nenhum cliente encontrado</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'Tente ajustar sua busca' : 'Seus clientes aparecerão aqui'}
              </p>
            </GlassCard>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredClients.map((client, index) => (
              <MobileCard 
                key={client.id}
                variant="elevated"
                className="cursor-pointer active:scale-98 transition-transform"
                onClick={() => handleSelectClient(client)}
                style={{ 
                  animationDelay: `${index * 50}ms`,
                  animationFillMode: 'backwards'
                }}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-14 w-14 ring-2 ring-primary/20 flex-shrink-0">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-bold text-base">
                      {client.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-base truncate">{client.name}</h3>
                      {getStatusBadge(client.status)}
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2 truncate">
                        <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{client.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate text-xs">{client.email}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <div className="text-center p-2 bg-blue-500/10 rounded-lg">
                        <div className="text-sm font-bold">{client.conversationsCount}</div>
                        <div className="text-xs text-muted-foreground">Conversas</div>
                      </div>
                      <div className="text-center p-2 bg-purple-500/10 rounded-lg">
                        <div className="text-sm font-bold">{client.totalTranscriptions}</div>
                        <div className="text-xs text-muted-foreground">Transcrições</div>
                      </div>
                      <div className="text-center p-2 bg-green-500/10 rounded-lg">
                        <div className="text-sm font-bold">{client.total_registros || 0}</div>
                        <div className="text-xs text-muted-foreground">Registros</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {client.lastContact}
                      </span>
                      {client.plan && (
                        <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                          {client.plan}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </MobileCard>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleCreateClient}
        className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg active:scale-95 transition-all touch-manipulation flex items-center justify-center"
      >
        <Plus className="w-6 h-6 text-primary-foreground" />
      </button>

      <Drawer open={showCreateDrawer} onOpenChange={setShowCreateDrawer}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle className="text-xl font-bold">Novo Cliente</DrawerTitle>
          </DrawerHeader>
          
          <div className="px-4 pb-4 space-y-4 overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="create-name">Nome Completo *</Label>
              <MobileInput
                id="create-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Digite o nome do cliente"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-email">Email *</Label>
              <MobileInput
                id="create-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-phone">Telefone *</Label>
              <MobileInput
                id="create-phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+55 11 98765-4321"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger id="create-status" className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="pause">Pausado</SelectItem>
                  <SelectItem value="waiting">Aguardando</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-plan">Plano</Label>
              <Select value={formData.plan} onValueChange={(value) => setFormData(prev => ({ ...prev, plan: value }))}>
                <SelectTrigger id="create-plan" className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Premium">Premium</SelectItem>
                  <SelectItem value="Enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DrawerFooter className="pt-4 pb-6">
            <div className="grid grid-cols-2 gap-3">
              <MobileButton
                variant="secondary"
                onClick={() => setShowCreateDrawer(false)}
              >
                Cancelar
              </MobileButton>
              <MobileButton onClick={handleSaveClient}>
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </MobileButton>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer open={showEditDrawer} onOpenChange={setShowEditDrawer}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle className="text-xl font-bold">Editar Cliente</DrawerTitle>
          </DrawerHeader>
          
          <div className="px-4 pb-4 space-y-4 overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome Completo *</Label>
              <MobileInput
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Digite o nome do cliente"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <MobileInput
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefone *</Label>
              <MobileInput
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+55 11 98765-4321"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger id="edit-status" className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="pause">Pausado</SelectItem>
                  <SelectItem value="waiting">Aguardando</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-plan">Plano</Label>
              <Select value={formData.plan} onValueChange={(value) => setFormData(prev => ({ ...prev, plan: value }))}>
                <SelectTrigger id="edit-plan" className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Premium">Premium</SelectItem>
                  <SelectItem value="Enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DrawerFooter className="pt-4 pb-6">
            <div className="grid grid-cols-2 gap-3">
              <MobileButton
                variant="secondary"
                onClick={() => setShowEditDrawer(false)}
              >
                Cancelar
              </MobileButton>
              <MobileButton onClick={handleUpdateClient}>
                <Save className="w-4 h-4 mr-2" />
                Atualizar
              </MobileButton>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent className="max-w-[90vw] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Tem certeza que deseja excluir <strong>{clientToDelete?.name}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel className="h-12 mt-0">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteClient}
              className="h-12 bg-red-500 hover:bg-red-600 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClientPage;
