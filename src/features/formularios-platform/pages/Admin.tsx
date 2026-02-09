import { useState } from "react";
import { SimplifiedFormWizard } from "../components/SimplifiedFormWizard";
import { FormPreview } from "../components/FormPreview";
import { FormConfig, FormElement, DesignConfig, ScoreTier, CompletionPageConfig, extractQuestions } from "../types/form";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Label } from "../components/ui/label";
import { Sparkles, FileText, CheckCircle, Eye } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { api } from "../lib/api";
import type { CompletionPage } from "../../../../shared/db-schema";

const defaultDesign: DesignConfig = {
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
    titleSize: "2xl",
    textSize: "base"
  },
  logo: null,
  spacing: "comfortable"
};

const defaultCompletionPage: CompletionPageConfig = {
  title: "Obrigado!",
  successMessage: "Parabéns! Você está qualificado. Entraremos em contato em breve.",
  failureMessage: "Obrigado pela sua participação. Infelizmente você não atingiu a pontuação mínima.",
  showScore: true,
  showTierBadge: true,
  design: {
    colors: {
      primary: "hsl(221, 83%, 53%)",
      secondary: "hsl(210, 40%, 96%)",
      background: "hsl(0, 0%, 100%)",
      text: "hsl(222, 47%, 11%)",
      successIcon: "hsl(142, 71%, 45%)",
      failureIcon: "hsl(0, 84%, 60%)"
    },
    typography: {
      fontFamily: "Inter",
      titleSize: "3xl",
      textSize: "base"
    },
    spacing: "comfortable"
  }
};

const Admin = () => {
  const [, setLocation] = useLocation();
  const [title, setTitle] = useState("Formulário de Qualificação");
  const [description, setDescription] = useState("Responda as perguntas abaixo para verificar se você está qualificado para uma reunião com nosso time.");
  const [welcomeTitle, setWelcomeTitle] = useState("Questionário de Qualificação");
  const [welcomeMessage, setWelcomeMessage] = useState("Responda as perguntas abaixo para verificar se você está qualificado para uma reunião com nosso time.");
  const [elements, setElements] = useState<FormElement[]>([]);
  const [passingScore, setPassingScore] = useState(20);
  const [scoreTiers, setScoreTiers] = useState<ScoreTier[]>([]);
  const [designConfig, setDesignConfig] = useState<DesignConfig>(defaultDesign);
  const [completionPageConfig, setCompletionPageConfig] = useState<CompletionPageConfig>(defaultCompletionPage);
  const [selectedCompletionPageId, setSelectedCompletionPageId] = useState<string>("");
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  const { data: completionPagesResponse } = useQuery<{ success: boolean; pages: CompletionPage[] }>({
    queryKey: ["/api/completion-pages"],
  });

  const completionPages = completionPagesResponse?.pages || [];

  const createFormMutation = useMutation({
    mutationFn: (data: any) => api.createForm(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      toast.success("Formulário salvo com sucesso!");
      setLocation("/admin/formularios");
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar formulário: " + error.message);
    },
  });

  const handleSaveForm = () => {
    const questions = extractQuestions(elements);
    const formData = {
      title,
      description,
      welcomeConfig: {
        title: welcomeTitle,
        description: welcomeMessage,
        buttonText: "Começar",
        titleSize: "3xl" as const,
        logo: null,
        logoAlign: "center" as const,
        extendedDescription: ""
      },
      elements,
      questions,
      passingScore,
      designConfig,
      ...(scoreTiers.length > 0 && { scoreTiers }),
      ...(selectedCompletionPageId && { completionPageId: selectedCompletionPageId }),
    };
    createFormMutation.mutate(formData);
  };

  const livePreviewConfig: FormConfig = {
    title,
    description,
    elements,
    questions: extractQuestions(elements),
    passingScore,
    scoreTiers,
    designConfig,
    completionPageConfig
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="container mx-auto px-4 py-10 relative">
        <header className="text-center mb-10 animate-slide-up">
          <div className="inline-flex items-center gap-2 mb-5 px-5 py-2.5 glass rounded-full border border-primary/20 shadow-glow">
            <Sparkles className="h-4 w-4 text-primary animate-glow" />
            <span className="text-sm font-semibold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Dashboard Administrativo
            </span>
          </div>
          <h1 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
            Gerenciar Formulários
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Crie formulários de qualificação personalizados com sistema de pontuação e design exclusivo
          </p>
        </header>

        <div className="max-w-7xl mx-auto">
          <div className="animate-slide-up w-full">
            <Card className="p-8 glass border-2 border-border/50 shadow-card hover:shadow-card-hover transition-all duration-300">
              <SimplifiedFormWizard
                title={title}
                description={description}
                welcomeTitle={welcomeTitle}
                welcomeMessage={welcomeMessage}
                elements={elements}
                passingScore={passingScore}
                scoreTiers={scoreTiers}
                designConfig={designConfig}
                completionPageConfig={completionPageConfig}
                onTitleChange={setTitle}
                onDescriptionChange={setDescription}
                onWelcomeTitleChange={setWelcomeTitle}
                onWelcomeMessageChange={setWelcomeMessage}
                onElementsChange={setElements}
                onPassingScoreChange={setPassingScore}
                onScoreTiersChange={setScoreTiers}
                onDesignChange={setDesignConfig}
                onCompletionPageChange={setCompletionPageConfig}
                onSave={handleSaveForm}
                isSaving={createFormMutation.isPending}
                activeStep={activeStep}
                onStepChange={setActiveStep}
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
