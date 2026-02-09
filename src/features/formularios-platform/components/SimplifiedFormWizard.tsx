import { useState, useMemo, useEffect } from "react";
import { FormElement, DesignConfig, FormTemplate, ScoreTier, CompletionPageConfig, WelcomePageConfig, QuestionElement, HeadingElement, TextElement, PageBreakElement, QuestionOption, isQuestionElement, isHeadingElement, isTextElement } from "../types/form";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Plus, ArrowRight, ArrowLeft, Save, Trash2, Eye, Palette, FileText, Target, ChevronRight, CheckCircle2, Edit2, GripVertical, Upload, X, Image as ImageIcon } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { DesignCustomizer } from "./design/DesignCustomizer";
import { CompletionPageCustomizer } from "./design/CompletionPageCustomizer";
import { CompletionPagePreview } from "./design/CompletionPagePreview";
import { FormPreview } from "./FormPreview";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useToast } from "../hooks/use-toast";
import { Separator } from "./ui/separator";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { api } from "../lib/api";
import { useIsMobile } from "../hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SimplifiedFormWizardProps {
  title: string;
  description: string;
  welcomeTitle?: string;
  welcomeMessage?: string;
  elements: FormElement[];
  passingScore: number;
  scoreTiers?: ScoreTier[];
  designConfig: DesignConfig;
  welcomePageConfig?: WelcomePageConfig;
  completionPageConfig?: CompletionPageConfig;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onWelcomeTitleChange?: (welcomeTitle: string) => void;
  onWelcomeMessageChange?: (welcomeMessage: string) => void;
  onElementsChange: (elements: FormElement[]) => void;
  onPassingScoreChange: (score: number) => void;
  onScoreTiersChange?: (tiers: ScoreTier[]) => void;
  onDesignChange: (design: DesignConfig) => void;
  onWelcomePageConfigChange?: (config: WelcomePageConfig) => void;
  onCompletionPageChange?: (config: CompletionPageConfig) => void;
  onSave?: () => void;
  isSaving?: boolean;
  onSaveAsTemplate?: () => void;
  activeStep?: 1 | 2 | 3;
  onStepChange?: (step: 1 | 2 | 3) => void;
}

interface WelcomePageData {
  title: string;
  description: string;
  buttonText: string;
  logo?: string | null;
  titleSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  extendedDescription?: string;
  logoAlign?: 'left' | 'center' | 'right';
}

interface QuestionData {
  id: string;
  text: string;
  questionType: 'multiple-choice' | 'text';
  required: boolean;
  points: number;
  options?: QuestionOption[];
}

const questionTypeOptions = [
  { value: 'text', label: 'Texto curto' },
  { value: 'multiple-choice', label: 'Múltipla escolha' }
];

interface SortableQuestionItemProps {
  question: QuestionData;
  index: number;
  onEdit: (question: QuestionData) => void;
  onDelete: (questionId: string) => void;
}

interface SortableQuestionItemPropsWithSelection extends SortableQuestionItemProps {
  isSelected?: boolean;
  onSelect?: (questionId: string) => void;
}

