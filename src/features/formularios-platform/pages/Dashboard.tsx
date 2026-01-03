import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { ArrowLeft, Sparkles, FileText, Folder, Search, TrendingUp, Zap, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Form } from "../../../../shared/db-schema";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { InstantMeetingModal } from "@/components/InstantMeetingModal";

const Dashboard = () => {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const [isCreatingInstant, setIsCreatingInstant] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [createdMeeting, setCreatedMeeting] = useState<any>(null);

  const { data: formsResponse, isLoading } = useQuery({
    queryKey: ["/api/forms"],
  });

  const handleInstantMeeting = async () => {
    setIsCreatingInstant(true);
    try {
      const response = await api.post("/api/reunioes/instantanea", { titulo: 'Reunião Instantânea' });
      const meeting = response.data.data || response.data;
      
      setCreatedMeeting({
        id: meeting.id,
        linkReuniao: meeting.linkReuniao,
        titulo: meeting.titulo,
      });
      
      setShowMeetingModal(true);
    } catch (error: any) {
      toast({ 
        variant: "destructive",
        title: "Erro", 
        description: error.response?.data?.message || error.message 
      });
    } finally {
      setIsCreatingInstant(false);
    }
  };

  const forms = Array.isArray(formsResponse) 
    ? formsResponse 
    : formsResponse?.forms || [];

  // Filtrar formulários com base na busca
  const filteredForms = useMemo(() => {
    if (!searchQuery.trim()) return forms;
    
    const query = searchQuery.toLowerCase();
    return forms.filter((form: any) => 
      form.title?.toLowerCase().includes(query) ||
      form.description?.toLowerCase().includes(query)
    );
  }, [forms, searchQuery]);

  // Calcular total de respostas
  const totalResponses = useMemo(() => {
    return forms.reduce((acc: number, form: any) => 
      acc + (Number(form.submissionCount) || 0), 0);
  }, [forms]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary-glow/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="container mx-auto px-4 py-12 relative">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10 animate-slide-up">
            <Button 
              onClick={() => setLocation("/admin")} 
              variant="ghost" 
              className="gap-2 mb-8 glass hover:scale-105"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Formulários
            </Button>

            <div className="flex flex-col gap-6">
              <div>
                <div className="inline-flex items-center gap-2 mb-3 px-4 py-1.5 glass rounded-full border border-primary/20">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-primary">Respostas por Formulário</span>
                </div>
                <h1 className="text-5xl font-extrabold mb-3 bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
                  Respostas dos Formulários
                </h1>
                <p className="text-lg text-muted-foreground" data-testid="text-form-count">
                  {forms.length} {forms.length === 1 ? "formulário" : "formulários"} • {totalResponses} {totalResponses === 1 ? "resposta total" : "respostas totais"}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <Button 
                  onClick={handleInstantMeeting} 
                  disabled={isCreatingInstant}
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  {isCreatingInstant ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  Reunião Instantânea
                </Button>
                <div className="relative max-w-md flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar formulário..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 glass"
                    data-testid="input-search"
                  />
                </div>
              </div>
            </div>
          </div>

          <InstantMeetingModal 
            isOpen={showMeetingModal}
            onClose={() => setShowMeetingModal(false)}
            meeting={createdMeeting}
          />

          {isLoading ? (
            <div className="text-center py-20 animate-fade-in">
              <div className="inline-block p-4 rounded-full bg-primary/10 mb-4">
                <Sparkles className="h-8 w-8 text-primary animate-glow" />
              </div>
              <p className="text-lg text-muted-foreground">Carregando formulários...</p>
            </div>
          ) : filteredForms.length === 0 ? (
            <Card className="p-16 text-center glass shadow-card animate-scale-in">
              <div className="p-6 bg-gradient-to-br from-primary/10 to-primary-glow/10 rounded-2xl w-fit mx-auto mb-6">
                {searchQuery ? (
                  <Search className="h-16 w-16 text-primary" />
                ) : (
                  <FileText className="h-16 w-16 text-primary" />
                )}
              </div>
              <h3 className="text-2xl font-bold mb-3">
                {searchQuery ? "Nenhum formulário encontrado" : "Nenhum formulário criado"}
              </h3>
              <p className="text-lg text-muted-foreground mb-8">
                {searchQuery 
                  ? "Tente buscar com outras palavras-chave" 
                  : "Crie seu primeiro formulário para começar a receber respostas"}
              </p>
              {!searchQuery && (
                <Button 
                  onClick={() => setLocation("/admin")} 
                  variant="premium"
                  size="lg"
                >
                  <FileText className="h-5 w-5 mr-2" />
                  Criar Formulário
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {filteredForms.map((form: any, index: number) => {
                const submissionCount = Number(form.submissionCount) || 0;
                
                return (
                  <Card 
                    key={form.id} 
                    className="glass hover-lift border-2 border-border/50 hover:border-primary/30 shadow-card animate-slide-up group cursor-pointer overflow-hidden" 
                    data-testid={`card-form-${form.id}`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                    onClick={() => setLocation(`/admin/formularios/${form.id}/respostas`)}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <CardHeader className="relative">
                      <div className="flex items-start gap-4 mb-3">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary-glow/10 group-hover:from-primary/20 group-hover:to-primary-glow/20 transition-colors">
                          <Folder className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text mb-2">
                            {form.title}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="secondary" 
                              className="glass shadow-sm"
                              data-testid={`badge-responses-${form.id}`}
                            >
                              <TrendingUp className="h-3 w-3 mr-1" />
                              {submissionCount} {submissionCount === 1 ? "resposta" : "respostas"}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className="glass"
                              data-testid={`badge-questions-${form.id}`}
                            >
                              {(form.questions as any[]).length} perguntas
                            </Badge>
                          </div>
                        </div>
                      </div>
                      {form.description && (
                        <CardDescription className="text-sm leading-relaxed line-clamp-2">
                          {form.description}
                        </CardDescription>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4 pt-4 border-t border-border/50">
                        <span data-testid={`text-created-${form.id}`}>
                          {format(new Date(form.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
