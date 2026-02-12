import { useState, useEffect, useRef, useMemo } from "react";
import { FormConfig, FormAnswer, FormSubmission, ScoreTier } from "../types/form";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Label } from "../components/ui/label";
import { Send, CheckCircle2, XCircle, Loader2, Award, Phone, ArrowRight, Lock } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Form } from "../../../../shared/db-schema";
import { useParams, useSearchParams } from "react-router-dom";

interface QuestionPage {
  questions: any[];
}

function groupQuestionsByPages(form: Form): QuestionPage[] {
  // Priority: form.questions (where elements are saved via API) > form.elements (legacy separate column)
  const formData = (form.questions as any[] | null) || (form.elements as any[] | null);

  if (!formData || formData.length === 0) {
    return [];
  }

  // Check if data is in new FormElement[] format (has type: 'question' with questionType)
  // or legacy Question[] format (has type: 'text'/'multiple-choice' directly)
  const isNewFormat = formData.some((item: any) => {
    if (!item.type) return false;
    // New format indicators
    if (item.type === 'question' && 'questionType' in item) return true;
    if (item.type === 'heading' || item.type === 'pageBreak' || item.type === 'text') return true;
    return false;
  });

  if (!isNewFormat) {
    // Legacy format: each question on its own page (original behavior)
    // Include all legacy question types: text, multiple-choice, radio, checkbox, select, textarea
    const legacyTypes = ['text', 'multiple-choice', 'radio', 'checkbox', 'select', 'textarea'];
    const questions = formData.filter((q: any) => q.text && (legacyTypes.includes(q.type) || q.questionType));
    if (questions.length > 0) {
      return questions.map((q: any) => {
        // Normalize legacy types to standard questionType
        let normalizedType = q.type || q.questionType;
        if (normalizedType === 'radio' || normalizedType === 'select' || normalizedType === 'checkbox') {
          normalizedType = 'multiple-choice';
        }
        return {
          questions: [{
            id: q.id,
            text: q.text,
            questionType: normalizedType,
            type: normalizedType,
            options: q.options,
            points: q.points || 0,
            required: q.required || false
          }]
        };
      });
    }
    return [];
  }

  // New FormElement[] format: parse with pageBreak support
  // Handle duplicate/empty pageBreaks gracefully by only splitting when we have questions
  const pages: QuestionPage[] = [];
  let currentPageQuestions: any[] = [];
  let foundFirstQuestion = false;
  let lastWasPageBreak = false;

  for (const element of formData) {
    if (element.type === 'question') {
      foundFirstQuestion = true;
      lastWasPageBreak = false;
      currentPageQuestions.push({
        id: element.id,
        text: element.text,
        questionType: element.questionType,
        type: element.questionType,
        options: element.options,
        points: element.points || 0,
        required: element.required || false
      });
    } else if (element.type === 'pageBreak') {
      // Only create a page break if:
      // 1. We've found at least one question
      // 2. Current page has questions
      // 3. This isn't a duplicate/consecutive pageBreak
      if (foundFirstQuestion && currentPageQuestions.length > 0 && !lastWasPageBreak) {
        pages.push({ questions: currentPageQuestions });
        currentPageQuestions = [];
      }
      lastWasPageBreak = true;
    }
    // Ignore other element types (heading, text) for pagination purposes
    // They are rendered separately
  }

  // Don't forget the last page
  if (currentPageQuestions.length > 0) {
    pages.push({ questions: currentPageQuestions });
  }

  return pages;
}

interface ContactData {
  telefone: string;
  nome: string | null;
  profilePicUrl?: string | null;
}

