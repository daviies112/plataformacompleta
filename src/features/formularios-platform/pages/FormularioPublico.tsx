import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Label } from "../components/ui/label";
import {
  Send,
  CheckCircle2,
  Loader2,
  ArrowRight,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import type { Form } from "../../../../shared/db-schema";

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
  // or legacy Question[] format (has type: 'text'/'multiple-choice'/'radio' directly)
  const isNewFormat = formData.some((item: any) => {
    if (!item.type) return false;
    // New format indicators
    if (item.type === 'question' && 'questionType' in item) return true;
    if (item.type === 'heading' || item.type === 'pageBreak' || item.type === 'text') return true;
    return false;
  });

  if (!isNewFormat) {
    // Legacy format: each question on its own page (1 pergunta = 1 página)
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
  }

  // Don't forget the last page
  if (currentPageQuestions.length > 0) {
    pages.push({ questions: currentPageQuestions });
  }

  return pages;
}

interface FormularioPublicoProps { }

const personalDataSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  cpf: z.string().min(11, "CPF deve ter 11 dígitos").regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/, "CPF inválido"),
  phone: z.string().optional(),
  instagram: z.string().optional(),
});

const addressDataSchema = z.object({
  cep: z.string().min(8, "CEP deve ter 8 dígitos"),
  street: z.string().min(3, "Rua é obrigatória"),
  number: z.string().min(1, "Número é obrigatório"),
  complement: z.string().optional(),
  neighborhood: z.string().min(2, "Bairro é obrigatório"),
  city: z.string().min(2, "Cidade é obrigatória"),
  state: z.string().length(2, "Estado deve ter 2 letras"),
});

// Função auxiliar para detectar se é um UUID válido
const isUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

