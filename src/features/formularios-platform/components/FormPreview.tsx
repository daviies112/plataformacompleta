import { useState, useEffect, useMemo, useRef } from "react";
import { 
  FormConfig, 
  FormAnswer, 
  FormSubmission, 
  ScoreTier,
  FormElement,
  isQuestionElement,
  isHeadingElement,
  isTextElement,
  isPageBreakElement,
  migrateQuestionsToElements,
  groupElementsIntoPages
} from "../types/form";
import { Button } from "./ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
import { ArrowRight, Send, CheckCircle2, XCircle, Award, Sparkles } from "lucide-react";

interface FormPreviewProps {
  config: FormConfig;
  onBack: () => void;
  isLivePreview?: boolean;
  activePageId?: string | null;
  activeQuestionId?: string | null;
  wizardMode?: boolean;
}

export const FormPreview = ({ config, onBack, isLivePreview = false, activePageId, activeQuestionId, wizardMode = false }: FormPreviewProps) => {
  const [answers, setAnswers] = useState<Record<string, FormAnswer>>({});
  const [result, setResult] = useState<FormSubmission | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [wizardStep, setWizardStep] = useState(0);
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const shouldUseWizard = wizardMode || isLivePreview;

  const defaultDesign = {
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
    spacing: "comfortable"
  };

  const baseDesign = config.designConfig ?? {};
  const design = {
    ...defaultDesign,
    ...baseDesign,
    colors: {
      ...defaultDesign.colors,
      ...(baseDesign.colors || {})
    },
    typography: {
      ...defaultDesign.typography,
      ...(baseDesign.typography || {})
    },
    spacing: baseDesign.spacing || defaultDesign.spacing
  };

  const welcomeConfig = config.welcomeConfig ?? {
    title: config.title || "Bem-vindo!",
    description: config.description || "Por favor, preencha o formulário a seguir.",
    imageUrl: null
  };

  const colors = design.colors;

  const spacingClasses = {
    compact: "space-y-4",
    comfortable: "space-y-6",
    spacious: "space-y-8"
  };

  const titleSizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
    "3xl": "text-3xl",
    "4xl": "text-4xl"
  };

  const textSizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
    "3xl": "text-3xl",
    "4xl": "text-4xl"
  };

  const elements = useMemo<FormElement[]>(() => {
    let allElements: FormElement[] = [];
    
    if (config.elements && config.elements.length > 0) {
      allElements = config.elements;
    } else if (config.questions && config.questions.length > 0) {
      allElements = migrateQuestionsToElements(config.questions);
    }
    
    if (activeQuestionId && isLivePreview && !shouldUseWizard) {
      const questionElement = allElements.find(el => isQuestionElement(el) && el.id === activeQuestionId);
      if (questionElement) {
        return [questionElement];
      }
    }
    
    if (activePageId) {
      const pages = groupElementsIntoPages(allElements);
      const activePage = pages.find(page => page.id === activePageId);
      return activePage ? activePage.elements : allElements;
    }
    
    return allElements;
  }, [config.elements, config.questions, activePageId, activeQuestionId, isLivePreview, shouldUseWizard]);

  const questionElements = useMemo(() => 
    elements.filter(isQuestionElement),
    [elements]
  );

  const totalQuestions = questionElements.length;

  const getTotalWizardSteps = () => {
    return 1 + 1 + 1 + totalQuestions + 1;
  };

  const totalWizardSteps = getTotalWizardSteps();
  const wizardProgress = wizardStep === 0 ? 0 : Math.round(((wizardStep) / (totalWizardSteps - 1)) * 100);

  const pages = useMemo(() => {
    const pagesArray: FormElement[][] = [];
    let currentPage: FormElement[] = [];
    
    elements.forEach((element) => {
      if (isPageBreakElement(element)) {
        if (currentPage.length > 0) {
          pagesArray.push(currentPage);
          currentPage = [];
        }
      } else {
        currentPage.push(element);
      }
    });
    
    if (currentPage.length > 0) {
      pagesArray.push(currentPage);
    }
    
    return pagesArray.length > 0 ? pagesArray : [elements];
  }, [elements]);

  const getCurrentQuestionNumber = (elementIndex: number): number => {
    let questionCount = 0;
    for (let i = 0; i <= elementIndex && i < elements.length; i++) {
      if (isQuestionElement(elements[i])) {
        questionCount++;
      }
    }
    return questionCount;
  };

  useEffect(() => {
    if (design.typography.fontFamily && design.typography.fontFamily !== "Inter") {
      const link = document.createElement('link');
      link.href = `https://fonts.googleapis.com/css2?family=${design.typography.fontFamily.replace(' ', '+')}:wght@400;500;600;700&display=swap`;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
      return () => {
        document.head.removeChild(link);
      };
    }
  }, [design.typography.fontFamily]);

  useEffect(() => {
    if (activeQuestionId && questionRefs.current[activeQuestionId]) {
      const element = questionRefs.current[activeQuestionId];
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeQuestionId]);

  const handleAnswer = (questionId: string, answer: string, points: number) => {
    const newAnswers = {
      ...answers,
      [questionId]: { questionId, answer, points }
    };
    setAnswers(newAnswers);
  };

  const handleNextPage = () => {
    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
    }
  };

  const handleWizardNext = () => {
    if (wizardStep < totalWizardSteps - 1) {
      setWizardStep(prev => prev + 1);
    }
  };

  const handleWizardBack = () => {
    if (wizardStep > 0) {
      setWizardStep(prev => prev - 1);
    }
  };

  const handleStartWizard = () => {
    setWizardStep(1);
  };

  const handleSubmit = () => {
    const answerArray = Object.values(answers);
    const totalScore = answerArray.reduce((sum, ans) => sum + ans.points, 0);
    
    let passed = totalScore >= config.passingScore;
    
    if (config.scoreTiers && config.scoreTiers.length > 0) {
      const tier = config.scoreTiers.find(
        t => totalScore >= t.minScore && totalScore <= t.maxScore
      );
      passed = tier?.qualifies || false;
    }

    setResult({
      answers: answerArray,
      totalScore,
      passed
    });

    if (shouldUseWizard) {
      setWizardStep(totalWizardSteps - 1);
    }
  };

  const getCurrentTier = (score: number): ScoreTier | undefined => {
    return config.scoreTiers?.find(
      tier => score >= tier.minScore && score <= tier.maxScore
    );
  };

  const renderHeading = (element: FormElement) => {
    if (!isHeadingElement(element)) return null;
    
    const HeadingTag = `h${element.level}` as keyof JSX.IntrinsicElements;
    
    const fontSizeClasses = {
      'xs': 'text-xs',
      'sm': 'text-sm',
      'base': 'text-base',
      'lg': 'text-lg',
      'xl': 'text-xl',
      '2xl': 'text-2xl',
      '3xl': 'text-3xl',
      '4xl': 'text-4xl'
    };
    
    const fontWeightClasses = {
      'normal': 'font-normal',
      'medium': 'font-medium',
      'semibold': 'font-semibold',
      'bold': 'font-bold'
    };
    
    const alignmentClasses = {
      'left': 'text-left',
      'center': 'text-center',
      'right': 'text-right'
    };
    
    const fontSize = element.style?.fontSize || '2xl';
    const fontWeight = element.style?.fontWeight || 'bold';
    const alignment = element.style?.alignment || 'left';
    const italic = element.style?.italic || false;
    const underline = element.style?.underline || false;
    const strikethrough = element.style?.strikethrough || false;
    
    const textDecorationParts = [];
    if (underline) textDecorationParts.push('underline');
    if (strikethrough) textDecorationParts.push('line-through');
    const textDecoration = textDecorationParts.length > 0 ? textDecorationParts.join(' ') : 'none';
    
    return (
      <div key={element.id} className="space-y-2">
        <HeadingTag 
          className={`${fontSizeClasses[fontSize]} ${fontWeightClasses[fontWeight]} ${alignmentClasses[alignment]}`}
          style={{ 
            color: design.colors.text,
            fontStyle: italic ? 'italic' : 'normal',
            textDecoration
          }}
        >
          {element.text}
        </HeadingTag>
      </div>
    );
  };

  const renderText = (element: FormElement) => {
    if (!isTextElement(element)) return null;
    
    const fontSizeClasses = {
      'xs': 'text-xs',
      'sm': 'text-sm',
      'base': 'text-base',
      'lg': 'text-lg',
      'xl': 'text-xl',
      '2xl': 'text-2xl',
      '3xl': 'text-3xl',
      '4xl': 'text-4xl'
    };
    
    const fontWeightClasses = {
      'normal': 'font-normal',
      'medium': 'font-medium',
      'semibold': 'font-semibold',
      'bold': 'font-bold'
    };
    
    const alignmentClasses = {
      'left': 'text-left',
      'center': 'text-center',
      'right': 'text-right'
    };
    
    const fontSize = element.style?.fontSize || 'base';
    const fontWeight = element.style?.fontWeight || 'normal';
    const alignment = element.style?.alignment || 'left';
    const italic = element.style?.italic || false;
    const underline = element.style?.underline || false;
    const strikethrough = element.style?.strikethrough || false;
    
    const textDecorationParts = [];
    if (underline) textDecorationParts.push('underline');
    if (strikethrough) textDecorationParts.push('line-through');
    const textDecoration = textDecorationParts.length > 0 ? textDecorationParts.join(' ') : 'none';
    
    return (
      <div key={element.id} className="space-y-2">
        <p 
          className={`leading-relaxed ${fontSizeClasses[fontSize]} ${fontWeightClasses[fontWeight]} ${alignmentClasses[alignment]}`}
          style={{ 
            color: design.colors.text, 
            opacity: 0.9,
            fontStyle: italic ? 'italic' : 'normal',
            textDecoration
          }}
        >
          {element.content}
        </p>
      </div>
    );
  };

  const renderPageBreak = (element: FormElement) => {
    if (!isPageBreakElement(element)) return null;
    
    return (
      <div key={element.id} className="my-8">
        {element.showLine && (
          <hr 
            className="border-t-2" 
            style={{ borderColor: design.colors.primary + '30' }}
          />
        )}
        {element.label && (
          <p 
            className="text-center text-sm mt-2"
            style={{ color: design.colors.text, opacity: 0.6 }}
          >
            {element.label}
          </p>
        )}
      </div>
    );
  };

  const renderQuestion = (element: FormElement, questionNumber: number) => {
    if (!isQuestionElement(element)) return null;
    
    const isActiveQuestion = activeQuestionId === element.id;
    
    return (
      <div 
        key={element.id} 
        ref={(el) => { questionRefs.current[element.id] = el; }}
        className="space-y-4 transition-all duration-300 rounded-lg p-4"
        style={isActiveQuestion ? { 
          boxShadow: `0 0 0 2px ${design.colors.primary}`,
          backgroundColor: `${design.colors.primary}0d`
        } : undefined}
      >
        <div className="flex items-start gap-3">
          <span 
            className="font-semibold px-3 py-1 rounded-full text-sm shrink-0"
            style={{ 
              backgroundColor: `${design.colors.primary}20`,
              color: design.colors.primary
            }}
          >
            {questionNumber}
          </span>
          <div className="flex-1">
            <h3 
              className={`font-medium ${textSizeClasses[design.typography.textSize as keyof typeof textSizeClasses]} mb-4`}
              style={{ color: design.colors.text }}
            >
              {element.text}
            </h3>

            {element.questionType === 'multiple-choice' && element.options && (
              <RadioGroup
                value={answers[element.id]?.answer || ""}
                onValueChange={(value) => {
                  const option = element.options?.find(o => o.id === value);
                  if (option) {
                    handleAnswer(element.id, option.text, option.points);
                  }
                }}
                className="space-y-3"
              >
                {element.options.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-center space-x-3 p-4 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md"
                    style={{
                      backgroundColor: design.colors.secondary,
                      borderColor: design.colors.primary + '30',
                      color: design.colors.text
                    }}
                  >
                    <RadioGroupItem value={option.id} id={`${element.id}-${option.id}`} />
                    <Label 
                      htmlFor={`${element.id}-${option.id}`}
                      className="flex-1 cursor-pointer font-normal"
                      style={{ color: design.colors.text }}
                    >
                      {option.text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {element.questionType === 'text' && (
              <Textarea
                value={answers[element.id]?.answer || ""}
                onChange={(e) => handleAnswer(element.id, e.target.value, element.points || 0)}
                placeholder="Digite sua resposta..."
                className="resize-none"
                style={{
                  backgroundColor: design.colors.secondary,
                  borderColor: design.colors.primary + '30',
                  color: design.colors.text
                }}
                rows={4}
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderElement = (element: FormElement, index: number) => {
    if (isQuestionElement(element)) {
      const questionNumber = getCurrentQuestionNumber(index);
      return renderQuestion(element, questionNumber);
    }
    if (isHeadingElement(element)) {
      return renderHeading(element);
    }
    if (isTextElement(element)) {
      return renderText(element);
    }
    if (isPageBreakElement(element)) {
      return renderPageBreak(element);
    }
    return null;
  };

  const renderWizardWelcome = () => {
    return (
      <div className="min-h-[500px] flex items-center justify-center p-4" style={{ background: `linear-gradient(to bottom right, ${colors.background}, ${colors.secondary})` }}>
        <Card className="w-full max-w-2xl shadow-xl" style={{ backgroundColor: colors.background, borderColor: `${colors.primary}30` }}>
          <CardHeader className="text-center pb-8">
            {welcomeConfig.imageUrl && (
              <div className="mb-6">
                <img src={welcomeConfig.imageUrl} alt="Welcome" className="max-w-xs mx-auto rounded-lg" />
              </div>
            )}
            <CardTitle className="text-4xl font-bold mb-4" style={{ color: colors.primary }}>
              {welcomeConfig.title}
            </CardTitle>
            <CardDescription className="text-lg" style={{ color: `${colors.text}99` }}>
              {welcomeConfig.description}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center pb-8">
            <Button 
              size="lg" 
              onClick={handleStartWizard}
              style={{ backgroundColor: colors.button, color: colors.buttonText }}
              className="px-8"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Começar
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  };

  const renderWizardPersonalData = () => {
    return (
      <div className="min-h-[500px] p-4" style={{ background: `linear-gradient(to bottom right, ${colors.background}, ${colors.secondary})` }}>
        <div className="max-w-3xl mx-auto pt-4">
          <div className="mb-6">
            <div className="w-full rounded-full h-2 mb-2" style={{ backgroundColor: colors.secondary }}>
              <div 
                className="h-2 rounded-full transition-all duration-300"
                style={{ width: `${wizardProgress}%`, backgroundColor: colors.progressBar || colors.primary }}
              />
            </div>
            <p className="text-sm text-right" style={{ color: colors.text }}>{wizardProgress}% completo</p>
          </div>

          <Card className="shadow-lg" style={{ backgroundColor: colors.background, borderColor: `${colors.primary}30` }}>
            <CardHeader>
              <CardTitle className="text-2xl" style={{ color: colors.text }}>Dados Pessoais</CardTitle>
              <CardDescription style={{ color: `${colors.text}99` }}>Por favor, preencha suas informações de contato</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label style={{ color: colors.text }}>Nome completo *</Label>
                <Input
                  placeholder="Digite seu nome"
                  className="mt-1"
                  disabled
                  value="João da Silva"
                  style={{ backgroundColor: colors.secondary, borderColor: `${colors.primary}30`, color: colors.text }}
                />
              </div>
              <div>
                <Label style={{ color: colors.text }}>Email *</Label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  className="mt-1"
                  disabled
                  value="joao@email.com"
                  style={{ backgroundColor: colors.secondary, borderColor: `${colors.primary}30`, color: colors.text }}
                />
              </div>
              <div>
                <Label style={{ color: colors.text }}>CPF *</Label>
                <Input
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="mt-1"
                  disabled
                  value="123.456.789-00"
                  style={{ backgroundColor: colors.secondary, borderColor: `${colors.primary}30`, color: colors.text }}
                />
              </div>
              <div>
                <Label style={{ color: colors.text }}>Telefone</Label>
                <Input
                  type="tel"
                  placeholder="(00) 00000-0000"
                  className="mt-1"
                  disabled
                  value="(11) 99999-9999"
                  style={{ backgroundColor: colors.secondary, borderColor: `${colors.primary}30`, color: colors.text }}
                />
              </div>
              <div>
                <Label style={{ color: colors.text }}>Instagram</Label>
                <Input
                  placeholder="@seuinstagram"
                  className="mt-1"
                  disabled
                  value="@joaosilva"
                  style={{ backgroundColor: colors.secondary, borderColor: `${colors.primary}30`, color: colors.text }}
                />
              </div>
              <p className="text-xs italic" style={{ color: `${colors.text}80` }}>* Campos simulados para preview</p>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleWizardNext} style={{ backgroundColor: colors.button, color: colors.buttonText }}>
                Próximo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  };

  const renderWizardAddress = () => {
    return (
      <div className="min-h-[500px] p-4" style={{ background: `linear-gradient(to bottom right, ${colors.background}, ${colors.secondary})` }}>
        <div className="max-w-3xl mx-auto pt-4">
          <div className="mb-6">
            <div className="w-full rounded-full h-2 mb-2" style={{ backgroundColor: colors.secondary }}>
              <div 
                className="h-2 rounded-full transition-all duration-300"
                style={{ width: `${wizardProgress}%`, backgroundColor: colors.progressBar || colors.primary }}
              />
            </div>
            <p className="text-sm text-right" style={{ color: colors.text }}>{wizardProgress}% completo</p>
          </div>

          <Card className="shadow-lg" style={{ backgroundColor: colors.background, borderColor: `${colors.primary}30` }}>
            <CardHeader>
              <CardTitle className="text-2xl" style={{ color: colors.text }}>Dados de Endereço</CardTitle>
              <CardDescription style={{ color: `${colors.text}99` }}>Preencha seu endereço completo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <Label style={{ color: colors.text }}>CEP *</Label>
                  <Input
                    placeholder="00000-000"
                    maxLength={9}
                    className="mt-1"
                    disabled
                    value="01310-100"
                    style={{ backgroundColor: colors.secondary, borderColor: `${colors.primary}30`, color: colors.text }}
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label style={{ color: colors.text }}>Estado *</Label>
                  <Input
                    placeholder="SP"
                    maxLength={2}
                    className="mt-1 uppercase"
                    disabled
                    value="SP"
                    style={{ backgroundColor: colors.secondary, borderColor: `${colors.primary}30`, color: colors.text }}
                  />
                </div>
              </div>
              
              <div>
                <Label style={{ color: colors.text }}>Rua *</Label>
                <Input
                  placeholder="Nome da rua"
                  className="mt-1"
                  disabled
                  value="Av. Paulista"
                  style={{ backgroundColor: colors.secondary, borderColor: `${colors.primary}30`, color: colors.text }}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label style={{ color: colors.text }}>Número *</Label>
                  <Input
                    placeholder="123"
                    className="mt-1"
                    disabled
                    value="1000"
                    style={{ backgroundColor: colors.secondary, borderColor: `${colors.primary}30`, color: colors.text }}
                  />
                </div>
                <div className="col-span-2">
                  <Label style={{ color: colors.text }}>Complemento</Label>
                  <Input
                    placeholder="Apto, bloco, etc."
                    className="mt-1"
                    disabled
                    value="Sala 501"
                    style={{ backgroundColor: colors.secondary, borderColor: `${colors.primary}30`, color: colors.text }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label style={{ color: colors.text }}>Bairro *</Label>
                  <Input
                    placeholder="Nome do bairro"
                    className="mt-1"
                    disabled
                    value="Bela Vista"
                    style={{ backgroundColor: colors.secondary, borderColor: `${colors.primary}30`, color: colors.text }}
                  />
                </div>
                <div>
                  <Label style={{ color: colors.text }}>Cidade *</Label>
                  <Input
                    placeholder="Nome da cidade"
                    className="mt-1"
                    disabled
                    value="São Paulo"
                    style={{ backgroundColor: colors.secondary, borderColor: `${colors.primary}30`, color: colors.text }}
                  />
                </div>
              </div>
              <p className="text-xs italic" style={{ color: `${colors.text}80` }}>* Campos simulados para preview</p>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleWizardNext} style={{ backgroundColor: colors.button, color: colors.buttonText }}>
                Próximo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  };

  const renderWizardQuestion = (questionIndex: number) => {
    const question = questionElements[questionIndex];
    if (!question) return null;
    
    const isLastQuestion = questionIndex === questionElements.length - 1;

    return (
      <div className="min-h-[500px] p-4" style={{ background: `linear-gradient(to bottom right, ${colors.background}, ${colors.secondary})` }}>
        <div className="max-w-3xl mx-auto pt-4">
          <div className="mb-6">
            <div className="w-full rounded-full h-2 mb-2" style={{ backgroundColor: colors.secondary }}>
              <div 
                className="h-2 rounded-full transition-all duration-300"
                style={{ width: `${wizardProgress}%`, backgroundColor: colors.progressBar || colors.primary }}
              />
            </div>
            <p className="text-sm text-right" style={{ color: colors.text }}>{wizardProgress}% completo</p>
          </div>

          <Card className="shadow-lg" style={{ backgroundColor: colors.background, borderColor: `${colors.primary}30` }}>
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: `${colors.text}80` }}>
                  Pergunta {questionIndex + 1} de {questionElements.length}
                </span>
                {question.required && (
                  <span className="text-sm font-medium" style={{ color: '#ef4444' }}>* Obrigatória</span>
                )}
              </div>
              <CardTitle className="text-2xl" style={{ color: colors.text }}>{question.text}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {question.questionType === 'multiple-choice' && question.options && (
                <RadioGroup
                  value={answers[question.id]?.answer || ""}
                  onValueChange={(value) => {
                    const option = question.options?.find(o => o.text === value);
                    if (option) {
                      handleAnswer(question.id, value, option.points);
                    }
                  }}
                  className="space-y-3"
                >
                  {question.options.map((option, optIndex) => (
                    <div 
                      key={optIndex} 
                      className="flex items-center space-x-3 p-3 rounded-lg border transition-colors"
                      style={{ backgroundColor: colors.secondary, borderColor: `${colors.primary}30`, color: colors.text }}
                    >
                      <RadioGroupItem value={option.text} id={`${question.id}-${optIndex}`} />
                      <Label htmlFor={`${question.id}-${optIndex}`} className="font-normal cursor-pointer flex-1" style={{ color: colors.text }}>
                        {option.text}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
              
              {(question.questionType === 'long-text') && (
                <Textarea
                  value={answers[question.id]?.answer || ""}
                  onChange={(e) => handleAnswer(question.id, e.target.value, question.points || 0)}
                  placeholder="Digite sua resposta"
                  rows={6}
                  className="text-base"
                  style={{ backgroundColor: colors.secondary, borderColor: `${colors.primary}30`, color: colors.text }}
                />
              )}
              
              {(question.questionType === 'text' || question.questionType === 'short-text') && (
                <Input
                  value={answers[question.id]?.answer || ""}
                  onChange={(e) => handleAnswer(question.id, e.target.value, question.points || 0)}
                  placeholder="Digite sua resposta"
                  className="text-base"
                  style={{ backgroundColor: colors.secondary, borderColor: `${colors.primary}30`, color: colors.text }}
                />
              )}
            </CardContent>
            <CardFooter className="flex justify-end">
              {isLastQuestion ? (
                <Button 
                  onClick={handleSubmit}
                  style={{ backgroundColor: colors.button, color: colors.buttonText }}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Ver Resultado
                </Button>
              ) : (
                <Button onClick={handleWizardNext} style={{ backgroundColor: colors.button, color: colors.buttonText }}>
                  Próximo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  };

  const renderWizardCompletion = () => {
    const currentTier = result ? getCurrentTier(result.totalScore) : undefined;
    const useTiers = config.scoreTiers && config.scoreTiers.length > 0;
    const passed = result?.passed ?? false;
    const totalScore = result?.totalScore ?? 0;
    
    return (
      <div className="min-h-[500px] flex items-center justify-center p-4" style={{ background: `linear-gradient(to bottom right, ${colors.background}, ${colors.secondary})` }}>
        <Card className="w-full max-w-2xl p-8 text-center shadow-xl" style={{ backgroundColor: colors.background, borderColor: `${colors.primary}30` }}>
          <div 
            className="inline-flex items-center justify-center w-20 h-20 rounded-full mx-auto mb-6"
            style={{ 
              backgroundColor: passed ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              color: passed ? '#22c55e' : '#ef4444'
            }}
          >
            {passed ? (
              <CheckCircle2 className="h-10 w-10" />
            ) : (
              <XCircle className="h-10 w-10" />
            )}
          </div>
          
          <h2 className="text-4xl font-bold mb-4" style={{ color: colors.text }}>
            {passed ? "Parabéns!" : "Obrigado!"}
          </h2>

          <p className="text-xl mb-8" style={{ color: `${colors.text}80` }}>
            {passed 
              ? "Você está qualificado! Entraremos em contato em breve."
              : "Obrigado pela sua participação."}
          </p>

          {useTiers && currentTier ? (
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-center gap-3 p-4 rounded-lg" style={{ backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30`, borderWidth: 1 }}>
                <Award className="h-6 w-6" style={{ color: colors.primary }} />
                <div className="text-left">
                  <div className="font-bold text-lg" style={{ color: colors.primary }}>
                    {currentTier.label}
                  </div>
                  <div className="text-sm" style={{ color: `${colors.text}80` }}>
                    {currentTier.description}
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-xl" style={{ backgroundColor: colors.secondary }}>
                <p className="text-sm mb-2" style={{ color: `${colors.text}80` }}>Sua pontuação</p>
                <p className="text-5xl font-bold" style={{ color: colors.primary }}>{totalScore}</p>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl mb-6" style={{ backgroundColor: colors.secondary }}>
              <p className="text-sm mb-2" style={{ color: `${colors.text}80` }}>Sua pontuação</p>
              <p className="text-5xl font-bold" style={{ color: colors.primary }}>{totalScore}</p>
              <p className="text-sm mt-2" style={{ color: `${colors.text}80` }}>/ {config.passingScore} necessário</p>
            </div>
          )}

          <div className="text-sm mb-6" style={{ color: `${colors.text}80` }}>
            <p>Seus dados foram salvos com sucesso.</p>
            <p>Em breve você receberá um retorno por email.</p>
          </div>

          {!isLivePreview && (
            <Button onClick={onBack} variant="outline" className="gap-2" style={{ borderColor: `${colors.primary}30`, color: colors.text }}>
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Editor
            </Button>
          )}
        </Card>
      </div>
    );
  };

  if (shouldUseWizard) {
    if (wizardStep === 0) {
      return renderWizardWelcome();
    }
    if (wizardStep === 1) {
      return renderWizardPersonalData();
    }
    if (wizardStep === 2) {
      return renderWizardAddress();
    }
    if (wizardStep >= 3 && wizardStep < 3 + totalQuestions) {
      const questionIndex = wizardStep - 3;
      return renderWizardQuestion(questionIndex);
    }
    if (wizardStep >= totalWizardSteps - 1 || result) {
      return renderWizardCompletion();
    }
    return null;
  }

  if (result) {
    const currentTier = getCurrentTier(result.totalScore);
    const useTiers = config.scoreTiers && config.scoreTiers.length > 0;
    
    return (
      <div 
        className={isLivePreview ? "min-h-full p-4 rounded-lg" : "max-w-2xl mx-auto"} 
        style={{ 
          fontFamily: design.typography.fontFamily,
          background: isLivePreview ? `linear-gradient(to bottom right, ${colors.background}, ${colors.secondary})` : undefined
        }}
      >
        {!isLivePreview && (
          <Button onClick={onBack} variant="ghost" className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Editor
          </Button>
        )}
        <Card
          className="p-8 shadow-xl" 
          style={{ 
            backgroundColor: colors.background,
            color: colors.text,
            borderColor: `${colors.primary}30`
          }}
        >
          <div className="text-center space-y-6">
            <div 
              className="inline-flex items-center justify-center w-20 h-20 rounded-full"
              style={{ 
                backgroundColor: result.passed ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: result.passed ? '#22c55e' : '#ef4444'
              }}
            >
              {result.passed ? (
                <CheckCircle2 className="h-10 w-10" />
              ) : (
                <XCircle className="h-10 w-10" />
              )}
            </div>

            <div>
              <h2 className="text-3xl font-bold mb-2" style={{ color: design.colors.text }}>
                {result.passed ? 'Parabéns!' : 'Não foi desta vez'}
              </h2>
              <p className="text-lg" style={{ color: `${design.colors.text}80` }}>
                {result.passed 
                  ? 'Você está qualificado para uma reunião com nosso time!' 
                  : 'Infelizmente você não atingiu a pontuação necessária.'}
              </p>
            </div>

            {useTiers && currentTier ? (
              <div className="space-y-4">
                <div 
                  className="flex items-center justify-center gap-3 p-4 rounded-lg"
                  style={{ 
                    backgroundColor: `${design.colors.primary}1a`,
                    border: `1px solid ${design.colors.primary}33`
                  }}
                >
                  <Award className="h-6 w-6" style={{ color: design.colors.primary }} />
                  <div className="text-left">
                    <div className="font-bold text-lg" style={{ color: design.colors.primary }}>
                      {currentTier.label}
                    </div>
                    <div className="text-sm" style={{ color: `${design.colors.text}80` }}>
                      {currentTier.description}
                    </div>
                  </div>
                </div>

                <div 
                  className="flex items-center justify-center gap-8 py-6 border-y"
                  style={{ borderColor: `${design.colors.primary}30` }}
                >
                  <div className="text-center">
                    <div className="text-4xl font-bold" style={{ color: design.colors.primary }}>
                      {result.totalScore}
                    </div>
                    <div className="text-sm" style={{ color: `${design.colors.text}80` }}>Sua Pontuação</div>
                  </div>
                  <div className="text-2xl" style={{ color: `${design.colors.text}80` }}>/</div>
                  <div className="text-center">
                    <div className="text-4xl font-bold" style={{ color: design.colors.text }}>
                      {currentTier.maxScore}
                    </div>
                    <div className="text-sm" style={{ color: `${design.colors.text}80` }}>Máximo desta faixa</div>
                  </div>
                </div>
              </div>
            ) : (
              <div 
                className="flex items-center justify-center gap-8 py-6 border-y"
                style={{ borderColor: `${design.colors.primary}30` }}
              >
                <div className="text-center">
                  <div className="text-4xl font-bold" style={{ color: design.colors.primary }}>
                    {result.totalScore}
                  </div>
                  <div className="text-sm" style={{ color: `${design.colors.text}80` }}>Sua Pontuação</div>
                </div>
                <div className="text-2xl" style={{ color: `${design.colors.text}80` }}>/</div>
                <div className="text-center">
                  <div className="text-4xl font-bold" style={{ color: design.colors.text }}>
                    {config.passingScore}
                  </div>
                  <div className="text-sm" style={{ color: `${design.colors.text}80` }}>Necessário</div>
                </div>
              </div>
            )}

            {result.passed && (
              <div 
                className="p-4 rounded-lg"
                style={{ 
                  backgroundColor: `${design.colors.primary}1a`,
                  border: `1px solid ${design.colors.primary}33`
                }}
              >
                <p className="text-sm" style={{ color: design.colors.text }}>
                  Em breve, nossa equipe entrará em contato para agendar sua reunião.
                </p>
              </div>
            )}

            <Button 
              onClick={onBack} 
              variant="outline" 
              className="gap-2"
              style={{ borderColor: `${design.colors.primary}30`, color: design.colors.text }}
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Editor
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className={isLivePreview ? "min-h-full p-4 rounded-lg" : "max-w-2xl mx-auto space-y-6"} 
      style={{ 
        fontFamily: design.typography.fontFamily,
        background: isLivePreview ? `linear-gradient(to bottom right, ${colors.background}, ${colors.secondary})` : undefined
      }}
    >
      {!isLivePreview && (
        <Button onClick={onBack} variant="ghost" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Editor
        </Button>
      )}

      <Card
        className={`p-8 shadow-xl ${spacingClasses[design.spacing]}`}
        style={{ 
          backgroundColor: colors.background,
          color: colors.text,
          borderColor: `${colors.primary}30`
        }}
      >
        {design.logo && (
          <div className={`mb-8 ${design.logoAlign === 'center' ? 'flex justify-center' : design.logoAlign === 'right' ? 'flex justify-end' : ''}`}>
            <img 
              src={design.logo} 
              alt="Logo" 
              style={{ height: `${design.logoSize || 64}px` }}
              className="object-contain" 
              onError={(e) => {
                console.error('Logo failed to load in preview:', design.logo);
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
        
        {(() => {
          const firstElement = elements[0];
          const isDuplicateHeading = firstElement && 
            isHeadingElement(firstElement) && 
            firstElement.text.trim() === config.title.trim();
          
          if (isDuplicateHeading) return null;
          
          return (
            <div className="space-y-2 mb-8">
              <h1 
                className={`${titleSizeClasses[design.typography.titleSize as keyof typeof titleSizeClasses]} font-bold`}
                style={{ color: design.colors.primary }}
              >
                {config.title}
              </h1>
              <p 
                className={textSizeClasses[design.typography.textSize as keyof typeof textSizeClasses]}
                style={{ color: design.colors.text, opacity: 0.8 }}
              >
                {config.description}
              </p>
            </div>
          );
        })()}

        <div className={spacingClasses[design.spacing]}>
          {elements.map((element, index) => {
            return (
              <div key={element.id}>
                {renderElement(element, index)}
              </div>
            );
          })}
        </div>

        {!isLivePreview && (
          <div className="mt-8 pt-8 border-t" style={{ borderColor: design.colors.primary + '30' }}>
            <Button
              onClick={handleSubmit}
              className="w-full gap-2 py-6 text-base"
              style={{
                backgroundColor: design.colors.button || design.colors.primary,
                color: design.colors.buttonText || design.colors.background
              }}
              disabled={Object.keys(answers).length !== totalQuestions}
            >
              <Send className="h-5 w-5" />
              Enviar Respostas
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