const PublicForm = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const ref = searchParams.get('ref');
  const telefone = searchParams.get('telefone');

  const [answers, setAnswers] = useState<Record<string, FormAnswer>>({});
  const [result, setResult] = useState<FormSubmission | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactCpf, setContactCpf] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [telefoneBloqueado, setTelefoneBloqueado] = useState(false);

  // 🔥 NOVO: Estado para captura automática do WhatsApp
  const [carregandoDados, setCarregandoDados] = useState(false);
  const [dadosWhatsApp, setDadosWhatsApp] = useState<ContactData | null>(null);
  const [iniciado, setIniciado] = useState(false);

  // 🔥 FIX: Guard para evitar duplo fetch em React Strict Mode
  const hasFetchedRef = useRef(false);

  const { data: form, isLoading } = useQuery<Form>({
    queryKey: ["/api/forms/public", id],
    queryFn: async () => {
      const response = await fetch(`/api/forms/public/${id}`);
      if (!response.ok) throw new Error("Form not found");
      return response.json();
    },
    enabled: !!id,
  });

  /**
   * 🔧 Função auxiliar para formatar telefone brasileiro
   */
  const formatarTelefone = (numero: string): string => {
    if (!numero) return '';
    const cleaned = numero.replace(/\D/g, '').replace(/@.*/, '');
    if (cleaned.length === 13 && cleaned.startsWith('55')) {
      const ddd = cleaned.substring(2, 4);
      const first = cleaned.substring(4, 9);
      const last = cleaned.substring(9);
      return `(${ddd}) ${first}-${last}`;
    } else if (cleaned.length === 12 && cleaned.startsWith('55')) {
      const ddd = cleaned.substring(2, 4);
      const first = cleaned.substring(4, 8);
      const last = cleaned.substring(8);
      return `(${ddd}) ${first}-${last}`;
    } else if (cleaned.length === 11) {
      const ddd = cleaned.substring(0, 2);
      const first = cleaned.substring(2, 7);
      const last = cleaned.substring(7);
      return `(${ddd}) ${first}-${last}`;
    } else if (cleaned.length === 10) {
      const ddd = cleaned.substring(0, 2);
      const first = cleaned.substring(2, 6);
      const last = cleaned.substring(6);
      return `(${ddd}) ${first}-${last}`;
    }
    return cleaned;
  };

  // 🔥 PRIORIDADE: telefone direto > ref (n8n pode enviar ambos)
  useEffect(() => {
    if (hasFetchedRef.current) return;

    // Se tiver telefone direto na URL, usa ele (prioridade máxima)
    if (telefone) {
      hasFetchedRef.current = true;
      const formatted = formatarTelefone(telefone);
      console.log('📱 [PublicForm] Telefone direto da URL:', telefone, '→', formatted);
      setContactPhone(formatted);
      setDadosWhatsApp({
        telefone: formatted,
        nome: null,
        profilePicUrl: null
      });
      setTelefoneBloqueado(true);
      toast.success('Telefone verificado via WhatsApp!');
      return;
    }

    // Se tiver ref, busca dados do WhatsApp
    if (ref && !dadosWhatsApp) {
      hasFetchedRef.current = true;
      buscarDadosWhatsApp(ref);
    }
  }, [telefone, ref, dadosWhatsApp]);

  /**
   * 🔥 NOVO: Busca dados do contato via Evolution API
   */
  const buscarDadosWhatsApp = async (numero: string) => {
    try {
      setCarregandoDados(true);
      console.log('🔍 Buscando dados do WhatsApp para:', numero);

      const response = await fetch(`/api/whatsapp/contact/${numero}`);

      if (!response.ok) {
        throw new Error('Erro ao buscar dados do contato');
      }

      const data = await response.json();

      if (data.success && data.contact) {
        console.log('✅ Dados do WhatsApp obtidos:', data.contact);

        // Formata o telefone recebido
        const telefoneFormatado = formatarTelefone(data.contact.telefone);

        setDadosWhatsApp({
          telefone: telefoneFormatado,
          nome: data.contact.nome || null,
          profilePicUrl: data.contact.profilePicUrl || null
        });

        // PRÉ-PREENCHE formulário
        setContactPhone(telefoneFormatado);
        setTelefoneBloqueado(true);
        if (data.contact.nome) {
          setContactName(data.contact.nome);
        }

        if (data.contact.nome) {
          toast.success(`Olá, ${data.contact.nome}! Seus dados foram carregados automaticamente.`);
        } else {
          toast.success('Telefone verificado via WhatsApp!');
        }
      } else {
        console.warn('⚠️ Contato não encontrado');

        // Usa número da ref como fallback (formatado)
        const telefoneFormatado = formatarTelefone(numero);
        console.log('📱 [PublicForm] Fallback ref:', numero, '→', telefoneFormatado);
        setContactPhone(telefoneFormatado);
        setTelefoneBloqueado(true);
        setDadosWhatsApp({
          telefone: telefoneFormatado,
          nome: null,
          profilePicUrl: null
        });
      }

    } catch (error) {
      console.error('❌ Erro ao buscar dados do WhatsApp:', error);

      // Usa número da ref como fallback (formatado)
      if (ref) {
        const telefoneFormatado = formatarTelefone(ref);
        console.log('📱 [PublicForm] Fallback erro ref:', ref, '→', telefoneFormatado);
        setContactPhone(telefoneFormatado);
        setTelefoneBloqueado(true);
        setDadosWhatsApp({
          telefone: telefoneFormatado,
          nome: null,
          profilePicUrl: null
        });
      }
    } finally {
      setCarregandoDados(false);
    }
  };

  /**
   * 🔥 NOVO: Registra início do preenchimento
   */
  const registrarInicio = async () => {
    if (iniciado || !contactPhone) return;

    try {
      await fetch('/api/whatsapp/track-form-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: id,
          telefone: contactPhone
        })
      });

      setIniciado(true);
      console.log('✅ Início do preenchimento registrado');
    } catch (error) {
      console.error('Erro ao registrar início:', error);
    }
  };

  const submitMutation = useMutation({
    mutationFn: (data: any) => api.createFormSubmission(data),
    onSuccess: (_, variables) => {
      const answerArray = Object.values(answers);
      const totalScore = answerArray.reduce((sum, ans) => sum + ans.points, 0);
      setResult({
        answers: answerArray,
        totalScore,
        passed: variables.passed,
      });
      toast.success("Formulário enviado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao enviar formulário");
    },
  });

  const config = form ? {
    title: form.title,
    description: form.description || '',
    questions: form.questions as any,
    passingScore: form.passingScore,
    scoreTiers: form.scoreTiers as ScoreTier[] || [],
    designConfig: (form.designConfig as any) || (form as any).design_config,
    completionPageConfig: (form.completionPageConfig as any) || (form as any).completion_page_config
  } : null;

  // Usar MESMA lógica de merge de cores do FormPreview.tsx
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
    spacing: "comfortable",
    logo: null
  };

  const baseDesign = (config?.designConfig as any) ?? {};

  // 🔍 DEBUG: Log raw received design config in PublicForm
  if (config) {
    console.log('🎨 [PublicForm] Raw Config:', config);
    console.log('🎨 [PublicForm] Design Config:', config.designConfig);
  }

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
    spacing: baseDesign.spacing || defaultDesign.spacing,
    logo: baseDesign.logo || defaultDesign.logo
  };

  // 🔍 DEBUG: Log final computed design
  useEffect(() => {
    console.log('🎨 [PublicForm] Design Computado:', design);
    console.log('🎨 [PublicForm] Cores Finais:', design.colors);
  }, [design]);

  // Load Google Fonts
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

  const handleAnswer = (questionId: string, answer: string, points: number) => {
    setAnswers({
      ...answers,
      [questionId]: { questionId, answer, points }
    });
  };

  const handleSubmit = () => {
    if (!config || !id) return;

    if (!contactName || !contactEmail || !contactCpf) {
      toast.error("Por favor, preencha seu nome completo, email e CPF");
      return;
    }

    const answerArray = Object.values(answers);
    const totalScore = answerArray.reduce((sum, ans) => sum + ans.points, 0);

    let passed = totalScore >= config.passingScore;

    if (config.scoreTiers && config.scoreTiers.length > 0) {
      const tier = config.scoreTiers.find(
        t => totalScore >= t.minScore && totalScore <= t.maxScore
      );
      passed = tier?.qualifies || false;
    }

    submitMutation.mutate({
      formId: id,
      answers: answerArray,
      totalScore,
      passed,
      contactName,
      contactEmail,
      contactPhone: contactPhone || null,
      contactCpf
    });
  };

  if (isLoading || carregandoDados) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(to bottom right, ${design.colors.background}, ${design.colors.secondary})` }}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: design.colors.primary }} />
          <p style={{ color: design.colors.text }}>
            {carregandoDados ? 'Carregando seus dados...' : 'Carregando formulário...'}
          </p>
          {carregandoDados && (
            <p className="text-sm mt-2" style={{ color: `${design.colors.text}99` }}>Buscando informações do WhatsApp</p>
          )}
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(to bottom right, ${design.colors.background}, ${design.colors.secondary})` }}>
        <Card className="p-8 text-center max-w-md" style={{ backgroundColor: design.colors.background }}>
          <XCircle className="h-12 w-12 mx-auto mb-4" style={{ color: '#ef4444' }} />
          <h2 className="text-2xl font-bold mb-2" style={{ color: design.colors.text }}>Formulário não encontrado</h2>
          <p style={{ color: `${design.colors.text}99` }}>O formulário que você está procurando não existe ou foi removido.</p>
        </Card>
      </div>
    );
  }

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

  if (result) {
    const tier = config.scoreTiers?.find(
      t => result.totalScore >= t.minScore && result.totalScore <= t.maxScore
    );

    const completionConfig = config?.completionPageConfig || {
      title: "Obrigado por preencher o formulário!",
      successMessage: "Nossa equipe está analisando suas informações e retornaremos em breve pelo WhatsApp.",
      failureMessage: "Obrigado por preencher o formulário. Nossa equipe analisará suas respostas.",
      showScore: true,
      showTierBadge: true
    };

    const bgColor = completionConfig.colors?.backgroundColor || colors.background;
    const successIconColor = completionConfig.colors?.successIcon || colors.primary;
    const failureIconColor = completionConfig.colors?.failureIcon || "hsl(0, 0%, 60%)";

    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: `linear-gradient(to bottom right, ${bgColor}, ${colors.secondary})` }}>
        <Card className="w-full max-w-2xl p-8 text-center">
          {result.passed ? (
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4" style={{ color: successIconColor }} />
          ) : (
            <XCircle className="h-16 w-16 mx-auto mb-4" style={{ color: failureIconColor }} />
          )}

          <h2 className="text-3xl font-bold mb-2" style={{ color: colors.text }}>
            {completionConfig.title}
          </h2>

          {completionConfig.subtitle && (
            <p className="text-lg mb-4" style={{ color: `${colors.text}99` }}>
              {completionConfig.subtitle}
            </p>
          )}

          {completionConfig.showTierBadge && tier && (
            <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: colors.secondary }}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Award className="h-5 w-5" style={{ color: colors.primary }} />
                <span className="font-semibold" style={{ color: colors.text }}>{tier.label}</span>
              </div>
              <p className="text-sm" style={{ color: colors.text }}>{tier.description}</p>
            </div>
          )}

          {completionConfig.showScore && (
            <div className="rounded-lg p-6 mb-6" style={{ backgroundColor: `${colors.secondary}` }}>
              <div className="text-5xl font-bold mb-2" style={{ color: colors.primary }}>
                {result.totalScore}
              </div>
              <div style={{ color: `${colors.text}99` }}>pontos</div>
            </div>
          )}

          <p className="text-base mb-6" style={{ color: colors.text }}>
            {result.passed ? completionConfig.successMessage : completionConfig.failureMessage}
          </p>

          {completionConfig.customContent && (
            <div
              className="mt-6 p-4 rounded-lg"
              dangerouslySetInnerHTML={{ __html: completionConfig.customContent }}
              style={{ color: colors.text, backgroundColor: `${colors.secondary}50` }}
            />
          )}

          {completionConfig.ctaText && completionConfig.ctaUrl && (
            <a href={completionConfig.ctaUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-6">
              <Button
                className="w-full"
                style={{ backgroundColor: colors.button, color: colors.buttonText }}
              >
                {completionConfig.ctaText}
              </Button>
            </a>
          )}
        </Card>
      </div>
    );
  }

  // 🔥 Agrupa perguntas por páginas usando form.elements
  const questionPages = useMemo(() => {
    if (!form) return [];
    return groupQuestionsByPages(form);
  }, [form]);

  // Página atual de perguntas
  const currentPageQuestions = questionPages[currentPage]?.questions || [];
  const totalPages = questionPages.length;
  const isLastPage = currentPage === totalPages - 1;
  const isFirstPage = currentPage === 0;

  // Verifica se pode avançar para próxima página
  const canGoNext = () => {
    return currentPageQuestions.every(q => {
      if (q.required) {
        return answers[q.id]?.answer;
      }
      return true;
    });
  };

  // 🔥 NOVO: Calcula progresso do formulário
  const totalQuestions = questionPages.reduce((sum, page) => sum + page.questions.length, 0);
  const camposPreenchidos = [
    contactName,
    contactEmail,
    ...Object.keys(answers)
  ].filter(Boolean).length;
  const totalCampos = 2 + totalQuestions;
  const progresso = Math.round((camposPreenchidos / totalCampos) * 100);

  return (
    <div className="min-h-screen p-4" style={{ background: `linear-gradient(to bottom right, ${colors.background}, ${colors.secondary})`, fontFamily: design.typography.fontFamily }}>
      <div className="max-w-3xl mx-auto py-8">
        {/* 🔥 NOVO: Header com informações do WhatsApp */}
        {ref && dadosWhatsApp && (
          <Card className="p-6 mb-6" style={{ backgroundColor: colors.background, borderColor: `${colors.primary}30` }}>
            <div className="flex items-center gap-4 mb-4">
              {dadosWhatsApp.profilePicUrl ? (
                <img
                  src={dadosWhatsApp.profilePicUrl}
                  alt="Foto de perfil"
                  className="w-16 h-16 rounded-full border-2"
                  style={{ borderColor: colors.primary }}
                />
              ) : (
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.primary }}>
                  <Phone className="w-8 h-8" style={{ color: colors.buttonText }} />
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-xl font-bold" style={{ color: colors.text }}>
                  Olá, {dadosWhatsApp.nome || 'bem-vindo'}!
                </h2>
                <p className="text-sm" style={{ color: `${colors.text}99` }}>Preencha os dados abaixo</p>
              </div>
            </div>

            {/* Barra de progresso */}
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: colors.text }}>Progresso</span>
                <span className="text-sm font-medium" style={{ color: colors.primary }}>{progresso}%</span>
              </div>
              <div className="w-full rounded-full h-2" style={{ backgroundColor: colors.secondary }}>
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progresso}%`, backgroundColor: colors.progressBar || colors.primary }}
                />
              </div>
            </div>

            {/* Verificação WhatsApp */}
            <div
              className="flex items-center gap-2 text-sm rounded-lg p-3"
              style={{ backgroundColor: `${colors.primary}15`, color: colors.primary }}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Telefone verificado via WhatsApp</span>
            </div>
          </Card>
        )}

        <Card className={`p-8 mb-6 ${spacingClasses[design.spacing as keyof typeof spacingClasses]}`} style={{ backgroundColor: colors.background, borderColor: `${colors.primary}30`, border: '5px solid purple' }}>
          {/* 🔍 DEBUG: VISUAL INDICATOR - PUBLIC FORM FILE */}
          <div style={{ background: 'purple', color: 'white', padding: '10px', marginBottom: '20px', fontWeight: 'bold' }}>
            DEBUG MODE: ARQUIVO PUBLICFORM.TSX (Borda Roxa)
          </div>
          {design.logo && (
            <div className={`mb-8 ${design.logoAlign === 'center' ? 'flex justify-center' : design.logoAlign === 'right' ? 'flex justify-end' : ''}`}>
              <img
                src={design.logo}
                alt="Logo"
                style={{ height: `${design.logoSize || 64}px` }}
                className="object-contain"
              />
            </div>
          )}

          <h1 className={`${titleSizeClasses[design.typography.titleSize as keyof typeof titleSizeClasses]} font-bold mb-4`} style={{ color: colors.primary }}>{config.title}</h1>
          <p className={`${textSizeClasses[design.typography.textSize as keyof typeof textSizeClasses]} mb-6`} style={{ color: colors.text, opacity: 0.8 }}>{config.description}</p>

          {/* Barra de progresso das páginas */}
          {totalPages > 1 && (
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: colors.text }}>
                  Página {currentPage + 1} de {totalPages}
                </span>
                <span className="text-sm font-medium" style={{ color: colors.primary }}>
                  {Math.round(((currentPage + 1) / totalPages) * 100)}%
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.secondary }}>
                <div className="h-full transition-all duration-300" style={{ width: `${((currentPage + 1) / totalPages) * 100}%`, backgroundColor: colors.primary }} />
              </div>
            </div>
          )}

          <div className={spacingClasses[design.spacing as keyof typeof spacingClasses]}>
            {currentPageQuestions.map((question, index) => {
              const questionType = question.questionType || question.type;
              const globalIndex = questionPages.slice(0, currentPage).reduce((sum, page) => sum + page.questions.length, 0) + index;

              return (
                <div key={question.id} className="space-y-4" data-testid={`question-${question.id}`}>
                  <div className="flex items-start gap-3">
                    <span
                      className="font-semibold px-3 py-1 rounded-full text-sm shrink-0"
                      style={{
                        backgroundColor: `${colors.primary}20`,
                        color: colors.primary
                      }}
                    >
                      {globalIndex + 1}
                    </span>
                    <div className="flex-1">
                      <h3
                        className={`font-medium ${textSizeClasses[design.typography.textSize as keyof typeof textSizeClasses]} mb-4`}
                        style={{ color: colors.text }}
                      >
                        {question.text}
                        {question.required && <span className="ml-1" style={{ color: '#ef4444' }}>*</span>}
                      </h3>

                      {questionType === 'multiple-choice' && question.options && (
                        <RadioGroup
                          value={answers[question.id]?.answer || ''}
                          onValueChange={(value) => {
                            const option = question.options?.find((opt: any) => opt.id === value);
                            if (option) {
                              handleAnswer(question.id, value, option.points || 0);
                              if (!iniciado && Object.keys(answers).length === 0) {
                                registrarInicio();
                              }
                            }
                          }}
                          className="space-y-3"
                        >
                          {question.options.map((option: any) => (
                            <label
                              key={option.id}
                              htmlFor={option.id}
                              className="flex items-center space-x-3 p-4 rounded-lg border transition-colors cursor-pointer hover:border-primary/50"
                              style={{
                                backgroundColor: colors.secondary,
                                borderColor: colors.primary + '30',
                                color: colors.text
                              }}
                              data-testid={`option-${option.id}`}
                            >
                              <RadioGroupItem value={option.id} id={option.id} />
                              <span
                                className="flex-1 font-normal"
                                style={{ color: colors.text }}
                              >
                                {option.text}
                              </span>
                            </label>
                          ))}
                        </RadioGroup>
                      )}

                      {questionType === 'text' && (
                        <Textarea
                          value={answers[question.id]?.answer || ''}
                          onChange={(e) => {
                            handleAnswer(question.id, e.target.value, question.points || 0);
                            if (!iniciado && e.target.value && Object.keys(answers).length === 0) {
                              registrarInicio();
                            }
                          }}
                          placeholder="Digite sua resposta..."
                          className="resize-none"
                          style={{
                            backgroundColor: colors.secondary,
                            borderColor: colors.primary + '30',
                            color: colors.text
                          }}
                          rows={4}
                          data-testid={`textarea-${question.id}`}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navegação entre páginas */}
          {totalPages > 1 && !isLastPage && (
            <div className="mt-8 flex justify-end">
              <Button
                onClick={() => {
                  if (canGoNext()) {
                    setCurrentPage(p => p + 1);
                  } else {
                    toast.error("Por favor, responda todas as perguntas obrigatórias");
                  }
                }}
                style={{ backgroundColor: colors.button, color: colors.buttonText }}
                className="flex items-center gap-2"
              >
                Próxima
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Informações de Contato - apenas na última página ou se há apenas 1 página */}
          {(isLastPage || totalPages <= 1) && (
            <div className="mt-8 pt-6 border-t space-y-4" style={{ borderColor: colors.primary + '30' }}>
              <h3 className={`${textSizeClasses[design.typography.textSize as keyof typeof textSizeClasses]} font-semibold`} style={{ color: colors.text }}>Informações de Contato</h3>

              <div>
                <Label htmlFor="contact-name" style={{ color: colors.text }}>Nome *</Label>
                <Input
                  id="contact-name"
                  value={contactName}
                  onChange={(e) => {
                    setContactName(e.target.value);
                    // 🔥 NOVO: Registra início ao preencher nome
                    if (!iniciado && e.target.value && !Object.keys(answers).length) {
                      registrarInicio();
                    }
                  }}
                  placeholder="Seu nome completo"
                  required
                  data-testid="input-name"
                  style={dadosWhatsApp?.nome
                    ? { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}50`, color: colors.text }
                    : { backgroundColor: colors.secondary, borderColor: `${colors.primary}30`, color: colors.text }
                  }
                />
                {dadosWhatsApp?.nome && (
                  <p className="text-xs mt-1" style={{ color: colors.primary }}>
                    ✓ Nome carregado do WhatsApp (você pode editar se necessário)
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="contact-email" style={{ color: colors.text }}>Email *</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  data-testid="input-email"
                  style={{ backgroundColor: colors.secondary, borderColor: `${colors.primary}30`, color: colors.text }}
                />
              </div>

              <div>
                <Label htmlFor="contact-cpf" style={{ color: colors.text }}>CPF *</Label>
                <Input
                  id="contact-cpf"
                  value={contactCpf}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    const formatted = value
                      .replace(/(\d{3})(\d)/, '$1.$2')
                      .replace(/(\d{3})(\d)/, '$1.$2')
                      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                    setContactCpf(formatted);
                  }}
                  placeholder="000.000.000-00"
                  required
                  maxLength={14}
                  data-testid="input-cpf"
                  style={{ backgroundColor: colors.secondary, borderColor: `${colors.primary}30`, color: colors.text }}
                />
              </div>

              <div>
                <Label htmlFor="contact-phone" style={{ color: colors.text }} className="flex items-center gap-2">
                  Telefone {(ref || telefoneBloqueado) && (
                    <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: '#22c55e', color: '#ffffff' }}>
                      <Lock className="w-3 h-3" />
                      Verificado
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="contact-phone"
                    value={contactPhone}
                    onChange={(e) => !telefoneBloqueado && !ref && setContactPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    data-testid="input-phone"
                    readOnly={telefoneBloqueado || !!ref}
                    className={telefoneBloqueado || ref ? "pr-10" : ""}
                    style={(ref || telefoneBloqueado)
                      ? { backgroundColor: colors.secondary, borderColor: '#22c55e', borderWidth: '2px', color: colors.text, cursor: 'not-allowed' }
                      : { backgroundColor: colors.secondary, borderColor: `${colors.primary}30`, color: colors.text }
                    }
                  />
                  {(ref || telefoneBloqueado) && (
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.primary }} />
                  )}
                </div>
                {(ref || telefoneBloqueado) && (
                  <p className="text-xs mt-1 flex items-center gap-1" style={{ color: colors.primary }}>
                    <CheckCircle2 className="w-3 h-3" />
                    Telefone verificado via WhatsApp (não pode ser alterado)
                  </p>
                )}
              </div>

              <Button
                onClick={handleSubmit}
                disabled={submitMutation.isPending || Object.keys(answers).length === 0}
                className="w-full gap-2 py-6"
                style={{ backgroundColor: colors.button, color: colors.buttonText }}
                data-testid="button-submit"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar Formulário
                  </>
                )}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default PublicForm;
