import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useState } from "react";
import { FileText, Sparkles, Eye, Save, Plus, Trash2, CheckCircle, XCircle, Upload, Palette, List } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { CompletionPage } from "../../../../shared/db-schema";
import { CompletionPagePreview } from "../components/design/CompletionPagePreview";
import { toast } from "sonner";
import { queryClient } from "../lib/queryClient";
import { ColorPicker } from "@/components/design/ColorPicker";

interface CompletionPageForm {
  name: string;
  title: string;
  subtitle: string;
  successMessage: string;
  failureMessage: string;
  showScore: boolean;
  showTierBadge: boolean;
  logo: string | null;
  logoAlign: string;
  successIconColor: string;
  failureIconColor: string;
  successIconImage: string | null;
  failureIconImage: string | null;
  successIconType: string;
  failureIconType: string;
  ctaText: string;
  ctaUrl: string;
  customContent: string;
  designConfig: {
    colors: {
      primary: string;
      secondary: string;
      background: string;
      text: string;
    };
    typography: {
      fontFamily: string;
      titleSize: string;
      textSize: string;
    };
    spacing: string;
  };
}

const defaultPage: CompletionPageForm = {
  name: "Nova Página Final",
  title: "Obrigado!",
  subtitle: "",
  successMessage: "Parabéns! Você está qualificado. Entraremos em contato em breve.",
  failureMessage: "Obrigado pela sua participação. Infelizmente você não atingiu a pontuação mínima.",
  showScore: true,
  showTierBadge: true,
  logo: null,
  logoAlign: "center",
  successIconColor: "hsl(142, 71%, 45%)",
  failureIconColor: "hsl(0, 84%, 60%)",
  successIconImage: null,
  failureIconImage: null,
  successIconType: "check-circle",
  failureIconType: "x-circle",
  ctaText: "",
  ctaUrl: "",
  customContent: "",
  designConfig: {
    colors: {
      primary: "hsl(221, 83%, 53%)",
      secondary: "hsl(210, 40%, 96%)",
      background: "hsl(0, 0%, 100%)",
      text: "hsl(222, 47%, 11%)",
      button: "hsl(221, 83%, 53%)",
      buttonText: "hsl(0, 0%, 100%)"
    },
    typography: {
      fontFamily: "Inter",
      titleSize: "3xl",
      textSize: "base"
    },
    spacing: "comfortable"
  }
};