const SortableQuestionItem = ({ question, index, onEdit, onDelete, isSelected = false, onSelect }: SortableQuestionItemPropsWithSelection) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect?.(question.id)}
      className={`p-4 rounded-lg border cursor-pointer transition-all flex items-center gap-4 ${
        isDragging 
          ? 'shadow-lg ring-2 ring-primary bg-background' 
          : isSelected
          ? 'bg-primary/10 border-primary shadow-md hover:bg-primary/15'
          : 'bg-background/50 hover:bg-background'
      }`}
    >
      <div 
        className="flex items-center gap-3 text-muted-foreground cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5 hover:text-primary transition-colors" />
        <span className="font-semibold text-primary">{index + 1}</span>
      </div>
      <div className="flex-1">
        <div className="font-medium">{question.text || 'Pergunta sem título'}</div>
        <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
          <span>{questionTypeOptions.find(t => t.value === question.questionType)?.label}</span>
          <span>•</span>
          <span>{question.points} pontos</span>
          {question.required && (
            <>
              <span>•</span>
              <span className="text-destructive">Obrigatória</span>
            </>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(question)}
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(question.id)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export const SimplifiedFormWizard = ({
  title,
  description,
  welcomeTitle,
  welcomeMessage,
  elements,
  passingScore,
  scoreTiers = [],
  designConfig,
  welcomePageConfig: externalWelcomePageConfig,
  completionPageConfig,
  onTitleChange,
  onDescriptionChange,
  onWelcomeTitleChange,
  onWelcomeMessageChange,
  onElementsChange,
  onPassingScoreChange,
  onScoreTiersChange,
  onDesignChange,
  onWelcomePageConfigChange,
  onCompletionPageChange,
  onSave,
  isSaving = false,
  onSaveAsTemplate,
  activeStep = 1,
  onStepChange
}: SimplifiedFormWizardProps) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  
  const [welcomePage, setWelcomePage] = useState<WelcomePageData>({
    title: welcomeTitle || externalWelcomePageConfig?.title || '',
    description: welcomeMessage || externalWelcomePageConfig?.description || '',
    buttonText: externalWelcomePageConfig?.buttonText || 'Começar',
    logo: externalWelcomePageConfig?.logo,
    titleSize: externalWelcomePageConfig?.titleSize,
    extendedDescription: externalWelcomePageConfig?.extendedDescription,
    logoAlign: externalWelcomePageConfig?.logoAlign
  });
  
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<QuestionData | null>(null);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [useTiers, setUseTiers] = useState(scoreTiers.length > 0);
  const [uploadingWelcomeLogo, setUploadingWelcomeLogo] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [step3ActiveTab, setStep3ActiveTab] = useState<'design' | 'completion' | 'scoring'>('design');
  const [completionPreviewMode, setCompletionPreviewMode] = useState<'success' | 'failure'>('success');

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Centralized helper to serialize questions into FormElement[] with proper pageBreaks
  // This ensures consistent structure across all code paths
  const serializeElements = (questionsToSerialize: QuestionData[], welcomeData: WelcomePageData): FormElement[] => {
    const finalElements: FormElement[] = [];
    const seenPageBreakIds = new Set<string>();

    // Add welcome page elements
    const headingElement: HeadingElement = {
      type: 'heading',
      id: 'welcome-heading',
      text: welcomeData.title,
      level: 1,
      elementTypeVersion: 1
    };

    const textElement: TextElement = {
      type: 'text',
      id: 'welcome-text',
      content: welcomeData.description,
      elementTypeVersion: 1
    };

    finalElements.push(headingElement);
    finalElements.push(textElement);

    // Add pageBreak after welcome if there are questions
    if (questionsToSerialize.length > 0) {
      const pageBreakAfterWelcome: PageBreakElement = {
        type: 'pageBreak',
        id: 'pagebreak-welcome',
        elementTypeVersion: 1
      };
      finalElements.push(pageBreakAfterWelcome);
    }

    // Add each question with a pageBreak after it (except the last one)
    questionsToSerialize.forEach((question, index) => {
      const questionElement: QuestionElement = {
        type: 'question',
        id: question.id,
        text: question.text,
        questionType: question.questionType,
        options: question.options,
        points: question.points,
        required: question.required,
        elementTypeVersion: 1
      };
      
      finalElements.push(questionElement);
      
      // Add pageBreak after each question (except the last one)
      // Use question.id for stable unique pageBreak IDs
      if (index < questionsToSerialize.length - 1) {
        const pageBreakId = `pagebreak-after-${question.id}`;
        // Deduplicate pageBreak IDs to prevent issues
        if (!seenPageBreakIds.has(pageBreakId)) {
          seenPageBreakIds.add(pageBreakId);
          const pageBreakBetweenQuestions: PageBreakElement = {
            type: 'pageBreak',
            id: pageBreakId,
            elementTypeVersion: 1
          };
          finalElements.push(pageBreakBetweenQuestions);
        }
      }
    });

    return finalElements;
  };

  // Handle drag end - reorder questions
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setQuestions((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const reorderedQuestions = arrayMove(items, oldIndex, newIndex);
        
        // Use centralized helper to build and propagate updated elements
        const finalElements = serializeElements(reorderedQuestions, welcomePage);
        onElementsChange(finalElements);
        
        toast({
          title: "Ordem alterada!",
          description: `Pergunta movida da posição ${oldIndex + 1} para ${newIndex + 1}`,
        });

        return reorderedQuestions;
      });
    }
  };

  // Hydrate state from elements prop (for editing existing forms)
  useEffect(() => {
    if (!elements || elements.length === 0) return;

    // Extract welcome page data from heading and text elements
    const headingElement = elements.find(
      (el): el is HeadingElement => isHeadingElement(el) && el.level === 1
    );
    const textElement = elements.find(
      (el): el is TextElement => isTextElement(el)
    );

    // Update welcome page state if we found the elements
    // BUT preserve any existing customization fields from externalWelcomePageConfig
    if (headingElement || textElement) {
      setWelcomePage(prev => ({
        title: headingElement?.text || title || prev.title || '',
        description: textElement?.content || description || prev.description || '',
        buttonText: prev.buttonText || 'Começar',
        // Preserve existing customization fields
        logo: prev.logo,
        titleSize: prev.titleSize,
        extendedDescription: prev.extendedDescription,
        logoAlign: prev.logoAlign
      }));
    }

    // Extract and convert question elements to QuestionData
    const questionElements = elements.filter(isQuestionElement);
    if (questionElements.length > 0) {
      const convertedQuestions: QuestionData[] = questionElements.map((qEl) => ({
        id: qEl.id,
        text: qEl.text,
        questionType: qEl.questionType,
        required: qEl.required || false,
        points: qEl.points || 10,
        options: qEl.options || []
      }));
      setQuestions(convertedQuestions);
    }
  }, [elements]);

  // Sync welcomeTitle and welcomeMessage props to welcomePage state
  useEffect(() => {
    setWelcomePage(prev => ({
      ...prev,
      title: welcomeTitle || prev.title,
      description: welcomeMessage || prev.description
    }));
  }, [welcomeTitle, welcomeMessage]);

  // Notify parent of welcomePage changes
  useEffect(() => {
    if (onWelcomePageConfigChange) {
      onWelcomePageConfigChange({
        title: welcomePage.title,
        description: welcomePage.description,
        buttonText: welcomePage.buttonText || 'Começar',
        logo: welcomePage.logo,
        titleSize: welcomePage.titleSize,
        extendedDescription: welcomePage.extendedDescription,
        logoAlign: welcomePage.logoAlign
      });
    }
  }, [welcomePage, onWelcomePageConfigChange]);

  const currentStep = activeStep;

  const setCurrentStep = (step: 1 | 2 | 3) => {
    if (onStepChange) {
      onStepChange(step);
    }
  };

  const handleWelcomePageChange = (field: keyof WelcomePageData, value: string) => {
    setWelcomePage(prev => ({ ...prev, [field]: value }));
    if (field === 'title' && onWelcomeTitleChange) {
      onWelcomeTitleChange(value);
    } else if (field === 'description' && onWelcomeMessageChange) {
      onWelcomeMessageChange(value);
    }
  };

  const handleWelcomeLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma imagem válida",
        variant: "destructive"
      });
      return;
    }

    setUploadingWelcomeLogo(true);
    try {
      const logoUrl = await api.uploadLogo(file);
      setWelcomePage(prev => ({ ...prev, logo: logoUrl }));
      
      toast({
        title: "Sucesso!",
        description: "Logo de boas-vindas enviada com sucesso"
      });
    } catch (error) {
      console.error('Error uploading welcome logo:', error);
      toast({
        title: "Erro",
        description: "Erro ao fazer upload da logo",
        variant: "destructive"
      });
    } finally {
      setUploadingWelcomeLogo(false);
    }
  };

  const removeWelcomeLogo = () => {
    setWelcomePage(prev => ({ ...prev, logo: null }));
  };

  const createNewQuestion = (): QuestionData => ({
    id: Date.now().toString(),
    text: '',
    questionType: 'text',
    required: false,
    points: 10,
    options: []
  });

  const handleAddQuestion = () => {
    setEditingQuestion(createNewQuestion());
    setIsAddingQuestion(true);
  };

  const handleSaveQuestion = () => {
    if (!editingQuestion) return;
    
    if (!editingQuestion.text.trim()) {
      toast({
        title: "Erro",
        description: "O texto da pergunta é obrigatório",
        variant: "destructive"
      });
      return;
    }

    if (editingQuestion.questionType === 'multiple-choice' && (!editingQuestion.options || editingQuestion.options.length === 0)) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos uma opção para múltipla escolha",
        variant: "destructive"
      });
      return;
    }

    const existingIndex = questions.findIndex(q => q.id === editingQuestion.id);
    let updatedQuestions: QuestionData[];
    if (existingIndex >= 0) {
      updatedQuestions = [...questions];
      updatedQuestions[existingIndex] = editingQuestion;
    } else {
      updatedQuestions = [...questions, editingQuestion];
    }
    setQuestions(updatedQuestions);
    
    // Propagate updated elements to parent immediately after add/edit
    const finalElements = serializeElements(updatedQuestions, welcomePage);
    onElementsChange(finalElements);

    setEditingQuestion(null);
    setIsAddingQuestion(false);

    toast({
      title: "Sucesso!",
      description: "Pergunta salva com sucesso"
    });
  };

  const handleCancelQuestion = () => {
    setEditingQuestion(null);
    setIsAddingQuestion(false);
  };

  const handleEditQuestion = (question: QuestionData) => {
    setEditingQuestion(question);
    setIsAddingQuestion(false);
  };

  const handleDeleteQuestion = (questionId: string) => {
    const updatedQuestions = questions.filter(q => q.id !== questionId);
    setQuestions(updatedQuestions);
    
    // Propagate updated elements to parent immediately after deletion
    const finalElements = serializeElements(updatedQuestions, welcomePage);
    onElementsChange(finalElements);
    
    toast({
      title: "Removido",
      description: "Pergunta removida com sucesso"
    });
  };

  const handleAddOption = () => {
    if (!editingQuestion) return;
    const newOption: QuestionOption = {
      id: Date.now().toString(),
      text: '',
      points: 10
    };
    setEditingQuestion({
      ...editingQuestion,
      options: [...(editingQuestion.options || []), newOption]
    });
  };

  const handleUpdateOption = (optionId: string, field: 'text' | 'points', value: string | number) => {
    if (!editingQuestion) return;
    setEditingQuestion({
      ...editingQuestion,
      options: editingQuestion.options?.map(opt => 
        opt.id === optionId 
          ? { ...opt, [field]: value } 
          : opt
      )
    });
  };

  const handleDeleteOption = (optionId: string) => {
    if (!editingQuestion) return;
    setEditingQuestion({
      ...editingQuestion,
      options: editingQuestion.options?.filter(opt => opt.id !== optionId)
    });
  };

  const buildFinalElements = (): FormElement[] => {
    // Use centralized helper for consistent element serialization
    return serializeElements(questions, welcomePage);
  };

  // Validation logic
  const canAdvanceFromStep1 = useMemo(() => {
    return welcomePage.title.trim().length > 0 && welcomePage.description.trim().length > 0;
  }, [welcomePage]);

  const canAdvanceFromStep2 = useMemo(() => {
    return questions.length > 0 && !editingQuestion;
  }, [questions, editingQuestion]);

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!canAdvanceFromStep1) {
        toast({
          title: "Campos obrigatórios",
          description: "Preencha o título e a descrição antes de continuar",
          variant: "destructive"
        });
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!canAdvanceFromStep2) {
        toast({
          title: "Atenção",
          description: editingQuestion ? "Salve ou cancele a pergunta em edição" : "Adicione pelo menos uma pergunta",
          variant: "destructive"
        });
        return;
      }
      const finalElements = buildFinalElements();
      onElementsChange(finalElements);
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as 1 | 2 | 3);
    }
  };

  const handleStepClick = (step: 1 | 2 | 3) => {
    // Allow free navigation to previous steps
    if (step < currentStep) {
      setCurrentStep(step);
    } else if (step === currentStep + 1) {
      // Validate before advancing
      handleNextStep();
    }
  };

  const handleSaveProgress = () => {
    const finalElements = buildFinalElements();
    onElementsChange(finalElements);
    
    if (onSave) {
      onSave();
    }
  };

  const addScoreTier = () => {
    const newTier: ScoreTier = {
      id: Date.now().toString(),
      label: '',
      minScore: 0,
      maxScore: 0,
      description: '',
      qualifies: false
    };
    onScoreTiersChange?.([...scoreTiers, newTier]);
  };

  const updateScoreTier = (id: string, updates: Partial<ScoreTier>) => {
    onScoreTiersChange?.(
      scoreTiers.map(tier => tier.id === id ? { ...tier, ...updates } : tier)
    );
  };

  const deleteScoreTier = (id: string) => {
    onScoreTiersChange?.(scoreTiers.filter(tier => tier.id !== id));
  };

  const handleUseTiersChange = (checked: boolean) => {
    setUseTiers(checked);
    if (!checked) {
      onScoreTiersChange?.([]);
    } else if (scoreTiers.length === 0) {
      const defaultTiers: ScoreTier[] = [
        {
          id: '1',
          label: 'Ótimo',
          minScore: 350,
          maxScore: 400,
          description: 'Lead altamente qualificado',
          qualifies: true
        },
        {
          id: '2',
          label: 'Bom',
          minScore: 300,
          maxScore: 349,
          description: 'Lead qualificado',
          qualifies: true
        },
        {
          id: '3',
          label: 'Médio',
          minScore: 250,
          maxScore: 299,
          description: 'Lead com potencial',
          qualifies: true
        },
        {
          id: '4',
          label: 'Não Qualificado',
          minScore: 0,
          maxScore: 249,
          description: 'Não qualifica para reunião',
          qualifies: false
        }
      ];
      onScoreTiersChange?.(defaultTiers);
    }
  };

  const previewConfig = useMemo(() => {
    const finalElements = buildFinalElements();
    return {
      title: welcomePage.title,
      description: welcomePage.description,
      elements: finalElements,
      passingScore,
      scoreTiers,
      designConfig,
      welcomePageConfig: {
        title: welcomePage.title,
        description: welcomePage.description,
        buttonText: welcomePage.buttonText || 'Começar',
        logo: welcomePage.logo,
        titleSize: welcomePage.titleSize || '2xl',
        extendedDescription: welcomePage.extendedDescription,
        logoAlign: welcomePage.logoAlign || 'left'
      },
      completionPageConfig
    };
  }, [welcomePage, questions, passingScore, scoreTiers, designConfig, completionPageConfig]);

  const editorContent = (
    <>
      {currentStep === 1 && (
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="content" className="min-h-[44px] md:min-h-0">
              <FileText className="h-4 w-4 mr-2" />
              Conteúdo
            </TabsTrigger>
            <TabsTrigger value="design" className="min-h-[44px] md:min-h-0">
              <Palette className="h-4 w-4 mr-2" />
              Design
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content">
            <Card className="p-4 md:p-8 bg-gradient-to-br from-card to-card/80 border-border shadow-[var(--shadow-luxury)]">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
                  <FileText className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  Página de Boas-Vindas
                </CardTitle>
                <CardDescription className="text-sm">
                  Configure a primeira impressão do seu formulário. Esta página será sempre exibida primeiro.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 space-y-4 md:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="form-name" className="text-base">
                    Nome do Formulário *
                  </Label>
                  <Input
                    id="form-name"
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    placeholder="Ex: Formulário de Qualificação"
                    className="bg-background border-border h-11 md:h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    Nome interno para identificar o formulário na listagem
                  </p>
                  {!title.trim() && (
                    <p className="text-xs text-destructive">
                      ⚠️ Campo obrigatório
                    </p>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="welcome-title" className="text-base">
                    Título *
                  </Label>
                  <Input
                    id="welcome-title"
                    value={welcomePage.title}
                    onChange={(e) => handleWelcomePageChange('title', e.target.value)}
                    placeholder="Ex: Questionário de Qualificação"
                    className="text-lg font-semibold bg-background border-border h-12"
                  />
                  <p className="text-xs text-muted-foreground">
                    Título que aparece DENTRO do formulário para quem responde
                  </p>
                  {!welcomePage.title.trim() && (
                    <p className="text-xs text-destructive">
                      ⚠️ Campo obrigatório
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="welcome-message" className="text-base">
                    Mensagem de Boas-Vindas *
                  </Label>
                  <Textarea
                    id="welcome-message"
                    value={welcomePage.description}
                    onChange={(e) => handleWelcomePageChange('description', e.target.value)}
                    placeholder="Ex: Bem-vindo! Responda às perguntas a seguir para descobrir se você se qualifica para nosso programa."
                    className="resize-none bg-background border-border min-h-[100px] md:min-h-[120px]"
                    rows={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Texto explicativo que aparece abaixo do título
                  </p>
                  {!welcomePage.description.trim() && (
                    <p className="text-xs text-destructive">
                      ⚠️ Campo obrigatório
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="button-text" className="text-base">
                    Texto do Botão de Início
                  </Label>
                  <Input
                    id="button-text"
                    value={welcomePage.buttonText}
                    onChange={(e) => handleWelcomePageChange('buttonText', e.target.value)}
                    placeholder="Começar"
                    className="bg-background border-border"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="design">
            <Card className="p-4 md:p-6">
              <DesignCustomizer design={designConfig} onChange={onDesignChange} />
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {currentStep === 1 && (
        <div className="flex-shrink-0 border-t bg-background pt-4 mt-4">
          <div className="flex flex-col md:flex-row gap-3">
            <Button onClick={handleSaveProgress} variant="outline" className="gap-2 min-h-[44px] md:min-h-0" disabled={isSaving}>
              <Save className="h-4 w-4" />
              {isSaving ? 'Salvando...' : 'Salvar Progresso'}
            </Button>
            <Button 
              onClick={handleNextStep} 
              className="flex-1 gap-2 min-h-[44px] md:min-h-0" 
              disabled={!canAdvanceFromStep1}
            >
              Próximo: Adicionar Perguntas
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="content" className="min-h-[44px] md:min-h-0">
              <Target className="h-4 w-4 mr-2" />
              Perguntas
            </TabsTrigger>
            <TabsTrigger value="design" className="min-h-[44px] md:min-h-0">
              <Palette className="h-4 w-4 mr-2" />
              Design
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content">
            <Card className="p-4 md:p-8 bg-gradient-to-br from-card to-card/80 border-border shadow-[var(--shadow-luxury)]">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
                  <Target className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  Adicionar Perguntas
                </CardTitle>
                <CardDescription className="text-sm">
                  Crie as perguntas do seu questionário. Cada pergunta aparecerá em uma página separada.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 space-y-4 md:space-y-6">
                {questions.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-base flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                      <span>Perguntas Adicionadas ({questions.length})</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        • Arraste para reordenar
                      </span>
                    </Label>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={questions.map(q => q.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {questions.map((question, index) => (
                          <SortableQuestionItem
                            key={question.id}
                            question={question}
                            index={index}
                            onEdit={handleEditQuestion}
                            onDelete={handleDeleteQuestion}
                            isSelected={selectedQuestionId === question.id}
                            onSelect={setSelectedQuestionId}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </div>
                )}

                {editingQuestion ? (
                  <Card className="border-2 border-primary/50 bg-primary/5">
                    <CardHeader className="pb-2 md:pb-4">
                      <CardTitle className="text-lg">
                        {isAddingQuestion ? 'Nova Pergunta' : 'Editar Pergunta'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="question-text">Texto da Pergunta *</Label>
                        <Input
                          id="question-text"
                          value={editingQuestion.text}
                          onChange={(e) => setEditingQuestion({ ...editingQuestion, text: e.target.value })}
                          placeholder="Ex: Qual é o seu nível de experiência?"
                          className="bg-background"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="question-type">Tipo de Resposta</Label>
                          <Select
                            value={editingQuestion.questionType}
                            onValueChange={(value: any) => setEditingQuestion({ ...editingQuestion, questionType: value, options: value === 'multiple-choice' ? [] : undefined })}
                          >
                            <SelectTrigger id="question-type" className="bg-background min-h-[44px] md:min-h-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {questionTypeOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="question-points">Pontos</Label>
                          <Input
                            id="question-points"
                            type="number"
                            value={editingQuestion.points}
                            onChange={(e) => setEditingQuestion({ ...editingQuestion, points: parseInt(e.target.value) || 0 })}
                            className="bg-background"
                            min={0}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg bg-background border">
                        <div className="space-y-0.5">
                          <Label htmlFor="question-required">Pergunta Obrigatória</Label>
                          <p className="text-xs text-muted-foreground">
                            O usuário deve responder para continuar
                          </p>
                        </div>
                        <Switch
                          id="question-required"
                          checked={editingQuestion.required}
                          onCheckedChange={(checked) => setEditingQuestion({ ...editingQuestion, required: checked })}
                        />
                      </div>

                      {editingQuestion.questionType === 'multiple-choice' && (
                        <div className="space-y-3 p-4 rounded-lg bg-background border">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                            <Label className="text-base">Opções de Resposta</Label>
                            <Button onClick={handleAddOption} size="sm" variant="outline" className="gap-2 min-h-[44px] md:min-h-0">
                              <Plus className="h-3 w-3" />
                              Adicionar Opção
                            </Button>
                          </div>
                          
                          {editingQuestion.options && editingQuestion.options.length > 0 ? (
                            <div className="space-y-2">
                              {editingQuestion.options.map((option, idx) => (
                                <div key={option.id} className="flex flex-col md:flex-row md:items-center gap-2">
                                  <span className="text-sm text-muted-foreground w-6 hidden md:block">{idx + 1}.</span>
                                  <div className="flex items-center gap-2 flex-1">
                                    <span className="text-sm text-muted-foreground w-6 md:hidden">{idx + 1}.</span>
                                    <Input
                                      value={option.text}
                                      onChange={(e) => handleUpdateOption(option.id, 'text', e.target.value)}
                                      placeholder="Texto da opção"
                                      className="flex-1"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2 pl-6 md:pl-0">
                                    <Input
                                      type="number"
                                      value={option.points}
                                      onChange={(e) => handleUpdateOption(option.id, 'points', parseInt(e.target.value) || 0)}
                                      placeholder="Pontos"
                                      className="w-20 md:w-24"
                                      min={0}
                                    />
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteOption(option.id)}
                                      className="text-destructive hover:text-destructive min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Nenhuma opção adicionada. Clique em "Adicionar Opção" para começar.
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex flex-col md:flex-row gap-3 pt-4 border-t">
                        <Button onClick={handleCancelQuestion} variant="outline" className="flex-1 min-h-[44px] md:min-h-0">
                          Cancelar
                        </Button>
                        <Button onClick={handleSaveQuestion} className="flex-1 gap-2 min-h-[44px] md:min-h-0">
                          <CheckCircle2 className="h-4 w-4" />
                          Salvar Pergunta
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Button onClick={handleAddQuestion} variant="outline" className="w-full gap-2 h-14 md:h-16 border-dashed border-2">
                    <Plus className="h-5 w-5" />
                    Adicionar Nova Pergunta
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="design">
            <Card className="p-4 md:p-6">
              <DesignCustomizer design={designConfig} onChange={onDesignChange} />
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {currentStep === 2 && (
        <div className="flex-shrink-0 border-t bg-background pt-4 mt-4">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4">
            <Button onClick={handlePrevStep} variant="outline" className="gap-2 min-h-[44px] md:min-h-0">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <Button onClick={handleSaveProgress} variant="outline" className="gap-2 min-h-[44px] md:min-h-0" disabled={isSaving}>
              <Save className="h-4 w-4" />
              {isSaving ? 'Salvando...' : 'Salvar Progresso'}
            </Button>
            <Button 
              onClick={handleNextStep} 
              className="flex-1 gap-2 min-h-[44px] md:min-h-0" 
              disabled={!canAdvanceFromStep2}
            >
              Finalizar: Configurações
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {currentStep === 3 && (
        <Card className="p-4 md:p-8 bg-gradient-to-br from-card to-card/80 border-border shadow-[var(--shadow-luxury)]">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
              <Palette className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              Configurações Finais
            </CardTitle>
            <CardDescription className="text-sm">
              Personalize a aparência e configure os detalhes finais do seu formulário
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Tabs value={step3ActiveTab} onValueChange={(v: any) => setStep3ActiveTab(v)} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="design" className="gap-1 md:gap-2 text-xs md:text-sm min-h-[44px] md:min-h-0">
                  <Palette className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Design</span>
                </TabsTrigger>
                <TabsTrigger value="completion" className="gap-1 md:gap-2 text-xs md:text-sm min-h-[44px] md:min-h-0">
                  <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Página Final</span>
                </TabsTrigger>
                <TabsTrigger value="scoring" className="gap-1 md:gap-2 text-xs md:text-sm min-h-[44px] md:min-h-0">
                  <Target className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Pontuação</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="design" className="mt-4 md:mt-6 max-h-none md:max-h-[calc(100vh-28rem)] overflow-visible md:overflow-y-auto">
                <DesignCustomizer design={designConfig} onChange={onDesignChange} />
              </TabsContent>

              <TabsContent value="completion" className="mt-4 md:mt-6 max-h-none md:max-h-[calc(100vh-28rem)] overflow-visible md:overflow-y-auto">
                {completionPageConfig ? (
                  <CompletionPageCustomizer
                    config={completionPageConfig}
                    onChange={(config) => onCompletionPageChange?.(config)}
                  />
                ) : (
                  <Card className="p-6 md:p-8 bg-muted/30">
                    <div className="text-center space-y-4">
                      <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <CheckCircle2 className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">Página de Conclusão</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                          Configure a página que será exibida após o usuário completar o formulário.
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Por favor, salve o formulário primeiro para habilitar esta configuração.
                      </p>
                    </div>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="scoring" className="mt-4 md:mt-6 space-y-4 md:space-y-6 max-h-none md:max-h-[calc(100vh-28rem)] overflow-visible md:overflow-y-auto">
                <Card className="p-4 md:p-6 bg-gradient-to-br from-card to-card/80 border-border shadow-md">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                      <div className="space-y-0.5">
                        <Label htmlFor="use-tiers">Usar Níveis de Pontuação</Label>
                        <p className="text-xs text-muted-foreground">
                          Classifique leads em diferentes níveis baseado na pontuação
                        </p>
                      </div>
                      <Switch
                        id="use-tiers"
                        checked={useTiers}
                        onCheckedChange={handleUseTiersChange}
                      />
                    </div>

                    {!useTiers && (
                      <div className="space-y-2">
                        <Label htmlFor="passing-score">Pontuação Mínima para Qualificação</Label>
                        <Input
                          id="passing-score"
                          type="number"
                          value={passingScore}
                          onChange={(e) => onPassingScoreChange(parseInt(e.target.value) || 0)}
                          className="bg-background border-border"
                          min={0}
                        />
                        <p className="text-xs text-muted-foreground">
                          Pontuação mínima para considerar o lead qualificado
                        </p>
                      </div>
                    )}

                    {useTiers && (
                      <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                          <Label className="text-base">Níveis de Pontuação</Label>
                          <Button onClick={addScoreTier} size="sm" variant="outline" className="gap-2 min-h-[44px] md:min-h-0">
                            <Plus className="h-3 w-3" />
                            Adicionar Nível
                          </Button>
                        </div>

                        {scoreTiers.length > 0 ? (
                          <div className="space-y-3">
                            {scoreTiers.map((tier) => (
                              <Card key={tier.id} className="p-4 bg-background">
                                <div className="space-y-3">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <Label className="text-xs">Nome do Nível</Label>
                                      <Input
                                        value={tier.label}
                                        onChange={(e) => updateScoreTier(tier.id, { label: e.target.value })}
                                        placeholder="Ex: Ótimo"
                                        className="h-9"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">Descrição</Label>
                                      <Input
                                        value={tier.description}
                                        onChange={(e) => updateScoreTier(tier.id, { description: e.target.value })}
                                        placeholder="Ex: Lead altamente qualificado"
                                        className="h-9"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                      <Label className="text-xs">Pontuação Mínima</Label>
                                      <Input
                                        type="number"
                                        value={tier.minScore}
                                        onChange={(e) => updateScoreTier(tier.id, { minScore: parseInt(e.target.value) || 0 })}
                                        className="h-9"
                                        min={0}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">Pontuação Máxima</Label>
                                      <Input
                                        type="number"
                                        value={tier.maxScore}
                                        onChange={(e) => updateScoreTier(tier.id, { maxScore: parseInt(e.target.value) || 0 })}
                                        className="h-9"
                                        min={0}
                                      />
                                    </div>
                                    <div className="flex items-end gap-2 col-span-2 md:col-span-1">
                                      <div className="flex-1 flex items-center justify-between p-2 rounded-md bg-muted">
                                        <Label className="text-xs">Qualifica</Label>
                                        <Switch
                                          checked={tier.qualifies}
                                          onCheckedChange={(checked) => updateScoreTier(tier.id, { qualifies: checked })}
                                        />
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deleteScoreTier(tier.id)}
                                        className="text-destructive hover:text-destructive h-9 w-9"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg">
                            Nenhum nível de pontuação configurado. Clique em "Adicionar Nível" para começar.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {currentStep === 3 && (
        <div className="flex-shrink-0 border-t bg-background pt-4 mt-4">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4">
            <Button onClick={handlePrevStep} variant="outline" className="gap-2 min-h-[44px] md:min-h-0">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <Button onClick={handleSaveProgress} variant="outline" className="gap-2 min-h-[44px] md:min-h-0" disabled={isSaving}>
              <Save className="h-4 w-4" />
              {isSaving ? 'Salvando...' : 'Salvar Progresso'}
            </Button>
            <Button
              onClick={handleSaveProgress}
              className="flex-1 gap-2 min-h-[48px] md:min-h-0"
              size="lg"
              disabled={isSaving}
            >
              <Save className="h-5 w-5" />
              {isSaving ? 'Salvando...' : 'Salvar Formulário'}
            </Button>
          </div>
        </div>
      )}
    </>
  );

  const previewPanel = (
    <div className="flex flex-col h-full">
      <div className="mb-4 flex items-start justify-between gap-4 flex-shrink-0">
        <div className="flex-1">
          <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
            <Eye className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            Preview em Tempo Real
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            {currentStep === 3 && step3ActiveTab === 'completion'
              ? "Veja como a página de conclusão aparece para os usuários"
              : selectedQuestionId 
              ? "Clique em outra pergunta para visualizar ou veja todas" 
              : "Veja como seu formulário aparece para os usuários"}
          </p>
        </div>
        {currentStep === 3 && step3ActiveTab === 'completion' && (
          <Tabs value={completionPreviewMode} onValueChange={(v: any) => setCompletionPreviewMode(v)} className="w-auto">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="success" className="gap-1 md:gap-2 text-xs">
                <CheckCircle2 className="h-3 w-3" />
                <span className="hidden sm:inline">Sucesso</span>
              </TabsTrigger>
              <TabsTrigger value="failure" className="gap-1 md:gap-2 text-xs">
                <X className="h-3 w-3" />
                <span className="hidden sm:inline">Falha</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>
      
      <div className="border-2 border-dashed border-gray-300 rounded-lg flex-1 overflow-hidden flex flex-col" style={{ backgroundColor: '#f8fafc' }}>
        <div className="overflow-y-auto flex-1 p-4 md:p-6">
          {currentStep === 3 && step3ActiveTab === 'completion' && completionPageConfig ? (
            <CompletionPagePreview 
              config={completionPageConfig}
              previewMode={completionPreviewMode}
            />
          ) : (
            <FormPreview
              config={previewConfig}
              onBack={() => {}}
              isLivePreview={true}
              activeQuestionId={selectedQuestionId}
            />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Step Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          {[
            { step: 1, label: 'Boas-vindas' },
            { step: 2, label: 'Perguntas' },
            { step: 3, label: 'Finalizar' }
          ].map(({ step, label }) => (
            <div key={step} className="flex items-center gap-1 md:gap-2">
              <button
                onClick={() => handleStepClick(step as 1 | 2 | 3)}
                disabled={step > currentStep + 1}
                className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 text-sm md:text-base ${
                  currentStep === step
                    ? 'bg-primary text-primary-foreground shadow-lg scale-110 cursor-pointer'
                    : currentStep > step
                    ? 'bg-green-500 text-white cursor-pointer hover:scale-105'
                    : step === currentStep + 1
                    ? 'bg-muted text-muted-foreground cursor-pointer hover:bg-muted/80'
                    : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                }`}
              >
                {currentStep > step ? <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5" /> : step}
              </button>
              <div className="hidden md:block">
                <div className={`font-medium ${currentStep === step ? 'text-primary' : 'text-muted-foreground'}`}>
                  {label}
                </div>
              </div>
              {step < 3 && <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground hidden md:block" />}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Layout */}
      {isMobile && (
        <div className="space-y-4 pb-20">
          {editorContent}
        </div>
      )}

      {/* Desktop Layout - Two-Column Resizable Layout: Editor Left, Preview Right */}
      {!isMobile && (
        <PanelGroup direction="horizontal" className="gap-4">
          {/* LEFT COLUMN: Editor */}
          <Panel defaultSize={50} minSize={30}>
            <div className="h-[calc(100vh-14rem)] flex flex-col pr-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex-1 overflow-y-auto space-y-4 pb-4">
                {editorContent}
              </div>
            </div>
          </Panel>

          {/* Resizable Handle */}
          <PanelResizeHandle className="w-2 bg-border hover:bg-primary/50 transition-colors rounded-full cursor-col-resize" />

          {/* RIGHT COLUMN: Live Preview - Always Visible (Sticky) */}
          <Panel defaultSize={50} minSize={30}>
            <div className="sticky top-4 h-[calc(100vh-14rem)]">
              {previewPanel}
            </div>
          </Panel>
        </PanelGroup>
      )}

      {/* Mobile Floating Preview Button */}
      {isMobile && (
        <Button
          onClick={() => setMobilePreviewOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg gap-0 p-0"
          size="icon"
        >
          <Eye className="h-6 w-6" />
        </Button>
      )}

      {/* Mobile Preview Dialog */}
      <Dialog open={mobilePreviewOpen} onOpenChange={setMobilePreviewOpen}>
        <DialogContent className="max-w-full h-[100dvh] max-h-[100dvh] w-full p-0 m-0 rounded-none border-0">
          <DialogHeader className="p-4 border-b flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Eye className="h-5 w-5 text-primary" />
              Pré-visualizar
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4">
            {currentStep === 3 && step3ActiveTab === 'completion' && completionPageConfig ? (
              <CompletionPagePreview 
                config={completionPageConfig}
                previewMode={completionPreviewMode}
              />
            ) : (
              <FormPreview
                config={previewConfig}
                onBack={() => setMobilePreviewOpen(false)}
                isLivePreview={true}
                activeQuestionId={selectedQuestionId}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
