import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ArrowLeft, Sparkles, TrendingUp, FileText, Search, SlidersHorizontal } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { FormSubmission, Form } from "../../../../shared/db-schema";
import { SubmissionStats } from "../components/submissions/SubmissionStats";
import { SubmissionCard } from "../components/submissions/SubmissionCard";
import { useState, useMemo } from "react";
import { useCompanySlug, getFormUrl, getShortFormUrl } from "../hooks/useCompanySlug";

const FormularioRespostas = () => {
  const [, setLocation] = useLocation();
  const params = useParams();
  const formId = params.id;
  const { companySlug } = useCompanySlug();
  
  // Estados dos filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const { data: formData, isLoading: isLoadingForm } = useQuery({
    queryKey: [`/api/forms/${formId}`],
    queryFn: async () => {
      const response = await fetch(`/api/forms/${formId}`);
      if (!response.ok) throw new Error("Formulário não encontrado");
      return response.json();
    },
    enabled: !!formId,
  });

  const form = formData?.form || formData;

  const { data: submissionsData, isLoading: isLoadingSubmissions } = useQuery({
    queryKey: [`/api/forms/${formId}/submissions`],
    queryFn: async () => {
      const response = await fetch(`/api/forms/${formId}/submissions`);
      if (!response.ok) return { success: false, submissions: [] };
      return response.json();
    },
    enabled: !!formId,
  });

  const submissions = submissionsData?.submissions || [];
  const isLoading = isLoadingForm || isLoadingSubmissions;

  // Filtrar e ordenar submissões
  const filteredSubmissions = useMemo(() => {
    let filtered = [...submissions];

    // Filtro de busca por texto
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((submission: FormSubmission) => {
        // Buscar no nome, email, telefone, CPF de contato
        const contactMatch = 
          submission.contactName?.toLowerCase().includes(query) ||
          submission.contactEmail?.toLowerCase().includes(query) ||
          submission.contactPhone?.toLowerCase().includes(query) ||
          submission.contactCpf?.toLowerCase().includes(query);

        // Buscar nas respostas
        const answersMatch = submission.answers && typeof submission.answers === 'object' 
          ? JSON.stringify(submission.answers).toLowerCase().includes(query)
          : false;

        return contactMatch || answersMatch;
      });
    }

    // Ordenação
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [submissions, searchQuery, sortOrder]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary-glow/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="container mx-auto px-4 py-12 relative">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10 animate-slide-up">
            <div className="flex gap-3 mb-8">
              <Button 
                onClick={() => setLocation("/admin/formularios")} 
                variant="ghost" 
                className="gap-2 glass hover:scale-105"
                data-testid="button-back-forms"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar aos Formulários
              </Button>
              <Button 
                onClick={() => setLocation("/admin/dashboard")} 
                variant="outline" 
                className="gap-2 glass"
                data-testid="button-all-submissions"
              >
                <TrendingUp className="h-4 w-4" />
                Todas as Respostas
              </Button>
            </div>

            <div className="space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 mb-3 px-4 py-1.5 glass rounded-full border border-primary/20">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold text-primary">Analytics por Formulário</span>
                  </div>
                  {isLoadingForm ? (
                    <div className="h-12 w-64 bg-primary/10 animate-pulse rounded-lg mb-3" />
                  ) : (
                    <h1 className="text-5xl font-extrabold mb-3 bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
                      {form?.title || "Formulário"}
                    </h1>
                  )}
                  <p className="text-lg text-muted-foreground" data-testid="text-submission-count">
                    {filteredSubmissions.length} de {submissions.length} {submissions.length === 1 ? "resposta" : "respostas"} {filteredSubmissions.length !== submissions.length && "filtradas"}
                  </p>
                </div>
                
                <SubmissionStats submissions={filteredSubmissions} />
              </div>

              {/* Filtros */}
              {submissions.length > 0 && (
                <Card className="glass border-border/50 p-4">
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <SlidersHorizontal className="h-4 w-4" />
                      Filtros:
                    </div>
                    
                    {/* Campo de busca */}
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar em respostas, nome, email, CPF..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 glass"
                        data-testid="input-search-submissions"
                      />
                    </div>

                    {/* Seletor de ordenação */}
                    <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as "newest" | "oldest")}>
                      <SelectTrigger className="w-[180px] glass" data-testid="select-sort">
                        <SelectValue placeholder="Ordenar por..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Mais recentes</SelectItem>
                        <SelectItem value="oldest">Mais antigas</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Botão limpar filtros */}
                    {(searchQuery || sortOrder !== "newest") && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setSearchQuery("");
                          setSortOrder("newest");
                        }}
                        className="text-xs"
                        data-testid="button-clear-filters"
                      >
                        Limpar filtros
                      </Button>
                    )}
                  </div>
                </Card>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-20 animate-fade-in">
              <div className="inline-block p-4 rounded-full bg-primary/10 mb-4">
                <Sparkles className="h-8 w-8 text-primary animate-glow" />
              </div>
              <p className="text-lg text-muted-foreground">Carregando...</p>
            </div>
          ) : submissions.length === 0 ? (
            <Card className="p-16 text-center glass shadow-card animate-scale-in">
              <div className="p-6 bg-gradient-to-br from-primary/10 to-primary-glow/10 rounded-2xl w-fit mx-auto mb-6">
                <FileText className="h-16 w-16 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Nenhuma resposta ainda</h3>
              <p className="text-lg text-muted-foreground mb-8">
                Compartilhe este formulário para começar a receber respostas!
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <Button 
                  onClick={() => {
                    const link = getFormUrl(formId, companySlug);
                    navigator.clipboard.writeText(link);
                  }}
                  variant="premium"
                  size="lg"
                >
                  Copiar Link do Formulário
                </Button>
                <Button 
                  onClick={() => window.open(getShortFormUrl(formId, companySlug), "_blank")}
                  variant="outline"
                  size="lg"
                  className="glass"
                >
                  Visualizar Formulário
                </Button>
              </div>
            </Card>
          ) : filteredSubmissions.length === 0 ? (
            <Card className="p-16 text-center glass shadow-card animate-scale-in">
              <div className="p-6 bg-gradient-to-br from-primary/10 to-primary-glow/10 rounded-2xl w-fit mx-auto mb-6">
                <Search className="h-16 w-16 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Nenhuma resposta encontrada</h3>
              <p className="text-lg text-muted-foreground mb-8">
                Tente ajustar os filtros ou buscar com outros termos
              </p>
              <Button 
                onClick={() => {
                  setSearchQuery("");
                  setSortOrder("newest");
                }}
                variant="outline"
                size="lg"
                className="glass"
              >
                Limpar filtros
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {filteredSubmissions.map((submission, index) => (
                <SubmissionCard 
                  key={submission.id} 
                  submission={submission} 
                  index={index} 
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormularioRespostas;
