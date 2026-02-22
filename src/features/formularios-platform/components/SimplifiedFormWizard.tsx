import { useState, useMemo, useEffect } from "react";
import { FormElement, DesignConfig, FormTemplate, ScoreTier, CompletionPageConfig, WelcomePageConfig, QuestionElement, HeadingElement, TextElement, PageBreakElement, QuestionOption, isQuestionElement, isHeadingElement, isTextElement } from "../types/form";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Plus, ArrowRight, ArrowLeft, Save, Trash2, Eye, Palette, FileText, Target, ChevronRight, CheckCircle2, Edit2, GripVertical, Upload, X, Image as ImageIcon, Monitor, Smartphone } from "lucide-react";
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
      className={`p-4 rounded-lg border cursor-pointer transition-all flex items-center gap-4 ${isDragging
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
          onClick={(e) => { e.stopPropagation(); onEdit(question); }}
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); onDelete(question.id); }}
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

  // 🛠️ HELPER: Corrigir URLs do localhost automaticamente
  const fixLogoUrl = (url: string | null) => {
    if (!url) return null;
    if (typeof url !== 'string') return url;

    // Se a URL contém localhost ou 127.0.0.1, extrair apenas o path
    if (url.includes('localhost:') || url.includes('127.0.0.1:')) {
      const parts = url.split('/uploads/');
      if (parts.length > 1) {
        return '/uploads/' + parts[1];
      }
    }

    // Se a URL contém qualquer protocolo (http:// ou https://), extrair apenas o path
    if (url.includes('://')) {
      const match = url.match(/\/uploads\/logos\/[^"'\s]+/);
      if (match) {
        return match[0];
      }
    }

    return url;
  };

  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<QuestionData | null>(null);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [useTiers, setUseTiers] = useState(scoreTiers.length > 0);
  const [uploadingWelcomeLogo, setUploadingWelcomeLogo] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [step3ActiveTab, setStep3ActiveTab] = useState<'design' | 'completion' | 'scoring'>('design');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
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

      if (index < questionsToSerialize.length - 1) {
        const pageBreakId = `pagebreak-after-${question.id}`;
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

  // Hydrate state from elements prop
  useEffect(() => {
    if (!elements || elements.length === 0) return;

    const headingElement = elements.find(
      (el): el is HeadingElement => isHeadingElement(el) && el.level === 1
    );
    const textElement = elements.find(
      (el): el is TextElement => isTextElement(el)
    );

    if (headingElement || textElement) {
      setWelcomePage(prev => ({
        title: headingElement?.text || title || prev.title || '',
        description: textElement?.content || description || prev.description || '',
        buttonText: prev.buttonText || 'Começar',
        logo: prev.logo,
        titleSize: prev.titleSize,
        extendedDescription: prev.extendedDescription,
        logoAlign: prev.logoAlign
      }));
    }

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

  useEffect(() => {
    setWelcomePage(prev => ({
      ...prev,
      title: welcomeTitle || prev.title,
      description: welcomeMessage || prev.description
    }));
  }, [welcomeTitle, welcomeMessage]);

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
    return serializeElements(questions, welcomePage);
  };

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
      handleSaveProgress();
      setCurrentStep(3);
    } else if (currentStep === 3) {
      handleSaveProgress();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as 1 | 2 | 3);
    }
  };

  const handleStepClick = (step: 1 | 2 | 3) => {
    if (step < currentStep) {
      setCurrentStep(step);
    } else if (step === currentStep + 1) {
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
        buttonText: welcomePage.buttonText,
        logo: welcomePage.logo,
        titleSize: welcomePage.titleSize,
        extendedDescription: welcomePage.extendedDescription,
        logoAlign: welcomePage.logoAlign
      },
      completionPageConfig
    };
  }, [welcomePage, questions, passingScore, scoreTiers, designConfig, completionPageConfig]);

  const editorContent = (
    <>
      {currentStep === 1 && (
        <div className="space-y-6">
          <Tabs defaultValue="conteudo" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 h-12">
              <TabsTrigger value="conteudo" className="gap-2 text-base">
                <FileText className="h-4 w-4" />
                Conteúdo
              </TabsTrigger>
              <TabsTrigger value="design" className="gap-2 text-base">
                <Palette className="h-4 w-4" />
                Design
              </TabsTrigger>
            </TabsList>

            <TabsContent value="conteudo" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Página de Boas-vindas</CardTitle>
                  <CardDescription>Configure como os usuários verão o início do formulário</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="welcome-title">Título *</Label>
                    <Input
                      id="welcome-title"
                      value={welcomePage.title}
                      onChange={(e) => handleWelcomePageChange('title', e.target.value)}
                      placeholder="Ex: Formulário de Qualificação"
                      className="min-h-[44px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="welcome-desc">Descrição *</Label>
                    <Textarea
                      id="welcome-desc"
                      value={welcomePage.description}
                      onChange={(e) => handleWelcomePageChange('description', e.target.value)}
                      placeholder="Ex: Conte-nos um pouco sobre você..."
                      className="min-h-[100px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="welcome-btn">Texto do Botão</Label>
                    <Input
                      id="welcome-btn"
                      value={welcomePage.buttonText}
                      onChange={(e) => handleWelcomePageChange('buttonText', e.target.value)}
                      placeholder="Ex: Começar"
                      className="min-h-[44px]"
                    />
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-4">
                    <Label>Logo de Boas-vindas</Label>
                    <div className="flex flex-col gap-4">
                      {welcomePage.logo ? (
                        <div className="relative w-full max-w-sm aspect-video rounded-lg border bg-muted flex items-center justify-center overflow-hidden group">
                          <img src={fixLogoUrl(welcomePage.logo) || ''} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button variant="destructive" size="sm" onClick={removeWelcomeLogo} className="h-9">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remover
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full">
                          <Label
                            htmlFor="welcome-logo-upload"
                            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                              <p className="mb-2 text-sm text-muted-foreground">
                                <span className="font-semibold">Clique para upload</span> ou arraste
                              </p>
                            </div>
                            <Input
                              id="welcome-logo-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleWelcomeLogoUpload}
                              disabled={uploadingWelcomeLogo}
                            />
                          </Label>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="design">
              <DesignCustomizer design={designConfig} onChange={onDesignChange} />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {currentStep === 2 && (
        <div className="space-y-6">
          <Tabs defaultValue="perguntas" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 h-12">
              <TabsTrigger value="perguntas" className="gap-2 text-base">
                <FileText className="h-4 w-4" />
                Perguntas
              </TabsTrigger>
              <TabsTrigger value="design" className="gap-2 text-base">
                <Palette className="h-4 w-4" />
                Design
              </TabsTrigger>
              <TabsTrigger value="pontuacao" className="gap-2 text-base">
                <Target className="h-4 w-4" />
                Pontuação
              </TabsTrigger>
            </TabsList>

            <TabsContent value="perguntas" className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold">Estrutura do Formulário</h2>
                <Button onClick={handleAddQuestion} disabled={!!editingQuestion} className="gap-2 h-10 px-4">
                  <Plus className="h-4 w-4" />
                  Nova Pergunta
                </Button>
              </div>

              {!editingQuestion && questions.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/20">
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium mb-1">Nenhuma pergunta ainda</h3>
                  <p className="text-muted-foreground mb-6">Comece adicionando sua primeira pergunta ao formulário.</p>
                  <Button onClick={handleAddQuestion} size="lg" className="gap-2">
                    <Plus className="h-5 w-5" />
                    Adicionar Primeira Pergunta
                  </Button>
                </div>
              )}

              {questions.length > 0 && !editingQuestion && (
                <div className="space-y-3">
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

              {editingQuestion && (
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
                                <Input
                                  value={option.text}
                                  onChange={(e) => handleUpdateOption(option.id, 'text', e.target.value)}
                                  placeholder={`Opção ${idx + 1}`}
                                  className="flex-1 bg-background"
                                />
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-2 bg-muted/30 px-2 rounded border">
                                    <span className="text-xs text-muted-foreground">Pts:</span>
                                    <Input
                                      type="number"
                                      value={option.points}
                                      onChange={(e) => handleUpdateOption(option.id, 'points', parseInt(e.target.value) || 0)}
                                      className="w-16 h-8 bg-transparent border-0 focus-visible:ring-0 text-center"
                                    />
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteOption(option.id)}
                                    className="h-8 w-8 text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-muted-foreground text-sm italic">
                            Nenhuma opção adicionada
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <Button variant="ghost" onClick={handleCancelQuestion} className="h-10">Cancelar</Button>
                      <Button onClick={handleSaveQuestion} className="h-10 px-6">Salvar Pergunta</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="design">
              <DesignCustomizer design={designConfig} onChange={onDesignChange} />
            </TabsContent>

            <TabsContent value="pontuacao">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">Pontuação Mínima</CardTitle>
                    <CardDescription>Defina quantos pontos são necessários para aprovação</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="passing-score">Pontuação de Aprovação</Label>
                      <Input
                        id="passing-score"
                        type="number"
                        value={passingScore}
                        onChange={(e) => onPassingScoreChange(parseInt(e.target.value) || 0)}
                        className="max-w-[200px] h-11"
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h3 className="text-lg font-semibold">Tiers de Qualificação</h3>
                      <p className="text-sm text-muted-foreground">Crie faixas de pontuação com retornos personalizados</p>
                    </div>
                    <Switch checked={useTiers} onCheckedChange={handleUseTiersChange} />
                  </div>

                  {useTiers && (
                    <div className="space-y-4">
                      {scoreTiers.map(tier => (
                        <Card key={tier.id} className="relative overflow-hidden group">
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${tier.qualifies ? 'bg-green-500' : 'bg-red-500'}`} />
                          <CardContent className="p-4 pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                              <div className="md:col-span-1 space-y-2">
                                <Label>Nome da Faixa</Label>
                                <Input value={tier.label} onChange={(e) => updateScoreTier(tier.id, { label: e.target.value })} placeholder="Ex: Ótimo" className="h-10" />
                              </div>
                              <div className="md:col-span-1 space-y-2">
                                <Label>Pontuação (Min - Max)</Label>
                                <div className="flex items-center gap-2">
                                  <Input type="number" value={tier.minScore} onChange={(e) => updateScoreTier(tier.id, { minScore: parseInt(e.target.value) || 0 })} className="h-10" />
                                  <span className="text-muted-foreground">-</span>
                                  <Input type="number" value={tier.maxScore} onChange={(e) => updateScoreTier(tier.id, { maxScore: parseInt(e.target.value) || 0 })} className="h-10" />
                                </div>
                              </div>
                              <div className="md:col-span-1 space-y-2">
                                <div className="flex items-center justify-between mb-2">
                                  <Label>Qualifica?</Label>
                                  <Switch checked={tier.qualifies} onCheckedChange={(val) => updateScoreTier(tier.id, { qualifies: val })} />
                                </div>
                                <div className={`text-xs font-medium px-2 py-1 rounded text-center ${tier.qualifies ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {tier.qualifies ? 'Aprovado' : 'Reprovado'}
                                </div>
                              </div>
                              <div className="md:col-span-1 flex justify-end">
                                <Button variant="ghost" size="icon" onClick={() => deleteScoreTier(tier.id)} className="text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="mt-4 space-y-2">
                              <Label>Mensagem/Descrição</Label>
                              <Input value={tier.description} onChange={(e) => updateScoreTier(tier.id, { description: e.target.value })} placeholder="Ex: Lead altamente qualificado" className="h-10" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      <Button onClick={addScoreTier} variant="outline" className="w-full border-dashed h-12 gap-2">
                        <Plus className="h-4 w-4" />
                        Adicionar Faixa de Pontuação
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {currentStep === 3 && (
        <div className="space-y-6">
          <Tabs value={step3ActiveTab} onValueChange={(v: any) => setStep3ActiveTab(v)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 h-12">
              <TabsTrigger value="design" className="gap-2 text-base">
                <Palette className="h-4 w-4" />
                Design Global
              </TabsTrigger>
              <TabsTrigger value="scoring" className="gap-2 text-base">
                <Target className="h-4 w-4" />
                Scoring
              </TabsTrigger>
            </TabsList>

            <TabsContent value="design">
              <DesignCustomizer design={designConfig} onChange={onDesignChange} />
            </TabsContent>

            <TabsContent value="scoring">
              <Card>
                <CardHeader>
                  <CardTitle>Configuração Final de Scoring</CardTitle>
                  <CardDescription>Revise as regras de pontuação do seu formulário</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="final-passing-score">Pontuação Mínima Global</Label>
                    <Input
                      id="final-passing-score"
                      type="number"
                      value={passingScore}
                      onChange={(e) => onPassingScoreChange(parseInt(e.target.value) || 0)}
                      className="max-w-[200px]"
                    />
                  </div>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="font-semibold">Resumo de Perguntas ({questions.length})</h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {questions.map((q, i) => (
                        <div key={q.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                          <span className="text-sm truncate mr-4">{i + 1}. {q.text}</span>
                          <span className="font-mono text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded">
                            {q.points} pts
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-2 font-bold">
                      <span>Total Possível:</span>
                      <span className="text-xl text-primary">{questions.reduce((acc, q) => acc + q.points, 0)} pts</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </>
  );

  const previewPanel = (
    <div className="flex flex-col">
      <div className="mb-4 flex items-center justify-between gap-4 flex-shrink-0">
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
        <div className="flex items-center gap-2">
          <div className="flex bg-muted p-1 rounded-lg">
            <Button
              variant={previewDevice === 'desktop' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setPreviewDevice('desktop')}
              className="h-8 px-2"
            >
              <Monitor className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Desktop</span>
            </Button>
            <Button
              variant={previewDevice === 'mobile' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setPreviewDevice('mobile')}
              className="h-8 px-2"
            >
              <Smartphone className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Mobile</span>
            </Button>
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
      </div>

      <div className="rounded-lg flex flex-col">
        <div className="p-4 md:p-6 flex justify-center items-start">
          {currentStep === 3 && step3ActiveTab === 'completion' && completionPageConfig ? (
            <CompletionPagePreview
              config={completionPageConfig}
              previewMode={completionPreviewMode}
            />
          ) : (
            <FormPreview
              config={previewConfig}
              onBack={() => { }}
              isLivePreview={true}
              activeQuestionId={selectedQuestionId}
              wizardMode={true}
              device={previewDevice}
            />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          {[
            { step: 1, label: 'Boas-vindas' },
            { step: 2, label: 'Perguntas' },
            { step: 3, label: 'Finalização' }
          ].map(({ step, label }) => (
            <div key={step} className="flex items-center gap-1 md:gap-2">
              <button
                onClick={() => handleStepClick(step as 1 | 2 | 3)}
                disabled={step > currentStep + 1}
                className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 text-sm md:text-base ${currentStep === step
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

        <div className="flex items-center gap-2">
          {onSave && (
            <Button
              variant="outline"
              onClick={handleSaveProgress}
              disabled={isSaving}
              className="gap-2 hidden md:flex min-h-[44px]"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Salvando...' : 'Salvar Rascunho'}
            </Button>
          )}
          <Button
            onClick={handleNextStep}
            className="gap-2 min-h-[44px]"
            disabled={currentStep === 3 && isSaving}
          >
            {currentStep === 3 ? (
              <>
                <Save className="h-4 w-4" />
                {isSaving ? 'Finalizando...' : 'Finalizar Formulário'}
              </>
            ) : (
              <>
                Próximo Passo
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {isMobile && (
        <div className="space-y-4 pb-20">
          {editorContent}
        </div>
      )}

      {!isMobile && (
        <PanelGroup direction="horizontal" className="gap-4">
          <Panel defaultSize={50} minSize={30}>
            <div className="h-[calc(100vh-14rem)] flex flex-col pr-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex-1 overflow-y-auto space-y-4 pb-4">
                {editorContent}
              </div>
            </div>
          </Panel>

          <PanelResizeHandle className="w-2 bg-border hover:bg-primary/50 transition-colors rounded-full cursor-col-resize" />

          <Panel defaultSize={50} minSize={30}>
            <div className="sticky top-4">
              {previewPanel}
            </div>
          </Panel>
        </PanelGroup>
      )}

      {isMobile && (
        <Button
          onClick={() => setMobilePreviewOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg gap-0 p-0"
          size="icon"
        >
          <Eye className="h-6 w-6" />
        </Button>
      )}

      <Dialog open={mobilePreviewOpen} onOpenChange={setMobilePreviewOpen}>
        <DialogContent className="max-w-full h-[100dvh] p-0 flex flex-col gap-0 border-0 rounded-none">
          <DialogHeader className="p-4 border-b bg-background flex-row items-center justify-between shrink-0">
            <DialogTitle className="text-base font-bold">Visualização</DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => setMobilePreviewOpen(false)} className="h-9 w-9">
              <X className="h-5 w-5" />
            </Button>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <FormPreview
              config={previewConfig}
              onBack={() => setMobilePreviewOpen(false)}
              isLivePreview={true}
              wizardMode={true}
              device="mobile"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};