export default function VerPaginasFinal() {
  const [, setLocation] = useLocation();
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [pageForm, setPageForm] = useState<CompletionPageForm>(defaultPage);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [previewMode, setPreviewMode] = useState<"success" | "failure">("success");
  const [showPagesList, setShowPagesList] = useState(false);

  const { data: pages = [], isLoading } = useQuery<CompletionPage[]>({
    queryKey: ["/api/completion-pages"],
  });

  const createPageMutation = useMutation({
    mutationFn: (data: any) =>
      fetch("/api/completion-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      }).then((res) => {
        if (!res.ok) throw new Error("Erro ao criar página final");
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/completion-pages"] });
      toast.success("Página final criada com sucesso!");
      setIsCreatingNew(false);
      setPageForm(defaultPage);
    },
    onError: (error: any) => {
      toast.error("Erro ao criar: " + error.message);
    },
  });

  const updatePageMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetch(`/api/completion-pages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      }).then((res) => {
        if (!res.ok) throw new Error("Erro ao atualizar página final");
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/completion-pages"] });
      toast.success("Página final atualizada com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  const deletePageMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/completion-pages/${id}`, {
        method: "DELETE",
        credentials: "include",
      }).then((res) => {
        if (!res.ok) throw new Error("Erro ao deletar página final");
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/completion-pages"] });
      toast.success("Página final deletada com sucesso!");
      setSelectedPageId(null);
    },
    onError: (error: any) => {
      toast.error("Erro ao deletar: " + error.message);
    },
  });

  const handleSelectPage = (page: CompletionPage) => {
    setSelectedPageId(page.id);
    setIsCreatingNew(false);
    setShowPagesList(false);
    setPageForm({
      name: page.name,
      title: page.title,
      subtitle: page.subtitle || "",
      successMessage: page.successMessage,
      failureMessage: page.failureMessage,
      showScore: page.showScore ?? true,
      showTierBadge: page.showTierBadge ?? true,
      logo: page.logo,
      logoAlign: page.logoAlign || "center",
      successIconColor: page.successIconColor || "hsl(142, 71%, 45%)",
      failureIconColor: page.failureIconColor || "hsl(0, 84%, 60%)",
      successIconImage: page.successIconImage || null,
      failureIconImage: page.failureIconImage || null,
      successIconType: page.successIconType || "check-circle",
      failureIconType: page.failureIconType || "x-circle",
      ctaText: page.ctaText || "",
      ctaUrl: page.ctaUrl || "",
      customContent: page.customContent || "",
      designConfig: page.designConfig as any || defaultPage.designConfig
    });
  };

  const handleCreateNew = () => {
    setIsCreatingNew(true);
    setSelectedPageId(null);
    setShowPagesList(false);
    setPageForm(defaultPage);
  };

  const handleSave = () => {
    if (isCreatingNew) {
      createPageMutation.mutate(pageForm);
    } else if (selectedPageId) {
      updatePageMutation.mutate({ id: selectedPageId, data: pageForm });
    }
  };

  const handleDelete = () => {
    if (!selectedPageId) return;
    if (confirm("Tem certeza que deseja deletar esta página final?")) {
      deletePageMutation.mutate(selectedPageId);
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("logo", file);

    try {
      const response = await fetch("/api/upload/logo", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) throw new Error("Erro no upload");

      const data = await response.json();
      setPageForm({ ...pageForm, logo: data.url });
      toast.success("Logo enviado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao enviar logo: " + error.message);
    }
  };

  const handleUploadSuccessIcon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("logo", file);

    try {
      const response = await fetch("/api/upload/logo", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) throw new Error("Erro no upload");

      const data = await response.json();
      setPageForm({ ...pageForm, successIconImage: data.url });
      toast.success("Ícone de sucesso enviado!");
    } catch (error: any) {
      toast.error("Erro ao enviar ícone: " + error.message);
    }
  };

  const handleUploadFailureIcon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("logo", file);

    try {
      const response = await fetch("/api/upload/logo", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) throw new Error("Erro no upload");

      const data = await response.json();
      setPageForm({ ...pageForm, failureIconImage: data.url });
      toast.success("Ícone de falha enviado!");
    } catch (error: any) {
      toast.error("Erro ao enviar ícone: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-accent/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="container mx-auto px-4 py-12 relative">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 animate-slide-up">
            <div>
              <div className="inline-flex items-center gap-2 mb-3 px-4 py-1.5 glass rounded-full border border-primary/20">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">Gerenciamento</span>
              </div>
              <h1 className="text-5xl font-extrabold mb-3 bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
                Páginas Finais
              </h1>
              <p className="text-lg text-muted-foreground">
                Crie páginas de conclusão independentes e reutilizáveis
              </p>
            </div>
            <div className="flex gap-3 animate-fade-in">
              <Button 
                onClick={handleCreateNew}
                variant="premium" 
                className="gap-2 shadow-luxury"
              >
                <Plus className="h-4 w-4" />
                Criar Nova Página
              </Button>
              {pages.length > 0 && (
                <Button 
                  onClick={() => setShowPagesList(!showPagesList)}
                  variant="outline" 
                  className="gap-2 glass"
                >
                  <List className="h-4 w-4" />
                  {showPagesList ? 'Ocultar Lista' : 'Ver Todas'}
                </Button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-20 animate-fade-in">
              <div className="inline-block p-4 rounded-full bg-primary/10 mb-4">
                <Sparkles className="h-8 w-8 text-primary animate-glow" />
              </div>
              <p className="text-lg text-muted-foreground">Carregando páginas finais...</p>
            </div>
          ) : !selectedPageId && !isCreatingNew && !showPagesList ? (
            <Card className="border-2 border-dashed glass shadow-card animate-scale-in">
              <CardContent className="py-20 text-center">
                <div className="p-6 bg-gradient-to-br from-primary/10 to-primary-glow/10 rounded-2xl w-fit mx-auto mb-6">
                  <CheckCircle className="h-16 w-16 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Selecione ou crie uma página final</h3>
                <p className="text-muted-foreground mb-8 text-lg">
                  Escolha uma página da lista ou crie uma nova
                </p>
                <div className="flex gap-4 justify-center">
                  <Button 
                    onClick={handleCreateNew}
                    variant="premium"
                    size="lg"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Criar Nova Página
                  </Button>
                  {pages.length > 0 && (
                    <Button 
                      onClick={() => setShowPagesList(true)}
                      variant="outline"
                      size="lg"
                      className="glass"
                    >
                      <List className="h-5 w-5 mr-2" />
                      Ver Todas ({pages.length})
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : showPagesList ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pages.map((page, index) => (
                <Card 
                  key={page.id} 
                  className="glass hover-lift border-2 border-border/50 hover:border-primary/30 shadow-card animate-slide-up group cursor-pointer"
                  style={{ animationDelay: `${index * 0.05}s` }}
                  onClick={() => handleSelectPage(page)}
                >
                  <CardHeader>
                    <CardTitle className="text-xl font-bold flex items-start justify-between gap-2">
                      <span className="flex-1">{page.name}</span>
                      <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    </CardTitle>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(page.createdAt!), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {page.title}
                    </p>
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectPage(page);
                      }}
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                    >
                      Editar Página
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary-glow/10">
                    <Palette className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">
                      {isCreatingNew ? "Criar Nova Página Final" : "Editar Página Final"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Personalize todos os aspectos da página
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  {!isCreatingNew && (
                    <Button
                      onClick={handleDelete}
                      disabled={deletePageMutation.isPending}
                      variant="destructive"
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Deletar
                    </Button>
                  )}
                  <Button
                    onClick={handleSave}
                    disabled={createPageMutation.isPending || updatePageMutation.isPending}
                    className="gap-2 bg-gradient-to-r from-primary to-primary-glow hover:shadow-glow"
                    size="lg"
                  >
                    <Save className="h-5 w-5" />
                    {isCreatingNew ? "Criar Página" : "Salvar Alterações"}
                  </Button>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-10">
                <div className="animate-slide-up">
                  <Tabs defaultValue="content" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 glass">
                      <TabsTrigger value="content">Conteúdo</TabsTrigger>
                      <TabsTrigger value="design">Design</TabsTrigger>
                    </TabsList>

                <TabsContent value="content" className="space-y-6 mt-6">
                  <Card className="p-6 glass border-2 border-border/50 shadow-card">
                    <div className="space-y-6">
                      <div>
                        <Label htmlFor="name">Nome da Página</Label>
                        <Input
                          id="name"
                          value={pageForm.name}
                          onChange={(e) => setPageForm({ ...pageForm, name: e.target.value })}
                          placeholder="Ex: Página Final Padrão"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="title">Título da Página</Label>
                          <Input
                            id="title"
                            value={pageForm.title}
                            onChange={(e) => setPageForm({ ...pageForm, title: e.target.value })}
                            placeholder="Ex: Obrigado!"
                          />
                        </div>
                        <div>
                          <Label htmlFor="subtitle">Subtítulo (Opcional)</Label>
                          <Input
                            id="subtitle"
                            value={pageForm.subtitle}
                            onChange={(e) => setPageForm({ ...pageForm, subtitle: e.target.value })}
                            placeholder="Ex: Sua resposta foi registrada"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="successMessage">Mensagem de Sucesso</Label>
                        <Textarea
                          id="successMessage"
                          value={pageForm.successMessage}
                          onChange={(e) => setPageForm({ ...pageForm, successMessage: e.target.value })}
                          placeholder="Mensagem para candidatos qualificados"
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label htmlFor="failureMessage">Mensagem de Não Qualificado</Label>
                        <Textarea
                          id="failureMessage"
                          value={pageForm.failureMessage}
                          onChange={(e) => setPageForm({ ...pageForm, failureMessage: e.target.value })}
                          placeholder="Mensagem para candidatos não qualificados"
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="ctaText">Texto do Botão (Opcional)</Label>
                          <Input
                            id="ctaText"
                            value={pageForm.ctaText}
                            onChange={(e) => setPageForm({ ...pageForm, ctaText: e.target.value })}
                            placeholder="Ex: Agendar Reunião"
                          />
                        </div>
                        <div>
                          <Label htmlFor="ctaUrl">Link do Botão</Label>
                          <Input
                            id="ctaUrl"
                            value={pageForm.ctaUrl}
                            onChange={(e) => setPageForm({ ...pageForm, ctaUrl: e.target.value })}
                            placeholder="https://..."
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="customContent">Conteúdo Adicional (HTML)</Label>
                        <Textarea
                          id="customContent"
                          value={pageForm.customContent}
                          onChange={(e) => setPageForm({ ...pageForm, customContent: e.target.value })}
                          placeholder="<p>Texto adicional em HTML</p>"
                          rows={4}
                        />
                      </div>

                      <div className="flex gap-6">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="showScore"
                            checked={pageForm.showScore}
                            onCheckedChange={(checked) => setPageForm({ ...pageForm, showScore: checked })}
                          />
                          <Label htmlFor="showScore">Mostrar Pontuação</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="showTierBadge"
                            checked={pageForm.showTierBadge}
                            onCheckedChange={(checked) => setPageForm({ ...pageForm, showTierBadge: checked })}
                          />
                          <Label htmlFor="showTierBadge">Mostrar Badge de Nível</Label>
                        </div>
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="design" className="space-y-6 mt-6">
                  <Card className="p-6 glass border-2 border-border/50 shadow-card">
                    <div className="space-y-6">
                      <div>
                        <Label>Logo</Label>
                        <div className="flex gap-4 items-center mt-2">
                          <label className="cursor-pointer">
                            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors">
                              <Upload className="h-4 w-4" />
                              <span className="text-sm">Enviar Logo</span>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleUploadLogo}
                              className="hidden"
                            />
                          </label>
                          {pageForm.logo && (
                            <div className="flex items-center gap-3">
                              <img src={pageForm.logo} alt="Logo" className="h-12 w-12 object-contain" />
                              <Button
                                onClick={() => setPageForm({ ...pageForm, logo: null })}
                                variant="ghost"
                                size="sm"
                              >
                                Remover
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {pageForm.logo && (
                        <div>
                          <Label>Alinhamento do Logo</Label>
                          <Select
                            value={pageForm.logoAlign}
                            onValueChange={(value) => setPageForm({ ...pageForm, logoAlign: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="left">Esquerda</SelectItem>
                              <SelectItem value="center">Centro</SelectItem>
                              <SelectItem value="right">Direita</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="border-t pt-6">
                        <h3 className="font-semibold mb-4">Personalização de Ícones</h3>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <Label className="text-base">Ícone de Sucesso (Qualificado)</Label>
                            
                            <div>
                              <Label>Tipo de Ícone</Label>
                              <Select
                                value={pageForm.successIconType}
                                onValueChange={(value) => setPageForm({ ...pageForm, successIconType: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="check-circle">✓ Check Circle</SelectItem>
                                  <SelectItem value="star">★ Estrela</SelectItem>
                                  <SelectItem value="trophy">🏆 Troféu</SelectItem>
                                  <SelectItem value="sparkles">✨ Sparkles</SelectItem>
                                  <SelectItem value="heart">❤ Coração</SelectItem>
                                  <SelectItem value="thumbs-up">👍 Thumbs Up</SelectItem>
                                  <SelectItem value="party-popper">🎉 Party Popper</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label>Cor do Ícone</Label>
                              <ColorPicker
                                color={pageForm.successIconColor}
                                onChange={(color) => setPageForm({ ...pageForm, successIconColor: color })}
                              />
                            </div>

                            <div>
                              <Label>Ou envie uma imagem customizada</Label>
                              <div className="flex gap-4 items-center mt-2">
                                <label className="cursor-pointer">
                                  <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors">
                                    <Upload className="h-4 w-4" />
                                    <span className="text-sm">Enviar Ícone</span>
                                  </div>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleUploadSuccessIcon}
                                    className="hidden"
                                  />
                                </label>
                                {pageForm.successIconImage && (
                                  <div className="flex items-center gap-3">
                                    <img src={pageForm.successIconImage} alt="Ícone" className="h-12 w-12 object-contain" />
                                    <Button
                                      onClick={() => setPageForm({ ...pageForm, successIconImage: null })}
                                      variant="ghost"
                                      size="sm"
                                    >
                                      Remover
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                A imagem customizada substitui o ícone padrão
                              </p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <Label className="text-base">Ícone de Falha (Não Qualificado)</Label>
                            
                            <div>
                              <Label>Tipo de Ícone</Label>
                              <Select
                                value={pageForm.failureIconType}
                                onValueChange={(value) => setPageForm({ ...pageForm, failureIconType: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="x-circle">✕ X Circle</SelectItem>
                                  <SelectItem value="star">★ Estrela</SelectItem>
                                  <SelectItem value="trophy">🏆 Troféu</SelectItem>
                                  <SelectItem value="sparkles">✨ Sparkles</SelectItem>
                                  <SelectItem value="heart">❤ Coração</SelectItem>
                                  <SelectItem value="thumbs-up">👍 Thumbs Up</SelectItem>
                                  <SelectItem value="party-popper">🎉 Party Popper</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label>Cor do Ícone</Label>
                              <ColorPicker
                                color={pageForm.failureIconColor}
                                onChange={(color) => setPageForm({ ...pageForm, failureIconColor: color })}
                              />
                            </div>

                            <div>
                              <Label>Ou envie uma imagem customizada</Label>
                              <div className="flex gap-4 items-center mt-2">
                                <label className="cursor-pointer">
                                  <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors">
                                    <Upload className="h-4 w-4" />
                                    <span className="text-sm">Enviar Ícone</span>
                                  </div>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleUploadFailureIcon}
                                    className="hidden"
                                  />
                                </label>
                                {pageForm.failureIconImage && (
                                  <div className="flex items-center gap-3">
                                    <img src={pageForm.failureIconImage} alt="Ícone" className="h-12 w-12 object-contain" />
                                    <Button
                                      onClick={() => setPageForm({ ...pageForm, failureIconImage: null })}
                                      variant="ghost"
                                      size="sm"
                                    >
                                      Remover
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                A imagem customizada substitui o ícone padrão
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <h3 className="font-semibold mb-4">Cores do Design</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Cor Primária</Label>
                            <ColorPicker
                              color={pageForm.designConfig.colors.primary}
                              onChange={(color) => setPageForm({
                                ...pageForm,
                                designConfig: {
                                  ...pageForm.designConfig,
                                  colors: { ...pageForm.designConfig.colors, primary: color }
                                }
                              })}
                            />
                          </div>
                          <div>
                            <Label>Cor Secundária</Label>
                            <ColorPicker
                              color={pageForm.designConfig.colors.secondary}
                              onChange={(color) => setPageForm({
                                ...pageForm,
                                designConfig: {
                                  ...pageForm.designConfig,
                                  colors: { ...pageForm.designConfig.colors, secondary: color }
                                }
                              })}
                            />
                          </div>
                          <div>
                            <Label>Cor de Fundo</Label>
                            <ColorPicker
                              color={pageForm.designConfig.colors.background}
                              onChange={(color) => setPageForm({
                                ...pageForm,
                                designConfig: {
                                  ...pageForm.designConfig,
                                  colors: { ...pageForm.designConfig.colors, background: color }
                                }
                              })}
                            />
                          </div>
                          <div>
                            <Label>Cor do Texto</Label>
                            <ColorPicker
                              color={pageForm.designConfig.colors.text}
                              onChange={(color) => setPageForm({
                                ...pageForm,
                                designConfig: {
                                  ...pageForm.designConfig,
                                  colors: { ...pageForm.designConfig.colors, text: color }
                                }
                              })}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <h3 className="font-semibold mb-4">Tipografia</h3>
                        <div className="space-y-4">
                          <div>
                            <Label>Fonte</Label>
                            <Select
                              value={pageForm.designConfig.typography.fontFamily}
                              onValueChange={(value) => setPageForm({
                                ...pageForm,
                                designConfig: {
                                  ...pageForm.designConfig,
                                  typography: { ...pageForm.designConfig.typography, fontFamily: value }
                                }
                              })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Inter">Inter</SelectItem>
                                <SelectItem value="Poppins">Poppins</SelectItem>
                                <SelectItem value="Roboto">Roboto</SelectItem>
                                <SelectItem value="Montserrat">Montserrat</SelectItem>
                                <SelectItem value="Open Sans">Open Sans</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Tamanho do Título</Label>
                              <Select
                                value={pageForm.designConfig.typography.titleSize}
                                onValueChange={(value) => setPageForm({
                                  ...pageForm,
                                  designConfig: {
                                    ...pageForm.designConfig,
                                    typography: { ...pageForm.designConfig.typography, titleSize: value }
                                  }
                                })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="xl">Pequeno</SelectItem>
                                  <SelectItem value="2xl">Médio</SelectItem>
                                  <SelectItem value="3xl">Grande</SelectItem>
                                  <SelectItem value="4xl">Extra Grande</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Tamanho do Texto</Label>
                              <Select
                                value={pageForm.designConfig.typography.textSize}
                                onValueChange={(value) => setPageForm({
                                  ...pageForm,
                                  designConfig: {
                                    ...pageForm.designConfig,
                                    typography: { ...pageForm.designConfig.typography, textSize: value }
                                  }
                                })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="sm">Pequeno</SelectItem>
                                  <SelectItem value="base">Médio</SelectItem>
                                  <SelectItem value="lg">Grande</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <h3 className="font-semibold mb-4">Espaçamento</h3>
                        <Select
                          value={pageForm.designConfig.spacing}
                          onValueChange={(value) => setPageForm({
                            ...pageForm,
                            designConfig: { ...pageForm.designConfig, spacing: value }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="compact">Compacto</SelectItem>
                            <SelectItem value="comfortable">Confortável</SelectItem>
                            <SelectItem value="spacious">Espaçoso</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>
                </TabsContent>
                  </Tabs>
                </div>

                <div className="lg:sticky lg:top-8 lg:self-start animate-slide-up" style={{ animationDelay: '0.2s' }}>
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary-glow/10">
                        <Eye className="h-5 w-5 text-primary" />
                      </div>
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                        Pré-visualização em Tempo Real
                      </h2>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={previewMode === "success" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPreviewMode("success")}
                        className="gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Qualificado
                      </Button>
                      <Button
                        variant={previewMode === "failure" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPreviewMode("failure")}
                        className="gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        Não Qualificado
                      </Button>
                    </div>
                  </div>
                  <div className="glass border-2 border-primary/20 rounded-xl p-6 shadow-luxury max-h-[calc(100vh-12rem)] overflow-y-auto">
                    <CompletionPagePreview
                      config={{
                        title: pageForm.title,
                        subtitle: pageForm.subtitle,
                        successMessage: pageForm.successMessage,
                        failureMessage: pageForm.failureMessage,
                        showScore: pageForm.showScore,
                        showTierBadge: pageForm.showTierBadge,
                        logo: pageForm.logo,
                        logoAlign: pageForm.logoAlign,
                        successIconColor: pageForm.successIconColor,
                        failureIconColor: pageForm.failureIconColor,
                        successIconImage: pageForm.successIconImage,
                        failureIconImage: pageForm.failureIconImage,
                        successIconType: pageForm.successIconType,
                        failureIconType: pageForm.failureIconType,
                        ctaText: pageForm.ctaText,
                        ctaUrl: pageForm.ctaUrl,
                        customContent: pageForm.customContent,
                        designConfig: pageForm.designConfig
                      }}
                      passed={previewMode === "success"}
                      score={previewMode === "success" ? 85 : 45}
                      tier={previewMode === "success" ? "Muito Qualificado" : "Pouco Qualificado"}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
