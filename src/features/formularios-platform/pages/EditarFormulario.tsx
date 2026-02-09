import { useState, useEffect } from "react";
import { SimplifiedFormWizard } from "../components/SimplifiedFormWizard";
import { FormConfig, Question, DesignConfig, ScoreTier, FormElement, CompletionPageConfig, WelcomePageConfig } from "../types/form";
import { Button } from "../components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "../lib/queryClient";
import type { Form } from "../../../../shared/db-schema";
import { useParams, useLocation } from "wouter";

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
  title: "Formulário Concluído",
  subtitle: "Obrigado por responder!",
  successMessage: "Parabéns! Você está qualificado.",
  failureMessage: "Infelizmente você não atingiu a pontuação necessária.",
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

const EditarFormulario = () => {
  const params = useParams();
  const id = params.id;
  const [, setLocation] = useLocation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [welcomeTitle, setWelcomeTitle] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [elements, setElements] = useState<FormElement[]>([]);
  const [passingScore, setPassingScore] = useState(20);
  const [scoreTiers, setScoreTiers] = useState<ScoreTier[]>([]);
  const [designConfig, setDesignConfig] = useState<DesignConfig>(defaultDesign);
  const [welcomePageConfig, setWelcomePageConfig] = useState<WelcomePageConfig | undefined>(undefined);
  const [completionPageConfig, setCompletionPageConfig] = useState<CompletionPageConfig>(defaultCompletionPage);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  const { data: form, isLoading } = useQuery<Form>({
    queryKey: ["/api/forms", id],
    queryFn: async () => {
      const response = await fetch(`/api/forms/${id}`);
      if (!response.ok) throw new Error("Form not found");
      return response.json();
    },
    enabled: !!id,
  });

  // Load form data into state when it's fetched
  useEffect(() => {
    if (form) {
      setTitle(form.title);
      setDescription(form.description || "");
      
      // CRITICAL: Load welcomeConfig to preserve ALL fields (buttonText, logo, logoAlign, titleSize, extendedDescription)
      // If form.welcomeConfig exists, use its values
      if ((form as any).welcomeConfig) {
        const config = (form as any).welcomeConfig as WelcomePageConfig;
        setWelcomeTitle(config.title || '');
        setWelcomeMessage(config.description || '');
        // Store the complete object to preserve all fields
        setWelcomePageConfig(config);
      } else {
        // Fallback to legacy fields for old forms
        setWelcomeTitle((form as any).welcomeTitle || form.title || "");
        setWelcomeMessage((form as any).welcomeMessage || form.description || "");
        setWelcomePageConfig(undefined);
      }
      
      // Handle both old Question[] format and new FormElement[] format
      const formQuestions = form.questions as any[];
      if (formQuestions && formQuestions.length > 0) {
        // Detect format by checking element structure:
        // - New FormElement[] has type 'question' with questionType field, or type 'heading'/'pageBreak'
        // - New TextElement has type 'text' with 'content' field
        // - Old Question[] has type 'text'/'multiple-choice'/'radio' without 'questionType' or 'content' fields
        const isNewFormat = formQuestions.some((item: any) => {
          if (!item.type) return false;
          
          // Check for modern elements
          if (item.type === 'question' && 'questionType' in item) return true;
          if (item.type === 'heading' || item.type === 'pageBreak') return true;
          if (item.type === 'text' && 'content' in item) return true;
          
          return false;
        });
        
        if (isNewFormat) {
          // Already FormElement[] format - use directly
          setElements(formQuestions as FormElement[]);
        } else {
          // Old Question[] format - convert to COMPLETE FormElement[] structure
          // This includes welcome page elements and pageBreaks between questions
          const convertedElements: FormElement[] = [];
          
          // Get welcome page data
          const welcomeData = (form as any).welcomeConfig || {};
          const welcomeTitleText = welcomeData.title || (form as any).welcomeTitle || form.title || 'Bem-vindo!';
          const welcomeDescText = welcomeData.description || (form as any).welcomeMessage || form.description || '';
          
          // Add welcome page elements (heading + text)
          convertedElements.push({
            type: 'heading' as const,
            id: 'welcome-heading',
            text: welcomeTitleText,
            level: 1,
            elementTypeVersion: 1
          });
          
          convertedElements.push({
            type: 'text' as const,
            id: 'welcome-text',
            content: welcomeDescText,
            elementTypeVersion: 1
          });
          
          // Add pageBreak after welcome if there are questions
          if (formQuestions.length > 0) {
            convertedElements.push({
              type: 'pageBreak' as const,
              id: 'pagebreak-welcome',
              elementTypeVersion: 1
            });
          }
          
          // Add each question with pageBreaks between them
          formQuestions.forEach((q: any, index: number) => {
            // Normalize legacy types to standard questionType
            let questionType = q.type;
            if (questionType === 'radio' || questionType === 'select' || questionType === 'checkbox') {
              questionType = 'multiple-choice';
            } else if (questionType === 'textarea') {
              questionType = 'text';
            }
            
            convertedElements.push({
              type: 'question' as const,
              id: q.id,
              text: q.text,
              questionType: questionType,
              options: q.options,
              points: q.points,
              required: q.required || false,
              elementTypeVersion: 1
            });
            
            // Add pageBreak after each question except the last one
            if (index < formQuestions.length - 1) {
              convertedElements.push({
                type: 'pageBreak' as const,
                id: `pagebreak-after-${q.id}`,
                elementTypeVersion: 1
              });
            }
          });
          
          setElements(convertedElements);
        }
      } else {
        // Empty array or undefined
        setElements([]);
      }
      
      setPassingScore(form.passingScore);
      setScoreTiers((form.scoreTiers as ScoreTier[]) || []);
      setDesignConfig((form.designConfig as DesignConfig) || defaultDesign);

      // Load completion page config if available
      if (form.completionPageConfig) {
        setCompletionPageConfig(form.completionPageConfig as CompletionPageConfig);
      }
    }
  }, [form]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/forms/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/forms", id] });
      toast.success("Formulário salvo com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao salvar formulário");
    },
  });

  const handleUpdateForm = () => {
    const formData = {
      title,
      description,
      welcomeConfig: {
        ...(welcomePageConfig || {}),
        title: welcomeTitle,
        description: welcomeMessage
      },
      questions: elements, // Send as 'questions' for backend API compatibility
      passingScore,
      designConfig,
      completionPageConfig,
      ...(scoreTiers.length > 0 ? { scoreTiers } : { scoreTiers: null }),
    };
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-accent/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="container mx-auto px-4 py-8 relative">
        <div className="mb-6 flex items-center gap-4">
          <Button 
            onClick={() => setLocation("/admin/formularios")} 
            variant="outline" 
            className="gap-2" 
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Editar Formulário</h1>
            <p className="text-sm text-muted-foreground">
              Suas alterações são salvas automaticamente ao clicar em "Salvar Progresso"
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          <SimplifiedFormWizard
            title={title}
            description={description}
            welcomeTitle={welcomeTitle}
            welcomeMessage={welcomeMessage}
            elements={elements}
            passingScore={passingScore}
            scoreTiers={scoreTiers}
            designConfig={designConfig}
            welcomePageConfig={welcomePageConfig}
            completionPageConfig={completionPageConfig}
            onTitleChange={setTitle}
            onDescriptionChange={setDescription}
            onWelcomeTitleChange={setWelcomeTitle}
            onWelcomeMessageChange={setWelcomeMessage}
            onElementsChange={setElements}
            onPassingScoreChange={setPassingScore}
            onScoreTiersChange={setScoreTiers}
            onDesignChange={setDesignConfig}
            onWelcomePageConfigChange={setWelcomePageConfig}
            onCompletionPageChange={setCompletionPageConfig}
            onSave={handleUpdateForm}
            isSaving={updateMutation.isPending}
            activeStep={activeStep}
            onStepChange={setActiveStep}
          />
        </div>
      </div>
    </div>
  );
};

export default EditarFormulario;
