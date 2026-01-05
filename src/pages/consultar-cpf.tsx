import { useState, useEffect } from "react";
import { CpfForm } from "@/components/compliance/cpf-form";
import { ProcessDetailsModal } from "@/components/compliance/process-details-modal";
import { HistoryTable } from "@/components/compliance/history-table";
import { EmptyState } from "@/components/compliance/empty-state";
import type { DatacorpCheck } from "@shared/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InfoIcon, CheckCircle2, FileSearch, History, FileText } from "lucide-react";

export default function ConsultarCPFPage() {
  const [selectedCheck, setSelectedCheck] = useState<DatacorpCheck | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("consulta");
  const [historyChecks, setHistoryChecks] = useState<DatacorpCheck[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Verificar status de autenticação
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/check-session");
        const data = await response.json();
        setIsAuthenticated(data.authenticated || false);
        setUserEmail(data.user?.email || null);
      } catch (error) {
        console.error("Erro ao verificar autenticação:", error);
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
  }, []);

  // Load history when component mounts and when switching to history tab
  useEffect(() => {
    if (activeTab === "historico") {
      fetchHistory();
    }
  }, [activeTab]);

  // Pré-carregar histórico ao montar componente para melhor UX
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      console.log('[Histórico CPF] Iniciando busca do histórico...');
      setIsLoadingHistory(true);
      const response = await fetch("/api/compliance/history", {
        credentials: "include",
      });

      console.log('[Histórico CPF] Response status:', response.status);

      if (!response.ok) {
        throw new Error("Erro ao carregar histórico");
      }

      const data = await response.json();
      console.log('[Histórico CPF] Dados recebidos:', data);
      console.log('[Histórico CPF] Número de registros:', data?.length || 0);
      setHistoryChecks(data || []);
      console.log('[Histórico CPF] Estado atualizado com', data?.length || 0, 'registros');
    } catch (error) {
      console.error("[Histórico CPF] Erro ao buscar histórico:", error);
    } finally {
      setIsLoadingHistory(false);
      console.log('[Histórico CPF] Loading finalizado');
    }
  };

  const handleSubmitCpf = async (data: { cpf: string; name: string; forceRefresh?: boolean }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/compliance/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          cpf: data.cpf,
          personName: data.name,
          forceRefresh: data.forceRefresh || false,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError("Você não está autenticado. Por favor, faça login para usar esta funcionalidade.");
          return;
        }
        
        if (response.status === 503) {
          const errorData = await response.json();
          setError(errorData.error || "Serviço temporariamente indisponível");
          return;
        }
        
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao consultar CPF");
      }

      const result = await response.json();
      
      if (result) {
        setSelectedCheck(result);
        setIsModalOpen(true);
        // Refresh history after new consultation
        fetchHistory();
      }
    } catch (error) {
      console.error("Erro ao consultar CPF:", error);
      setError(error instanceof Error ? error.message : "Erro ao processar consulta");
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (check: DatacorpCheck) => {
    setSelectedCheck(check);
    setIsModalOpen(true);
  };

  return (
    <div className="flex-1 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">Consultar CPF</h1>
          <p className="text-muted-foreground">
            Consulte processos judiciais via Bigdatacorp com cache inteligente
          </p>
        </div>

        {/* Status de Autenticação */}
        {isAuthenticated !== null && (
          <Alert variant={isAuthenticated ? "default" : "destructive"}>
            {isAuthenticated ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Autenticado</AlertTitle>
                <AlertDescription>
                  Você está logado como {userEmail}. Suas consultas serão registradas em sua conta.
                </AlertDescription>
              </>
            ) : (
              <>
                <InfoIcon className="h-4 w-4" />
                <AlertTitle>Modo Demonstração</AlertTitle>
                <AlertDescription>
                  Você está usando o modo demonstração. Para acessar funcionalidades completas, faça login no sistema.
                </AlertDescription>
              </>
            )}
          </Alert>
        )}

        {/* Tabs: Nova Consulta e Histórico */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="consulta" className="flex items-center gap-2">
              <FileSearch className="h-4 w-4" />
              Nova Consulta
            </TabsTrigger>
            <TabsTrigger value="historico" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          {/* Aba: Nova Consulta */}
          <TabsContent value="consulta">
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Mensagem de Erro */}
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Erro</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* CPF Form */}
              <CpfForm onSubmit={handleSubmitCpf} isLoading={isLoading} />
            </div>
          </TabsContent>

          {/* Aba: Histórico */}
          <TabsContent value="historico">
            <div className="space-y-4">
              {!isLoadingHistory && historyChecks.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Nenhuma consulta encontrada"
                  description="Realize sua primeira consulta de CPF para ver o histórico aqui."
                />
              ) : (
                <HistoryTable 
                  data={historyChecks} 
                  isLoading={isLoadingHistory}
                  onViewDetails={handleViewDetails}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Process Details Modal */}
        <ProcessDetailsModal
          check={selectedCheck}
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
        />
      </div>
    </div>
  );
}
