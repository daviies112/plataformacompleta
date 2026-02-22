import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { useState } from "react";
import { ExternalLink, Copy, Check, FileText, Calendar, BarChart, Edit, Trash2, Sparkles, TrendingUp, Star } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "../lib/queryClient";
import type { Form } from "../../../../shared/db-schema";
import { useCompanySlug, getFormUrl, getShortFormUrl } from "../hooks/useCompanySlug";

export default function VerFormularios() {
  const [, setLocation] = useLocation();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<string | null>(null);
  const { companySlug } = useCompanySlug();

  const { data: formsResponse, isLoading } = useQuery({
    queryKey: ["/api/forms"],
  });

  const forms = Array.isArray(formsResponse)
    ? formsResponse
    : formsResponse?.forms || [];

  // Buscar formulário ativo
  const { data: activeFormResponse } = useQuery({
    queryKey: ["/api/formularios/ativo"],
    retry: false,
  });

  const activeFormId = activeFormResponse?.id || null;

  // Mutation para marcar formulário como ativo
  const setActiveFormMutation = useMutation({
    mutationFn: (formId: string) => {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      try {
        const userData = localStorage.getItem('user_data');
        const tid = userData ? JSON.parse(userData)?.tenantId : (localStorage.getItem('tenantId') || localStorage.getItem('tenant_id'));
        if (tid) headers["x-tenant-id"] = tid;
      } catch { }
      return fetch("/api/formularios/config/ativo", {
        method: "PUT",
        headers,
        body: JSON.stringify({ formId }),
        credentials: "include",
      }).then((res) => {
        if (!res.ok) throw new Error("Erro ao marcar formulário como ativo");
        return res.json();
      });
    },
    onSuccess: (_data, formId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/formularios/ativo"] });
      toast.success("Formulário marcado como ativo!");
      console.log("✅ Formulário ativo salvo:", formId);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao marcar formulário como ativo");
      console.error("❌ Erro ao salvar formulário ativo:", error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/forms/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      toast.success("Formulário excluído com sucesso!");
      setDeleteDialogOpen(false);
      setFormToDelete(null);
    },
    onError: () => {
      toast.error("Erro ao excluir formulário");
    },
  });

  // Copiar link do formulário usando slug quando disponível
  const copyFormLink = async (form: any) => {
    const link = getFormUrl(form, companySlug);
    const { copyToClipboard } = await import('@/lib/clipboard');

    const success = await copyToClipboard(link);
    if (success) {
      setCopiedId(form.id);
      toast.success("Link copiado!");
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      toast.error("Erro ao copiar link");
    }
  };

  // Abrir formulário usando slug quando disponível
  const openForm = (form: any) => {
    const shortUrl = getShortFormUrl(form, companySlug);
    window.open(shortUrl, "_blank");
  };

  const handleDeleteClick = (formId: string) => {
    setFormToDelete(formId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (formToDelete) {
      deleteMutation.mutate(formToDelete);
    }
  };

  const handleEdit = (formId: string) => {
    setLocation(`/admin/editar/${formId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-accent/5 via-transparent to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 py-12 relative">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 animate-slide-up">
            <div>
              <h1 className="text-3xl font-extrabold mb-2 bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
                Formulários Criados
              </h1>
              <p className="text-base text-muted-foreground">
                Gerencie e compartilhe seus formulários de qualificação
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-20 animate-fade-in">
              <div className="inline-block p-4 rounded-full bg-primary/10 mb-4">
                <Sparkles className="h-8 w-8 text-primary animate-glow" />
              </div>
              <p className="text-lg text-muted-foreground">Carregando formulários...</p>
            </div>
          ) : forms.length === 0 ? (
            <Card className="border-2 border-dashed glass shadow-card animate-scale-in">
              <CardContent className="py-20 text-center">
                <div className="p-6 bg-gradient-to-br from-primary/10 to-primary-glow/10 rounded-2xl w-fit mx-auto mb-6">
                  <FileText className="h-16 w-16 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Nenhum formulário criado</h3>
                <p className="text-muted-foreground mb-8 text-lg">
                  Comece criando seu primeiro formulário de qualificação
                </p>
                <Button
                  onClick={() => setLocation("/admin")}
                  variant="premium"
                  size="lg"
                  data-testid="button-create-first"
                >
                  <FileText className="h-5 w-5 mr-2" />
                  Criar Primeiro Formulário
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-8 md:grid-cols-2">
              {forms.map((form, index) => (
                <Card
                  key={form.id}
                  className="glass hover-lift border-2 border-border/50 hover:border-primary/30 shadow-card animate-slide-up group overflow-hidden"
                  data-testid={`card-form-${form.id}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />

                  <CardHeader className="relative">
                    <div className="flex justify-between items-start mb-3">
                      <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text flex items-center gap-2">
                        {form.title}
                        {activeFormId === form.id && (
                          <Badge
                            variant="default"
                            className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground animate-glow gap-1"
                            data-testid={`badge-active-${form.id}`}
                          >
                            <Star className="h-3 w-3 fill-current" />
                            Ativo
                          </Badge>
                        )}
                      </CardTitle>
                      <Badge
                        variant="secondary"
                        className="glass shadow-sm"
                        data-testid={`badge-questions-${form.id}`}
                      >
                        {(form.questions as any[]).length} perguntas
                      </Badge>
                    </div>
                    <CardDescription className="text-base leading-relaxed">{form.description}</CardDescription>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4 pt-4 border-t border-border/50">
                      <div className="p-1.5 rounded bg-primary/10">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span data-testid={`text-created-${form.id}`}>
                        {format(new Date(form.createdAt!), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 flex-wrap">
                      {activeFormId === form.id ? (
                        <Badge
                          variant="outline"
                          className="px-3 py-1.5 bg-primary/10 border-primary/30 text-primary gap-1"
                          data-testid={`active-indicator-${form.id}`}
                        >
                          <Star className="h-3.5 w-3.5 fill-current" />
                          Formulário Ativo
                        </Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveFormMutation.mutate(form.id)}
                          disabled={setActiveFormMutation.isPending}
                          className="gap-2 glass hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                          data-testid={`button-set-active-${form.id}`}
                        >
                          <Star className="h-4 w-4" />
                          Marcar como Ativo
                        </Button>
                      )}
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => openForm(form)}
                        className="gap-2"
                        data-testid={`button-open-${form.id}`}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Abrir
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyFormLink(form)}
                        className="gap-2 glass"
                        data-testid={`button-copy-${form.id}`}
                      >
                        {copiedId === form.id ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        {copiedId === form.id ? "Copiado!" : "Copiar Link"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(form.id)}
                        className="gap-2 glass"
                        data-testid={`button-edit-${form.id}`}
                      >
                        <Edit className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation(`/admin/formularios/${form.id}/respostas`)}
                        className="gap-2 glass"
                        data-testid={`button-responses-${form.id}`}
                      >
                        <TrendingUp className="h-4 w-4" />
                        Ver Respostas
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(form.id)}
                        className="gap-2"
                        data-testid={`button-delete-${form.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="glass">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Tem certeza que deseja excluir este formulário? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete" className="glass">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