const FormularioPublico = (_props: FormularioPublicoProps) => {
  const params = useParams() as { token?: string; id?: string; companySlug?: string };
  const token = params.token;
  // 🔥 FIX: Remover query string do formIdOrSlug (wouter pode incluir query params no path)
  const rawFormIdOrSlug = params.id;
  const formIdOrSlug = rawFormIdOrSlug?.split('?')[0]; // Pode ser UUID ou slug
  const companySlugParam = params.companySlug?.split('?')[0]; // Slug da empresa da URL

  // 🔥 FIX: Extrair telefone da URL query params (wouter não tem useSearchParams)
  // IMPORTANTE: Em alguns casos o React Router codifica "?" como "%3F" no path
  // então precisamos verificar tanto window.location.search quanto o href completo
  const extractTelefone = (): string | null => {
    // Primeiro tenta via search params (forma padrão)
    if (window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const tel = params.get('telefone');
      if (tel) return tel;
    }

    // Fallback: verificar se o telefone está codificado no path (%3F = ?)
    const href = decodeURIComponent(window.location.href);
    const match = href.match(/[?&]telefone=([^&]+)/);
    if (match) return match[1];

    // Fallback 2: verificar no pathname se %3F foi usado
    const pathname = decodeURIComponent(window.location.pathname);
    const matchPath = pathname.match(/[?]telefone=([^&]+)/);
    if (matchPath) return matchPath[1];

    return null;
  };

  const telefoneFromUrl = extractTelefone();

  // Função para formatar telefone brasileiro
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

  // ✅ OTIMIZAÇÃO: isLoading começa false para mostrar skeleton instantaneamente
  // Estado principal
  const [form, setForm] = useState<Form | null>(null);
  const [sessao, setSessao] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false); // Muda para false para renderizar skeleton rápido
  const [error, setError] = useState<string | null>(null);

  // Estado do wizard
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // 🔥 FIX: Estado para controlar se telefone veio da URL (bloqueado para edição)
  const [telefoneBloqueado, setTelefoneBloqueado] = useState(false);

  // 🔥 FIX: Inicializar personalData com telefone da URL se presente
  const telefoneInicial = telefoneFromUrl ? formatarTelefone(telefoneFromUrl) : '';
  const [personalData, setPersonalData] = useState({
    name: '',
    email: '',
    cpf: '',
    phone: telefoneInicial,
    instagram: ''
  });
  const [addressData, setAddressData] = useState({
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: ''
  });
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, any>>({});
  const [result, setResult] = useState<any>(null);

  // Default design configuration (mirrors FormPreview.tsx)
  const defaultDesign = useMemo(() => ({
    colors: {
      titleColor: "hsl(221, 83%, 53%)",
      textColor: "hsl(222, 47%, 11%)",
      pageBackground: "linear-gradient(135deg, hsl(210, 40%, 96%), hsl(0, 0%, 100%))",
      containerBackground: "hsl(0, 0%, 100%)",
      buttonColor: "hsl(221, 83%, 53%)",
      buttonTextColor: "hsl(0, 0%, 100%)",
      progressBarColor: "hsl(221, 83%, 53%)",
      inputBackground: "hsl(210, 40%, 96%)",
      borderColor: "hsl(214, 32%, 91%)",
      // Deprecated fields
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
  }), []);

  // Function to migrate colors (mirrors FormPreview.tsx)
  const migrateColors = useCallback((oldColors: any) => {
    if (!oldColors) return defaultDesign.colors;
    return {
      titleColor: oldColors.titleColor || oldColors.primary || defaultDesign.colors.titleColor,
      textColor: oldColors.textColor || oldColors.text || defaultDesign.colors.textColor,
      pageBackground: oldColors.pageBackground ||
        `linear-gradient(135deg, ${oldColors.secondary || defaultDesign.colors.inputBackground}, ${oldColors.background || defaultDesign.colors.containerBackground})`,
      containerBackground: oldColors.containerBackground || oldColors.background || defaultDesign.colors.containerBackground,
      buttonColor: oldColors.buttonColor || oldColors.button || defaultDesign.colors.buttonColor,
      buttonTextColor: oldColors.buttonTextColor || oldColors.buttonText || defaultDesign.colors.buttonTextColor,
      progressBarColor: oldColors.progressBarColor || oldColors.progressBar || oldColors.primary || defaultDesign.colors.progressBarColor,
      inputBackground: oldColors.inputBackground || oldColors.secondary || defaultDesign.colors.inputBackground,
      borderColor: oldColors.borderColor || defaultDesign.colors.borderColor,
      primary: oldColors.primary,
      secondary: oldColors.secondary,
      background: oldColors.background,
      text: oldColors.text,
      button: oldColors.button,
      buttonText: oldColors.buttonText,
      progressBar: oldColors.progressBar
    };
  }, [defaultDesign]);

  const design = useMemo(() => {
    const baseDesign = (form?.designConfig as any) || {};
    return {
      ...defaultDesign,
      ...baseDesign,
      colors: migrateColors(baseDesign.colors),
      typography: {
        ...defaultDesign.typography,
        ...(baseDesign.typography || {})
      },
      spacing: baseDesign.spacing || defaultDesign.spacing
    };
  }, [form, defaultDesign, migrateColors]);

  const colors = design.colors;

  // Apply colors to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--form-title-color', colors.titleColor);
    root.style.setProperty('--form-text-color', colors.textColor);
    root.style.setProperty('--form-page-bg', colors.pageBackground);
    root.style.setProperty('--form-container-bg', colors.containerBackground);
    root.style.setProperty('--form-button-color', colors.buttonColor);
    root.style.setProperty('--form-button-text-color', colors.buttonTextColor);
    root.style.setProperty('--form-progress-color', colors.progressBarColor);
    root.style.setProperty('--form-input-bg', colors.inputBackground);
    root.style.setProperty('--form-border-color', colors.borderColor);

    return () => {
      root.style.removeProperty('--form-title-color');
      root.style.removeProperty('--form-text-color');
      root.style.removeProperty('--form-page-bg');
      root.style.removeProperty('--form-container-bg');
      root.style.removeProperty('--form-button-color');
      root.style.removeProperty('--form-button-text-color');
      root.style.removeProperty('--form-progress-color');
      root.style.removeProperty('--form-input-bg');
      root.style.removeProperty('--form-border-color');
    };
  }, [colors]);

  // 🔥 FIX: Formulários de validação com telefone da URL como defaultValue
  const personalForm = useForm({
    resolver: zodResolver(personalDataSchema),
    mode: "onChange",
    defaultValues: {
      name: '',
      email: '',
      cpf: '',
      phone: telefoneInicial,
      instagram: ''
    }
  });

  const addressForm = useForm({
    resolver: zodResolver(addressDataSchema),
    mode: "onChange",
    defaultValues: addressData
  });

  // 🔥 FIX: Effect para marcar telefone como bloqueado e logar
  useEffect(() => {
    if (telefoneFromUrl) {
      const formattedPhone = formatarTelefone(telefoneFromUrl);
      console.log('📱 [FormularioPublico] Telefone extraído da URL:', telefoneFromUrl, '→', formattedPhone);
      setTelefoneBloqueado(true);

      // Garantir que o valor está no react-hook-form
      personalForm.setValue('phone', formattedPhone);
      setPersonalData(prev => ({ ...prev, phone: formattedPhone }));
    }
  }, [telefoneFromUrl]);

  useEffect(() => {
    const carregarFormulario = async () => {
      const startTime = performance.now();
      console.log('⏱️ [TIMING] Início do carregamento:', new Date().toISOString());

      try {
        // Caso 1: URL com ID ou slug de formulário (/form/:id ou /empresa/form/:slug)
        if (formIdOrSlug) {
          const isFormUUID = isUUID(formIdOrSlug);

          if (isFormUUID) {
            // Se for UUID, usar endpoint padrão
            console.log('📝 Carregando formulário por UUID:', formIdOrSlug);
            const formResponse = await fetch(`/api/forms/public/${formIdOrSlug}`);
            if (!formResponse.ok) {
              throw new Error('Formulário não encontrado');
            }
            const formData = await formResponse.json();
            console.log('✅ Formulário carregado por UUID:', formData.title);
            setForm(formData);
          } else {
            // Se for slug, usar endpoint de slug
            const companySlug = companySlugParam || 'empresa';
            console.log('📝 Carregando formulário por slug:', formIdOrSlug, 'empresa:', companySlug);
            const fetchStart = performance.now();
            const formResponse = await fetch(`/api/forms/public/by-slug/${companySlug}/${formIdOrSlug}`);
            console.log(`⏱️ [TIMING] Fetch API levou: ${(performance.now() - fetchStart).toFixed(0)}ms`);

            if (!formResponse.ok) {
              // Fallback: tentar buscar por ID caso o slug não funcione
              console.log('⚠️ Slug não encontrado, tentando como ID...');
              const fallbackResponse = await fetch(`/api/forms/public/${formIdOrSlug}`);
              if (!fallbackResponse.ok) {
                throw new Error('Formulário não encontrado');
              }
              const formData = await fallbackResponse.json();
              console.log('✅ Formulário carregado por fallback ID:', formData.title);
              setForm(formData);
            } else {
              const formData = await formResponse.json();
              console.log('✅ Formulário carregado por slug:', formData.title);
              console.log(`⏱️ [TIMING] Total desde início: ${(performance.now() - startTime).toFixed(0)}ms`);
              setForm(formData);
            }
          }

          setIsLoading(false);
          return;
        }

        // Caso 2: URL com token de lead (/f/:token) - Usa endpoint otimizado
        if (token) {
          console.log('🔍 [OTIMIZADO] Carregando formulário com token:', token.substring(0, 10) + '...');

          // Endpoint otimizado que combina validação de token + busca do formulário
          const response = await fetch(`/api/forms/public/with-token/${token}`);

          if (!response.ok) {
            throw new Error('Erro ao validar token');
          }

          const data = await response.json();
          console.log('📋 [OTIMIZADO] Resposta combinada:', data.valid ? 'válido' : 'inválido');

          if (!data.valid) {
            setError(data.erro || 'Token inválido');
            setIsLoading(false);
            return;
          }

          // Dados já vêm combinados do endpoint otimizado
          setSessao(data.data.sessao);

          if (data.data.form) {
            console.log('📝 [OTIMIZADO] Formulário:', data.data.form.title);
            setForm(data.data.form);
          }

          // Preencher telefone se disponível nos dados do lead
          if (data.data.lead?.telefone) {
            const formattedPhone = formatarTelefone(data.data.lead.telefone);
            console.log('📱 [OTIMIZADO] Telefone do lead:', formattedPhone);
            personalForm.setValue('phone', formattedPhone);
            setPersonalData(prev => ({ ...prev, phone: formattedPhone }));
            setTelefoneBloqueado(true);
          }

          // Preencher nome se disponível
          if (data.data.lead?.nome) {
            personalForm.setValue('name', data.data.lead.nome);
            setPersonalData(prev => ({ ...prev, name: data.data.lead.nome }));
          }

          setIsLoading(false);
          return;
        }

        // Caso 3: Nenhum parâmetro fornecido
        setError("Formulário não encontrado");
        setIsLoading(false);
      } catch (error: any) {
        console.error('❌ Erro ao carregar formulário:', error);
        setError(error.message || 'Erro ao carregar formulário');
        setIsLoading(false);
      }
    };

    carregarFormulario();
  }, [token, formIdOrSlug, companySlugParam]);

  const registrarInicio = useCallback(async () => {
    if (hasStarted || !token) return;

    try {
      console.log('⏳ Registrando INÍCIO do preenchimento...');
      await fetch('/api/leads/registrar-inicio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, campoInicial: 'welcomePage', valor: 'iniciado' })
      });
      setHasStarted(true);
    } catch (error) {
      console.error('❌ Erro ao registrar início:', error);
    }
  }, [hasStarted, token]);

  const atualizarProgresso = useCallback(async (camposPreenchidos: Record<string, any>) => {
    if (!token || !form) return;

    try {
      const pages = groupQuestionsByPages(form);
      const questionCount = pages.reduce((acc, p) => acc + p.questions.length, 0);
      const totalCampos = 2 + 7 + questionCount; // personal (2) + address (7) + questions
      const camposCount = Object.keys(camposPreenchidos).length;
      const progresso = Math.round((camposCount / totalCampos) * 100);

      console.log(`📊 Atualizando progresso: ${camposCount}/${totalCampos} campos (${progresso}%)`);

      await fetch('/api/leads/atualizar-progresso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          camposPreenchidos,
          totalCampos
        })
      });
    } catch (error) {
      console.error('❌ Erro ao atualizar progresso:', error);
    }
  }, [token, form]);

  useEffect(() => {
    const camposPreenchidos: Record<string, any> = {
      ...questionAnswers,
      ...personalData,
      ...addressData
    };

    if (Object.keys(camposPreenchidos).length > 0 && form) {
      const timeoutId = setTimeout(() => {
        atualizarProgresso(camposPreenchidos);
      }, 3000); // Aumentado de 1s para 3s para reduzir requests

      return () => clearTimeout(timeoutId);
    }
  }, [questionAnswers, personalData, addressData, form, atualizarProgresso]);

  const handleNext = async () => {
    if (currentStep === 1) {
      const isValid = await personalForm.trigger();
      if (!isValid) {
        toast.error("Por favor, preencha todos os campos obrigatórios corretamente");
        return;
      }
      setPersonalData(personalForm.getValues());
    } else if (currentStep === 2) {
      const isValid = await addressForm.trigger();
      if (!isValid) {
        toast.error("Por favor, preencha todos os campos de endereço corretamente");
        return;
      }
      setAddressData(addressForm.getValues());

      // Se não há páginas de perguntas, submeter diretamente
      if (questionPages.length === 0) {
        await handleSubmit();
        return;
      }
    } else if (currentStep >= 3 && form) {
      const pageIndex = currentStep - 3;
      const currentPage = questionPages[pageIndex];

      if (currentPage) {
        const unansweredRequired = currentPage.questions.filter(
          (q: any) => q.required && (!questionAnswers[q.id] || !questionAnswers[q.id].answer?.toString().trim())
        );

        if (unansweredRequired.length > 0) {
          toast.error(`Por favor, responda todas as perguntas obrigatórias: "${unansweredRequired[0].text}"`);
          return;
        }
      }
    }

    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const validateCurrentPage = (): boolean => {
    if (currentStep >= 3 && form) {
      const pageIndex = currentStep - 3;
      const currentPage = questionPages[pageIndex];

      if (currentPage) {
        const unansweredRequired = currentPage.questions.filter(
          (q: any) => q.required && (!questionAnswers[q.id] || !questionAnswers[q.id].answer?.toString().trim())
        );

        if (unansweredRequired.length > 0) {
          toast.error(`Por favor, responda todas as perguntas obrigatórias: "${unansweredRequired[0].text}"`);
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmitWithValidation = async () => {
    if (!validateCurrentPage()) {
      return;
    }
    await handleSubmit();
  };

  const handleStartWizard = () => {
    registrarInicio();
    setCurrentStep(1);
  };

  const handleAnswer = (questionId: string, answer: string, points: number, questionText?: string) => {
    const pages = form ? groupQuestionsByPages(form) : [];
    const question = pages.flatMap(p => p.questions).find(q => q.id === questionId);
    setQuestionAnswers(prev => ({
      ...prev,
      [questionId]: {
        questionId,
        answer,
        points,
        questionText: questionText || question?.text || `Pergunta ${questionId}`
      }
    }));
  };

  const handleSubmit = async () => {
    if (!form) return;

    // Validar ambos os formulários antes de submeter
    const isPersonalValid = await personalForm.trigger();
    const isAddressValid = await addressForm.trigger();

    if (!isPersonalValid) {
      toast.error("Por favor, verifique os dados pessoais");
      return;
    }

    if (!isAddressValid) {
      toast.error("Por favor, verifique os dados de endereço");
      return;
    }

    setIsSubmitting(true);

    try {
      const finalPersonalData = personalForm.getValues();
      const finalAddressData = addressForm.getValues();

      const answerArray = Object.values(questionAnswers);
      const totalScore = answerArray.reduce((sum: number, ans: any) => sum + (ans.points || 0), 0);

      const passingScore = form.passingScore || 0;
      const passed = totalScore >= passingScore;

      console.log(`📝 Submetendo formulário: ${totalScore} pontos - ${passed ? 'APROVADO' : 'REPROVADO'}`);
      console.log('📋 Dados pessoais:', finalPersonalData);
      console.log('📍 Dados de endereço:', finalAddressData);

      const respostasObj: Record<string, any> = {};
      answerArray.forEach((ans: any) => {
        respostasObj[ans.questionId] = ans.answer;
      });

      // Se tem token, finaliza via lead (rastreamento)
      let qualificacao = null;
      if (token) {
        const finalizarResponse = await fetch('/api/leads/finalizar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            respostas: respostasObj,
            formularioId: form.id
          })
        });

        if (finalizarResponse.ok) {
          const finalizarData = await finalizarResponse.json();
          console.log('✅ Lead finalizado:', finalizarData);
          qualificacao = finalizarData.qualificacao;
        }
      }

      // Salva submission (sempre)
      const submissionResponse = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: form.id,
          answers: answerArray,
          totalScore,
          passed,
          contactName: finalPersonalData.name,
          contactEmail: finalPersonalData.email,
          contactCpf: finalPersonalData.cpf,
          contactPhone: finalPersonalData.phone || null,
          instagramHandle: finalPersonalData.instagram || null,
          addressCep: finalAddressData.cep,
          addressStreet: finalAddressData.street,
          addressNumber: finalAddressData.number,
          addressComplement: finalAddressData.complement || null,
          addressNeighborhood: finalAddressData.neighborhood,
          addressCity: finalAddressData.city,
          addressState: finalAddressData.state,
        })
      });

      if (!submissionResponse.ok) {
        throw new Error('Erro ao criar submission');
      }

      const submission = await submissionResponse.json();

      setResult({
        answers: answerArray,
        totalScore,
        passed,
        qualificacao
      });

      const totalSteps = 3 + questionPages.length + 1;
      setCurrentStep(totalSteps - 1);
      toast.success("Formulário enviado com sucesso!");
    } catch (error: any) {
      console.error('❌ Erro ao enviar formulário:', error);
      toast.error(error.message || "Erro ao enviar formulário");
    } finally {
      setIsSubmitting(false);
    }
  };

  const questionPages = useMemo(() => form ? groupQuestionsByPages(form) : [], [form]);
  const allQuestions = useMemo(() => questionPages.flatMap(p => p.questions), [questionPages]);

  const colors = design.colors;
  const totalSteps = 1 + 1 + 1 + questionPages.length + 1; // welcome + personal + address + pages de perguntas + completion
  const progress = currentStep === 0 ? 0 : Math.min(100, Math.round(((currentStep) / (totalSteps - 1)) * 100));

  const welcomeConfig = useMemo(() => {
    if (!form) return { title: "Bem-vindo!", description: "Por favor, preencha o formulário a seguir.", imageUrl: null, buttonText: "Começar", titleSize: "2xl", logoAlign: "center" };

    const config = ((form as any).welcomePageConfig) || (form.welcomeConfig as any) || {};
    const elements = (form.questions as any[] | null) || (form.elements as any[] | null) || [];

    const heading = elements.find((el: any) => el.type === 'heading' && el.level === 1);
    const text = elements.find((el: any) => el.type === 'text');

    const title = config.title || heading?.text || form.title || "Bem-vindo!";
    const description = config.description || text?.content || form.description || "Por favor, preencha o formulário a seguir.";

    // 🎨 LOGO: Buscar primeiro do design.logo (igual Assinatura), depois fallback para welcomeConfig
    const imageUrl = design.logo || config.logo || config.imageUrl || (form.welcomeConfig as any)?.imageUrl || null;
    const buttonText = config.buttonText || "Começar";

    return {
      title,
      description,
      imageUrl,
      buttonText,
      titleSize: config.titleSize || "2xl",
      logoAlign: config.logoAlign || "center"
    };
  }, [form, design.logo]);

  // ✅ OTIMIZAÇÃO: Mostrar skeleton ultra-leve quando carregando
  if (!form) {
    // Se há erro, mostra mensagem de erro
    if (error) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #ffffff, #f8fafc)' }}>
          <Card className="p-8 text-center max-w-md" style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
            <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: '#ef4444' }} />
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#1e293b' }}>Erro ao carregar formulário</h2>
            <p style={{ color: '#64748b' }}>{error}</p>
          </Card>
        </div>
      );
    }

    // Senão, mostrar skeleton super-leve (sem Loader2, sem imports pesados)
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(to bottom right, #ffffff, #f8fafc)' }}>
        <div className="w-full max-w-2xl">
          {/* Skeleton skeleton card */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '32px' }}>
            {/* Skeleton loading animation - pure CSS, ultra-leve */}
            <div style={{
              height: '40px',
              backgroundColor: '#f1f5f9',
              borderRadius: '6px',
              marginBottom: '24px',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }} />
            <div style={{
              height: '24px',
              backgroundColor: '#f1f5f9',
              borderRadius: '6px',
              marginBottom: '32px',
              width: '80%',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }} />
            <div style={{
              height: '40px',
              backgroundColor: '#f1f5f9',
              borderRadius: '6px',
              marginBottom: '16px',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }} />
            <div style={{
              height: '40px',
              backgroundColor: '#f1f5f9',
              borderRadius: '6px',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }} />
          </div>
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // PÁGINA DE BOAS-VINDAS (Step 0)
  if (currentStep === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: colors.pageBackground }}>
        <Card className="w-full max-w-2xl shadow-xl" style={{ backgroundColor: colors.containerBackground, borderColor: colors.borderColor }}>
          <CardHeader className="text-center pb-8">
            {welcomeConfig.imageUrl && (
              <div className="mb-6">
                <img src={welcomeConfig.imageUrl} alt="Welcome" className="max-w-xs mx-auto rounded-lg" />
              </div>
            )}
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
              {welcomeConfig.buttonText}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // PÁGINA DE DADOS PESSOAIS (Step 1)
  if (currentStep === 1) {
    return (
      <div className="min-h-screen p-4" style={{ background: colors.pageBackground }}>
        <div className="max-w-3xl mx-auto pt-8">
          <div className="mb-6">
            <div className="h-2 rounded-full overflow-hidden mb-2" style={{ backgroundColor: colors.inputBackground }}>
              <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: colors.progressBarColor }} />
            </div>
            <p className="text-sm text-right" style={{ color: colors.textColor }}>{progress}% completo</p>
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
                  {...personalForm.register("name")}
                  placeholder="Digite seu nome"
                  className="mt-1"
                  style={{ backgroundColor: colors.inputBackground, borderColor: colors.borderColor, color: colors.textColor }}
                />
                {personalForm.formState.errors.name && (
                  <p className="text-sm mt-1" style={{ color: '#ef4444' }}>
                    {personalForm.formState.errors.name.message as string}
                  </p>
                )}
              </div>
              <div>
                <Label style={{ color: colors.textColor }}>Email *</Label>
                <Input
                  type="email"
                  {...personalForm.register("email")}
                  placeholder="seu@email.com"
                  className="mt-1"
                  style={{ backgroundColor: colors.inputBackground, borderColor: colors.borderColor, color: colors.textColor }}
                />
                {personalForm.formState.errors.email && (
                  <p className="text-sm mt-1" style={{ color: '#ef4444' }}>
                    {personalForm.formState.errors.email.message as string}
                  </p>
                )}
              </div>
              <div>
                <Label style={{ color: colors.textColor }}>CPF *</Label>
                <Input
                  {...personalForm.register("cpf")}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="mt-1"
                  style={{ backgroundColor: colors.inputBackground, borderColor: colors.borderColor, color: colors.textColor }}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    const formatted = value
                      .replace(/(\d{3})(\d)/, '$1.$2')
                      .replace(/(\d{3})(\d)/, '$1.$2')
                      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                    personalForm.setValue('cpf', formatted);
                  }}
                />
                {personalForm.formState.errors.cpf && (
                  <p className="text-sm mt-1" style={{ color: '#ef4444' }}>
                    {personalForm.formState.errors.cpf.message as string}
                  </p>
                )}
              </div>
              <div>
                <Label style={{ color: colors.textColor }}>
                  Telefone (WhatsApp) *
                  {telefoneBloqueado && (
                    <span className="ml-2 text-xs" style={{ color: '#22c55e' }}>
                      ✓ WhatsApp verificado
                    </span>
                  )}
                </Label>
                <Input
                  type="tel"
                  {...personalForm.register("phone")}
                  placeholder="(00) 00000-0000"
                  className="mt-1"
                  readOnly={telefoneBloqueado}
                  style={{
                    backgroundColor: colors.inputBackground,
                    borderColor: telefoneBloqueado ? '#22c55e' : colors.borderColor,
                    color: colors.textColor,
                    cursor: telefoneBloqueado ? 'not-allowed' : 'text',
                    borderWidth: telefoneBloqueado ? '2px' : '1px'
                  }}
                />
              </div>
              <div>
                <Label style={{ color: colors.textColor }}>Instagram</Label>
                <Input
                  {...personalForm.register("instagram")}
                  placeholder="@seuinstagram"
                  className="mt-1"
                  style={{ backgroundColor: colors.inputBackground, borderColor: colors.borderColor, color: colors.textColor }}
                  onChange={(e) => {
                    let value = e.target.value;
                    if (value && !value.startsWith('@')) {
                      value = '@' + value;
                    }
                    personalForm.setValue('instagram', value);
                  }}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleNext} style={{ backgroundColor: colors.buttonColor, color: colors.buttonTextColor }}>
                Próximo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // PÁGINA DE ENDEREÇO (Step 2)
  if (currentStep === 2) {
    return (
      <div className="min-h-screen p-4" style={{ background: colors.pageBackground }}>
        <div className="max-w-3xl mx-auto pt-8">
          <div className="mb-6">
            <div className="h-2 rounded-full overflow-hidden mb-2" style={{ backgroundColor: colors.inputBackground }}>
              <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: colors.progressBarColor }} />
            </div>
            <p className="text-sm text-right" style={{ color: colors.textColor }}>{progress}% completo</p>
          </div>

          <Card className="shadow-lg" style={{ backgroundColor: colors.containerBackground, borderColor: colors.borderColor }}>
            <CardHeader>
              <CardTitle className="text-2xl" style={{ color: colors.textColor }}>Dados de Endereço</CardTitle>
              <CardDescription style={{ color: colors.textColor, opacity: 0.8 }}>Preencha seu endereço completo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <Label style={{ color: colors.textColor }}>CEP *</Label>
                  <Input
                    {...addressForm.register("cep")}
                    placeholder="00000-000"
                    maxLength={9}
                    className="mt-1"
                    style={{ backgroundColor: colors.inputBackground, borderColor: colors.borderColor, color: colors.textColor }}
                  />
                  {addressForm.formState.errors.cep && (
                    <p className="text-sm mt-1" style={{ color: '#ef4444' }}>
                      {addressForm.formState.errors.cep.message as string}
                    </p>
                  )}
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label style={{ color: colors.textColor }}>Estado *</Label>
                  <Input
                    {...addressForm.register("state")}
                    placeholder="SP"
                    maxLength={2}
                    className="mt-1 uppercase"
                    style={{ backgroundColor: colors.inputBackground, borderColor: colors.borderColor, color: colors.textColor }}
                  />
                  {addressForm.formState.errors.state && (
                    <p className="text-sm mt-1" style={{ color: '#ef4444' }}>
                      {addressForm.formState.errors.state.message as string}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label style={{ color: colors.textColor }}>Rua *</Label>
                <Input
                  {...addressForm.register("street")}
                  placeholder="Nome da rua"
                  className="mt-1"
                  style={{ backgroundColor: colors.inputBackground, borderColor: colors.borderColor, color: colors.textColor }}
                />
                {addressForm.formState.errors.street && (
                  <p className="text-sm mt-1" style={{ color: '#ef4444' }}>
                    {addressForm.formState.errors.street.message as string}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label style={{ color: colors.textColor }}>Número *</Label>
                  <Input
                    {...addressForm.register("number")}
                    placeholder="123"
                    className="mt-1"
                    style={{ backgroundColor: colors.inputBackground, borderColor: colors.borderColor, color: colors.textColor }}
                  />
                  {addressForm.formState.errors.number && (
                    <p className="text-sm mt-1" style={{ color: '#ef4444' }}>
                      {addressForm.formState.errors.number.message as string}
                    </p>
                  )}
                </div>
                <div className="col-span-2">
                  <Label style={{ color: colors.textColor }}>Complemento</Label>
                  <Input
                    {...addressForm.register("complement")}
                    placeholder="Apto, bloco, etc."
                    className="mt-1"
                    style={{ backgroundColor: colors.inputBackground, borderColor: colors.borderColor, color: colors.textColor }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label style={{ color: colors.textColor }}>Bairro *</Label>
                  <Input
                    {...addressForm.register("neighborhood")}
                    placeholder="Nome do bairro"
                    className="mt-1"
                    style={{ backgroundColor: colors.inputBackground, borderColor: colors.borderColor, color: colors.textColor }}
                  />
                  {addressForm.formState.errors.neighborhood && (
                    <p className="text-sm mt-1" style={{ color: '#ef4444' }}>
                      {addressForm.formState.errors.neighborhood.message as string}
                    </p>
                  )}
                </div>
                <div>
                  <Label style={{ color: colors.textColor }}>Cidade *</Label>
                  <Input
                    {...addressForm.register("city")}
                    placeholder="Nome da cidade"
                    className="mt-1"
                    style={{ backgroundColor: colors.inputBackground, borderColor: colors.borderColor, color: colors.textColor }}
                  />
                  {addressForm.formState.errors.city && (
                    <p className="text-sm mt-1" style={{ color: '#ef4444' }}>
                      {addressForm.formState.errors.city.message as string}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleNext} style={{ backgroundColor: colors.buttonColor, color: colors.buttonTextColor }}>
                Próximo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // PÁGINAS DE PERGUNTAS - TODAS AS PERGUNTAS DA PÁGINA EM UMA TELA (Steps 3 a 3+questionPages.length-1)
  if (currentStep >= 3 && currentStep < 3 + questionPages.length) {
    const pageIndex = currentStep - 3;
    const currentPage = questionPages[pageIndex];
    const isLastPage = pageIndex === questionPages.length - 1;
    const pageQuestions = currentPage?.questions || [];
    const totalSteps = 3 + questionPages.length + 1;
    const progress = Math.round(((currentStep) / (totalSteps - 1)) * 100);

    if (!currentPage || pageQuestions.length === 0) return null;

    const renderQuestionInput = (question: any, questionIndexInPage: number) => {
      const qType = question.questionType || question.type || '';
      const isMultipleChoice = qType === 'multiple-choice' && question.options && question.options.length > 0;
      const isLongText = qType === 'long-text';

      return (
        <div key={question.id} className="space-y-4 p-4 rounded-lg border" style={{ backgroundColor: colors.inputBackground, borderColor: `${colors.primary}30` }}>
          <div className="flex items-start gap-3">
            <span
              className="font-semibold px-3 py-1 rounded-full text-sm shrink-0"
              style={{
                backgroundColor: `${colors.primary}20`,
                color: colors.titleColor
              }}
            >
              {questionIndexInPage + 1}
            </span>
            <div className="flex-1">
              <h3 className="text-lg font-medium mb-4" style={{ color: colors.text }}>
                {question.text}
              </h3>

              {isMultipleChoice ? (
                <RadioGroup
                  value={questionAnswers[question.id]?.answer}
                  onValueChange={(value) => {
                    const option = question.options.find((opt: any) => opt.text === value);
                    if (option) {
                      handleAnswer(question.id, value, option.points || 0, question.text);
                    }
                  }}
                  className="space-y-3"
                >
                  {question.options.map((option: any, optIndex: number) => (
                    <div
                      key={optIndex}
                      className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-accent transition-colors cursor-pointer"
                      style={{ backgroundColor: colors.inputBackground, borderColor: `${colors.primary}30` }}
                    >
                      <RadioGroupItem value={option.text} id={`${question.id}-${optIndex}`} />
                      <Label htmlFor={`${question.id}-${optIndex}`} className="font-normal cursor-pointer flex-1" style={{ color: colors.text }}>
                        {option.text}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : isLongText ? (
                <Textarea
                  value={questionAnswers[question.id]?.answer || ""}
                  onChange={(e) => handleAnswer(question.id, e.target.value, question.points || 0, question.text)}
                  placeholder="Digite sua resposta"
                  rows={4}
                  className="text-base"
                  style={{ backgroundColor: colors.inputBackground, borderColor: `${colors.primary}30`, color: colors.text }}
                />
              ) : (
                <Input
                  value={questionAnswers[question.id]?.answer || ""}
                  onChange={(e) => handleAnswer(question.id, e.target.value, question.points || 0, question.text)}
                  placeholder="Digite sua resposta"
                  className="text-base"
                  style={{ backgroundColor: colors.inputBackground, borderColor: `${colors.primary}30`, color: colors.text }}
                />
              )}
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="min-h-screen p-4" style={{ background: colors.pageBackground }}>
        <div className="max-w-3xl mx-auto pt-8">
          <div className="mb-6">
            <div className="h-2 rounded-full overflow-hidden mb-2" style={{ backgroundColor: colors.inputBackground }}>
              <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: colors.progressBarColor }} />
            </div>
            <p className="text-sm text-right" style={{ color: colors.textColor }}>{progress}% completo</p>
          </div>

          <Card className="shadow-lg" style={{ backgroundColor: colors.containerBackground, borderColor: colors.borderColor }}>
            <CardContent className="space-y-6 pt-6">
              {pageQuestions.map((question: any, idx: number) => renderQuestionInput(question, idx))}
            </CardContent>
            <CardFooter className="flex justify-end">
              {isLastPage ? (
                <Button
                  onClick={handleSubmitWithValidation}
                  disabled={isSubmitting}
                  style={{ backgroundColor: colors.buttonColor, color: colors.buttonTextColor }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar Formulário
                    </>
                  )}
                </Button>
              ) : (
                <Button onClick={handleNext} style={{ backgroundColor: colors.buttonColor, color: colors.buttonTextColor }}>
                  Próximo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // PÁGINA DE CONCLUSÃO (Step final)
  // Mostrar loader enquanto está submetendo
  if (isSubmitting) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: `linear-gradient(to bottom right, ${colors.background}, ${colors.secondary})` }}>
        <Card className="w-full max-w-2xl p-8 text-center shadow-xl" style={{ backgroundColor: colors.containerBackground, borderColor: `${colors.primary}30` }}>
          <Loader2 className="h-16 w-16 animate-spin mx-auto mb-6" style={{ color: colors.titleColor }} />
          <h2 className="text-2xl font-bold mb-4" style={{ color: colors.text }}>
            Enviando formulário...
          </h2>
          <p style={{ color: `${colors.text}99` }}>
            Por favor, aguarde enquanto processamos suas informações.
          </p>
        </Card>
      </div>
    );
  }

  // Renderizar tela de conclusão APENAS se result existir
  if (result) {
    // Get completion page configuration from form
    const completionConfig = (form.completionPageConfig as any) || {
      title: "Agradecemos sua resposta!",
      subtitle: "",
      message: "Obrigado por preencher o formulário. Nossa equipe já está analisando e em breve você receberá a mensagem no seu WhatsApp.",
      logo: null,
      logoAlign: "center",
      design: {
        colors: {
          primary: colors.titleColor,
          secondary: colors.inputBackground,
          background: colors.containerBackground,
          text: colors.textColor,
          icon: "hsl(221, 83%, 53%)"
        },
        typography: {
          fontFamily: design.typography.fontFamily,
          titleSize: "3xl",
          textSize: "base"
        },
        spacing: "comfortable"
      }
    };

    // Use completion page design if available, otherwise fall back to form design
    const completionDesign = completionConfig.design || {};
    const completionColors = completionDesign.colors || {};
    const completionTypography = completionDesign.typography || design.typography;

    // Determine colors with fallback chain: completionConfig.design.colors > form.designConfig.colors > defaults
    // 6 VARIAÇÕES DE CORES:
    const titleColor = completionColors.primary || colors.titleColor || "hsl(221, 83%, 53%)"; // 1. Cor do Título
    const textColor = completionColors.text || colors.textColor || "hsl(222, 47%, 11%)"; // 2. Cor do Texto
    const bgColor = completionColors.background || colors.containerBackground || "hsl(0, 0%, 100%)"; // 3. Fundo do Container
    const pageBg = colors.pageBackground || `linear-gradient(to bottom right, ${colors.background}, ${colors.secondary})`; // 4. Fundo da Página
    const buttonColor = colors.buttonColor || "hsl(221, 83%, 53%)"; // 5. Cor do Botão
    const buttonTextColor = colors.buttonTextColor || "hsl(0, 0%, 100%)"; // 6. Cor do Texto do Botão
    const iconColor = completionColors.icon || completionColors.primary || titleColor;

    // Get messages - usando campo único "message" em vez de successMessage/failureMessage
    const displayTitle = completionConfig.title || "Agradecemos sua resposta!";
    const displaySubtitle = completionConfig.subtitle || "";
    const displayMessage = completionConfig.message ||
      completionConfig.successMessage ||
      "Obrigado por preencher o formulário. Nossa equipe já está analisando e em breve você receberá a mensagem no seu WhatsApp.";
    const additionalText = completionConfig.additionalThankYouText || "";

    // Get logo configuration - buscar primeiro do design.logo (igual Assinatura)
    const completionLogo = design.logo || completionConfig.logo || completionDesign.logo || null;
    const logoAlign = completionConfig.logoAlign || completionDesign.logoAlign || "center";

    // Title size mapping
    const titleSizeMap: Record<string, string> = {
      'xs': 'text-xs',
      'sm': 'text-sm',
      'base': 'text-base',
      'lg': 'text-lg',
      'xl': 'text-xl',
      '2xl': 'text-2xl',
      '3xl': 'text-3xl',
      '4xl': 'text-4xl'
    };
    const titleSizeClass = titleSizeMap[completionTypography.titleSize] || 'text-3xl';

    // Logo alignment classes
    const logoAlignClass = logoAlign === 'left' ? 'justify-start' : logoAlign === 'right' ? 'justify-end' : 'justify-center';

    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: pageBg }}>
        <Card className="w-full max-w-2xl p-8 text-center shadow-xl" style={{ backgroundColor: bgColor, borderColor: `${titleColor}30` }}>
          {/* Logo */}
          {completionLogo && (
            <div className={`flex ${logoAlignClass} mb-6`}>
              <img src={completionLogo} alt="Logo" className="h-16 object-contain" />
            </div>
          )}

          {/* Icon Genérico - sem diferenciar sucesso/falha */}
          <CheckCircle2 className="h-20 w-20 mx-auto mb-6" style={{ color: iconColor }} />

          {/* Title */}
          <h2 className={`${titleSizeClass} font-bold mb-2`} style={{ color: titleColor, fontFamily: completionTypography.fontFamily }}>
            {displayTitle}
          </h2>

          {/* Subtitle */}
          {displaySubtitle && (
            <p className="text-lg mb-4" style={{ color: `${textColor}90`, fontFamily: completionTypography.fontFamily }}>
              {displaySubtitle}
            </p>
          )}

          {/* Main Message - SEMPRE a mesma mensagem genérica */}
          <p className="text-xl mb-6" style={{ color: `${textColor}99`, fontFamily: completionTypography.fontFamily }}>
            {displayMessage}
          </p>

          {/* Additional Thank You Text */}
          {additionalText && (
            <p className="text-base mb-6" style={{ color: `${textColor}90`, fontFamily: completionTypography.fontFamily }}>
              {additionalText}
            </p>
          )}

          {/* CTA Button */}
          {completionConfig.ctaText && completionConfig.ctaUrl && (
            <div className="mb-6">
              <a href={completionConfig.ctaUrl} target="_blank" rel="noopener noreferrer">
                <Button size="lg" style={{ backgroundColor: buttonColor, color: buttonTextColor }}>
                  {completionConfig.ctaText}
                </Button>
              </a>
            </div>
          )}

          {/* Custom Content */}
          {completionConfig.customContent && (
            <div
              className="mt-6 text-sm"
              style={{ color: textColor }}
              dangerouslySetInnerHTML={{ __html: completionConfig.customContent }}
            />
          )}

          {/* Footer Text */}
          <div className="text-sm mt-6" style={{ color: `${textColor}80` }}>
            <p>Seus dados foram salvos com sucesso.</p>
            <p>Em breve você receberá um retorno pelo WhatsApp.</p>
          </div>
        </Card>
      </div>
    );
  }

  return null;
};

export default FormularioPublico;
