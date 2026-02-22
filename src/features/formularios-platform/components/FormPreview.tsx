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
import { ArrowRight, Send, CheckCircle2, XCircle, Award, Sparkles, ArrowLeft } from "lucide-react";

interface FormPreviewProps {
  config: FormConfig;
  onBack: () => void;
  isLivePreview?: boolean;
  activePageId?: string | null;
  activeQuestionId?: string | null;
  wizardMode?: boolean;
  device?: 'desktop' | 'mobile';
}

export const FormPreview = ({ config, onBack, isLivePreview = false, activePageId, activeQuestionId, wizardMode = false, device = 'desktop' }: FormPreviewProps) => {
  const [answers, setAnswers] = useState<Record<string, FormAnswer>>({});
  const [result, setResult] = useState<FormSubmission | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [wizardStep, setWizardStep] = useState(0);
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const shouldUseWizard = wizardMode || isLivePreview;

  const defaultDesign = {
    colors: {
      // ✅ NEW: Clear color naming
      titleColor: "hsl(221, 83%, 53%)",
      textColor: "hsl(222, 47%, 11%)",
      pageBackground: "linear-gradient(135deg, hsl(210, 40%, 96%), hsl(0, 0%, 100%))",
      containerBackground: "hsl(0, 0%, 100%)",
      buttonColor: "hsl(221, 83%, 53%)",
      buttonTextColor: "hsl(0, 0%, 100%)",
      progressBarColor: "hsl(221, 83%, 53%)",
      inputBackground: "hsl(210, 40%, 96%)",
      inputTextColor: "hsl(222, 47%, 11%)",
      borderColor: "hsl(214, 32%, 91%)",

      // DEPRECATED: Para retrocompatibilidade
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
    logoAlign: 'center',
    logoSize: 120,
    spacing: "comfortable"
  };

  // Função para migrar cores antigas para novo formato
  const migrateColors = (oldColors: any) => {
    if (!oldColors) return defaultDesign.colors;

    // Suporte para ambos os formatos (snake_case do DB e camelCase do Frontend)
    const get = (camel: string, snake: string) => oldColors[camel] || oldColors[snake];

    return {
      // Novas cores (prioridade para novos campos)
      titleColor: get('titleColor', 'title_color') || get('primary', 'primary') || defaultDesign.colors.titleColor,
      textColor: get('textColor', 'text_color') || get('text', 'text') || defaultDesign.colors.textColor,
      pageBackground: get('pageBackground', 'page_background') ||
        `linear-gradient(135deg, ${get('secondary', 'secondary') || defaultDesign.colors.inputBackground}, ${get('background', 'background') || defaultDesign.colors.containerBackground})`,
      containerBackground: get('containerBackground', 'container_background') || get('background', 'background') || defaultDesign.colors.containerBackground,
      buttonColor: get('buttonColor', 'button_color') || get('button', 'button') || defaultDesign.colors.buttonColor,
      buttonTextColor: get('buttonTextColor', 'button_text_color') || get('buttonText', 'button_text') || defaultDesign.colors.buttonTextColor,
      progressBarColor: get('progressBarColor', 'progress_bar_color') || get('progressBar', 'progress_bar') || get('primary', 'primary') || defaultDesign.colors.progressBarColor,
      inputBackground: get('inputBackground', 'input_background') || get('secondary', 'secondary') || defaultDesign.colors.inputBackground,
      inputTextColor: get('inputTextColor', 'input_text_color') || get('textColor', 'text_color') || defaultDesign.colors.inputTextColor,
      borderColor: get('borderColor', 'border_color') || defaultDesign.colors.borderColor,

      // Manter deprecated para compatibilidade
      primary: get('primary', 'primary'),
      secondary: get('secondary', 'secondary'),
      background: get('background', 'background'),
      text: get('text', 'text'),
      button: get('button', 'button'),
      buttonText: get('buttonText', 'button_text'),
      progressBar: get('progressBar', 'progress_bar')
    };
  };

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

  const baseDesign = config.designConfig ?? {
    colors: {
      titleColor: "hsl(221, 83%, 53%)",
      textColor: "hsl(222, 47%, 11%)",
      pageBackground: "linear-gradient(135deg, hsl(210, 40%, 96%), hsl(0, 0%, 100%))",
      containerBackground: "hsl(0, 0%, 100%)",
      buttonColor: "hsl(221, 83%, 53%)",
      buttonTextColor: "hsl(0, 0%, 100%)",
      progressBarColor: "hsl(221, 83%, 53%)",
      inputBackground: "hsl(210, 40%, 96%)",
      borderColor: "hsl(214, 32%, 91%)"
    },
    typography: {
      fontFamily: "Inter",
      titleSize: "2xl",
      textSize: "base"
    },
    spacing: "comfortable" as const
  };

  const design = {
    ...defaultDesign,
    ...baseDesign,
    colors: migrateColors(baseDesign.colors),
    typography: {
      ...defaultDesign.typography,
      ...(baseDesign.typography || {})
    },
    spacing: baseDesign.spacing || defaultDesign.spacing,
    logo: fixLogoUrl(baseDesign.logo || null) // 🛠️ Corrige URL da logo automaticamente
  };

  const welcomeConfig = config.welcomePageConfig ?? {
    title: config.title || "Bem-vindo!",
    description: config.description || "Por favor, preencha o formulário a seguir.",
    logo: null
  };

  const colors = design.colors;

  // Apply colors to CSS variables for preview
  useEffect(() => {
    const root = document.documentElement;
    if (isLivePreview) {
      root.style.setProperty('--form-title-color', colors.titleColor);
      root.style.setProperty('--form-text-color', colors.textColor);
      root.style.setProperty('--form-page-bg', colors.pageBackground);
      root.style.setProperty('--form-container-bg', colors.containerBackground);
      root.style.setProperty('--form-button-color', colors.buttonColor);
      root.style.setProperty('--form-button-text-color', colors.buttonTextColor);
      root.style.setProperty('--form-progress-color', colors.progressBarColor);
      root.style.setProperty('--form-input-bg', colors.inputBackground);
      root.style.setProperty('--form-input-text-color', colors.inputTextColor || colors.textColor);
      root.style.setProperty('--form-border-color', colors.borderColor);
    }
    return () => {
      if (isLivePreview) {
        root.style.removeProperty('--form-title-color');
        root.style.removeProperty('--form-text-color');
        root.style.removeProperty('--form-page-bg');
        root.style.removeProperty('--form-container-bg');
        root.style.removeProperty('--form-button-color');
        root.style.removeProperty('--form-button-text-color');
        root.style.removeProperty('--form-progress-color');
        root.style.removeProperty('--form-input-bg');
        root.style.removeProperty('--form-input-text-color');
        root.style.removeProperty('--form-border-color');
      }
    };
  }, [colors, isLivePreview]);

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

  const renderHeading = (element: FormElement) => {
    if (!isHeadingElement(element)) return null;

    const HeadingTag = `h${element.level}` as keyof JSX.IntrinsicElements;

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
          className={`${titleSizeClasses[fontSize as keyof typeof titleSizeClasses]} font-${fontWeight} ${alignmentClasses[alignment as keyof typeof alignmentClasses]}`}
          style={{
            color: colors.titleColor,
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
          className={`leading-relaxed ${textSizeClasses[fontSize as keyof typeof textSizeClasses]} font-${fontWeight} ${alignmentClasses[alignment as keyof typeof alignmentClasses]}`}
          style={{
            color: colors.textColor,
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
            style={{ borderColor: colors.borderColor }}
          />
        )}
        {element.label && (
          <p
            className="text-center text-sm mt-2"
            style={{ color: colors.textColor, opacity: 0.6 }}
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
          boxShadow: `0 0 0 2px ${colors.buttonColor}`,
          backgroundColor: `${colors.buttonColor}0d`
        } : undefined}
      >
        <div className="flex items-start gap-3">
          <span
            className="font-semibold px-3 py-1 rounded-full text-sm shrink-0"
            style={{
              backgroundColor: `${colors.buttonColor}20`,
              color: colors.titleColor
            }}
          >
            {questionNumber}
          </span>
          <div className="flex-1">
            <h3
              className={`font-medium ${textSizeClasses[design.typography.textSize as keyof typeof textSizeClasses]} mb-4`}
              style={{ color: colors.textColor }}
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
                    className="flex items-center space-x-3 p-4 rounded-lg border transition-all duration-200 cursor-pointer hover-elevate"
                    style={{
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.borderColor,
                      color: colors.inputTextColor
                    }}
                  >
                    <RadioGroupItem value={option.id} id={`${element.id}-${option.id}`} />
                    <Label
                      htmlFor={`${element.id}-${option.id}`}
                      className="flex-1 cursor-pointer font-normal"
                      style={{ color: colors.inputTextColor }}
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
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.borderColor,
                  color: colors.inputTextColor
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

  const handleAnswer = (questionId: string, answer: string, points: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        questionId,
        answer,
        points,
        questionText: questionElements.find(q => q.id === questionId)?.text || ''
      }
    }));
  };

  const handleStartWizard = () => {
    setWizardStep(1);
  };

  const handleWizardNext = () => {
    setWizardStep(prev => Math.min(prev + 1, totalWizardSteps - 1));
  };

  const handleWizardBack = () => {
    setWizardStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = () => {
    const answerArray = Object.values(answers);
    const totalScore = answerArray.reduce((sum, ans) => sum + (ans.points || 0), 0);
    const passingScore = config.passingScore || 0;
    const passed = totalScore >= passingScore;

    setResult({
      answers: answerArray,
      totalScore,
      passed
    });

    setWizardStep(totalWizardSteps - 1);
  };

  const getCurrentTier = (score: number): ScoreTier | null => {
    if (!config.scoreTiers || config.scoreTiers.length === 0) return null;

    const sortedTiers = [...config.scoreTiers].sort((a, b) => b.minScore - a.minScore);
    return sortedTiers.find(tier => score >= tier.minScore) || null;
  };

  const renderWizardWelcome = () => {
    const isMobileDevice = device === 'mobile';
    const alignMap: Record<string, string> = {
      left: 'justify-start',
      center: 'justify-center',
      right: 'justify-end'
    };

    // Desktop: User config (default left), Mobile: Always center
    const logoAlignment = isMobileDevice ? 'justify-center' : (alignMap[design.logoAlign] || 'justify-start');

    return (
      <div className="min-h-[500px] flex flex-col relative" style={{ background: colors.pageBackground }}>
        {design.logo && (
          <div className={`absolute top-0 left-0 w-full flex ${logoAlignment} p-4 md:p-8 z-10`}>
            <img
              src={design.logo}
              alt="Logo"
              className="max-w-[200px] object-contain rounded-lg"
              style={{ maxHeight: `${design.logoSize || 120}px` }}
            />
          </div>
        )}

        <div className="flex-1 flex items-center justify-center p-4 pt-32">
          <Card className="w-full max-w-2xl shadow-xl" style={{ backgroundColor: colors.containerBackground, borderColor: colors.borderColor }}>
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-4xl font-bold mb-4" style={{ color: colors.titleColor }}>
                {welcomeConfig.title}
              </CardTitle>
              <CardDescription className="text-lg" style={{ color: colors.textColor, opacity: 0.8 }}>
                {welcomeConfig.description}
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center pb-8">
              <Button
                size="lg"
                onClick={handleStartWizard}
                style={{ backgroundColor: colors.buttonColor, color: colors.buttonTextColor }}
                className="px-8"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Começar
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  };

  const renderWizardPersonalData = () => {
    return (
      <div className="min-h-[500px] p-4 font-sans" style={{ background: colors.pageBackground }}>
        <div className="max-w-3xl mx-auto pt-4">
          <div className="mb-6">
            <div className="w-full rounded-full h-2 mb-2" style={{ backgroundColor: colors.inputBackground }}>
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{ width: `${wizardProgress}%`, backgroundColor: colors.progressBarColor }}
              />
            </div>
            <p className="text-sm text-right" style={{ color: colors.textColor }}>{wizardProgress}% completo</p>
          </div>

          <Card className="shadow-lg" style={{ backgroundColor: colors.containerBackground, borderColor: colors.borderColor }}>
            <CardHeader>
              <CardTitle className="text-2xl" style={{ color: colors.textColor }}>Dados Pessoais</CardTitle>
              <CardDescription style={{ color: colors.textColor, opacity: 0.8 }}>Por favor, preencha suas informações de contato</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label style={{ color: colors.textColor }}>Nome completo *</Label>
                <Input
                  placeholder="Digite seu nome"
                  className="mt-1"
                  disabled
                  value="João da Silva"
                  style={{ backgroundColor: colors.inputBackground, borderColor: colors.borderColor, color: colors.inputTextColor }}
                />
              </div>
              <div>
                <Label style={{ color: colors.textColor }}>Email *</Label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  className="mt-1"
                  disabled
                  value="joao@email.com"
                  style={{ backgroundColor: colors.inputBackground, borderColor: colors.borderColor, color: colors.inputTextColor }}
                />
              </div>
              <div>
                <Label style={{ color: colors.textColor }}>CPF *</Label>
                <Input
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="mt-1"
                  disabled
                  value="123.456.789-00"
                  style={{ backgroundColor: colors.inputBackground, borderColor: colors.borderColor, color: colors.inputTextColor }}
                />
              </div>
              <div>
                <Label style={{ color: colors.textColor }}>WhatsApp (Celular) *</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  className="mt-1"
                  disabled
                  value="(11) 99999-9999"
                  style={{ backgroundColor: colors.inputBackground, borderColor: colors.borderColor, color: colors.inputTextColor }}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6 mt-6">
              <Button
                variant="outline"
                onClick={handleWizardBack}
                style={{ borderColor: colors.borderColor, color: colors.textColor }}
              >
                Voltar
              </Button>
              <Button
                onClick={handleWizardNext}
                style={{ backgroundColor: colors.buttonColor, color: colors.buttonTextColor }}
              >
                Próximo
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  };

  const renderWizardQuestion = () => {
    const questionIndex = wizardStep - 2;
    const currentQuestion = questionElements[questionIndex];

    if (!currentQuestion) return null;

    return (
      <div className="min-h-[500px] p-4" style={{ background: colors.pageBackground }}>
        <div className="max-w-3xl mx-auto pt-4">
          <div className="mb-6">
            <div className="w-full rounded-full h-2 mb-2" style={{ backgroundColor: colors.inputBackground }}>
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{ width: `${wizardProgress}%`, backgroundColor: colors.progressBarColor }}
              />
            </div>
            <p className="text-sm text-right" style={{ color: colors.textColor }}>{wizardProgress}% completo</p>
          </div>

          <Card className="shadow-lg" style={{ backgroundColor: colors.containerBackground, borderColor: colors.borderColor }}>
            <CardContent className="pt-8">
              {renderQuestion(currentQuestion, questionIndex + 1)}
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6 mt-6">
              <Button
                variant="outline"
                onClick={handleWizardBack}
                style={{ borderColor: colors.borderColor, color: colors.textColor }}
              >
                Voltar
              </Button>

              {questionIndex === totalQuestions - 1 ? (
                <Button
                  onClick={handleSubmit}
                  style={{ backgroundColor: colors.buttonColor, color: colors.buttonTextColor }}
                >
                  Finalizar
                </Button>
              ) : (
                <Button
                  onClick={handleWizardNext}
                  style={{ backgroundColor: colors.buttonColor, color: colors.buttonTextColor }}
                >
                  Próximo
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  };

  const renderWizardResult = () => {
    if (!result) return null;

    const tier = getCurrentTier(result.totalScore);
    const completion = config.completionPageConfig || {
      title: "Resultado",
      message: "Formulário concluído com sucesso.",
      successMessage: "Sua inscrição foi concluída com sucesso.",
      failureMessage: "Infelizmente você não atingiu a pontuação mínima."
    };

    const displayTitle = result.passed
      ? (completion.title || "Parabéns!")
      : (completion.title || "Quase lá!");

    const displayMessage = result.passed
      ? (completion.successMessage || completion.message || "Sua inscrição foi concluída com sucesso.")
      : (completion.failureMessage || completion.message || "Infelizmente você não atingiu a pontuação mínima.");

    return (
      <div className="min-h-[500px] flex items-center justify-center p-4" style={{ background: colors.pageBackground }}>
        <Card className="w-full max-w-2xl shadow-xl overflow-hidden" style={{ backgroundColor: colors.containerBackground, borderColor: colors.borderColor }}>
          <div className="h-2 w-full" style={{ backgroundColor: result.passed ? '#22c55e' : '#ef4444' }} />
          <CardHeader className="text-center pt-8">
            <div className="flex justify-center mb-6">
              {result.passed ? (
                <div className="bg-green-100 p-4 rounded-full">
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
              ) : (
                <div className="bg-red-100 p-4 rounded-full">
                  <XCircle className="h-12 w-12 text-red-600" />
                </div>
              )}
            </div>
            <CardTitle className="text-3xl font-bold mb-2" style={{ color: colors.titleColor }}>
              {displayTitle}
            </CardTitle>
            <CardDescription className="text-lg" style={{ color: colors.textColor, opacity: 0.8 }}>
              {displayMessage}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center pb-8">
            <div className="bg-muted/30 rounded-xl p-6 inline-block min-w-[200px]" style={{ backgroundColor: colors.inputBackground }}>
              <p className="text-sm font-medium uppercase tracking-wider mb-1" style={{ color: colors.textColor, opacity: 0.6 }}>Pontuação Final</p>
              <p className="text-4xl font-black" style={{ color: colors.titleColor }}>{result.totalScore}</p>
              {tier && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Award className="h-5 w-5" style={{ color: colors.buttonColor }} />
                  <span className="font-bold text-lg" style={{ color: colors.textColor }}>{tier.label}</span>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-center pb-12">
            <Button
              size="lg"
              onClick={() => setWizardStep(0)}
              variant="outline"
              style={{ borderColor: colors.borderColor, color: colors.textColor }}
            >
              Recomeçar
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  };

  if (isLivePreview) {
    return (
      <div className={`transition-all duration-300 ease-in-out shadow-2xl rounded-xl overflow-hidden ${device === 'mobile' ? 'w-[375px] h-[667px] mx-auto my-8 border-[12px] border-slate-800 rounded-[3rem]' : 'w-full'
        }`}
        style={{ backgroundColor: colors.pageBackground }}>
        <div className="h-full overflow-auto">
          <div className="p-4 md:p-8">
            {shouldUseWizard ? (
              wizardStep === 0 ? renderWizardWelcome() :
                wizardStep === 1 ? renderWizardPersonalData() :
                  wizardStep === totalWizardSteps - 1 ? renderWizardResult() :
                    renderWizardQuestion()
            ) : (
              <div className={spacingClasses[design.spacing as keyof typeof spacingClasses]}>
                {elements.map((element, index) => renderElement(element, index))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="shadow-lg overflow-hidden" style={{ backgroundColor: colors.containerBackground, borderColor: colors.borderColor }}>
      <CardContent className="p-4 md:p-8">
        {shouldUseWizard ? (
          wizardStep === 0 ? renderWizardWelcome() :
            wizardStep === 1 ? renderWizardPersonalData() :
              wizardStep === totalWizardSteps - 1 ? renderWizardResult() :
                renderWizardQuestion()
        ) : (
          <div className={spacingClasses[design.spacing as keyof typeof spacingClasses]}>
            {elements.map((element, index) => renderElement(element, index))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};