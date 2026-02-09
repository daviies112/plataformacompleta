import { useState, useEffect, useCallback, useMemo } from "react";
import { FormAnswer, FormSubmission, ScoreTier } from "../types/form";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Label } from "../components/ui/label";
import { Send, CheckCircle2, XCircle, Loader2, Award, Clock, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useParams } from "wouter";
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

/**
 * Formulário Público com TRACKING REAL
 * Este formulário registra TODAS as ações do lead em tempo real
 */
const TrackedPublicForm = () => {
  const params = useParams();
  const token = params.token;
  
  // Estados
  const [form, setForm] = useState<Form | null>(null);
  const [sessao, setSessao] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, FormAnswer>>({});
  const [result, setResult] = useState<FormSubmission | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [telefoneOriginal, setTelefoneOriginal] = useState(""); // Telefone do WhatsApp (bloqueado)
  const [hasStarted, setHasStarted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  // Carrega sessão e formulário
  useEffect(() => {
    if (!token) return;

    const loadFormData = async () => {
      try {
        console.log('📋 Carregando sessão do formulário...', token);
        
        // 1. VALIDAR TOKEN E REGISTRAR ABERTURA (tudo em uma call)
        const validationResponse = await fetch('/api/leads/validar-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        
        if (!validationResponse.ok) {
          throw new Error('Token inválido ou expirado');
        }
        
        const validationData = await validationResponse.json();
        
        if (!validationData.valid) {
          throw new Error(validationData.erro || 'Token inválido');
        }
        
        const { lead, sessao, dadosPreenchidos } = validationData.data;
        
        console.log('✅ Token validado com sucesso!');
        console.log('📋 Dados pré-preenchidos:', dadosPreenchidos);
        
        setSessao(sessao);
        
        // 2. PRÉ-PREENCHER dados do WhatsApp
        if (dadosPreenchidos) {
          if (dadosPreenchidos.telefone) {
            setTelefoneOriginal(dadosPreenchidos.telefone);
            setContactPhone(dadosPreenchidos.telefone);
            console.log('📱 Telefone pré-preenchido do WhatsApp:', dadosPreenchidos.telefone);
          }
          if (dadosPreenchidos.nome) {
            setContactName(dadosPreenchidos.nome);
          }
          if (dadosPreenchidos.email) {
            setContactEmail(dadosPreenchidos.email);
          }
        }
        
        // 3. Buscar formulário
        if (lead?.formularioId) {
          const formResponse = await fetch(`/api/forms/${lead.formularioId}`);
          if (formResponse.ok) {
            const formData = await formResponse.json();
            setForm(formData);
          }
        }
        
        setIsLoading(false);
      } catch (error: any) {
        console.error('❌ Erro ao carregar formulário:', error);
        toast.error(error.message || 'Erro ao carregar formulário');
        setIsLoading(false);
      }
    };

    loadFormData();
  }, [token]);

  // REGISTRAR INÍCIO quando preenche primeiro campo
  const registrarInicio = useCallback(async () => {
    if (hasStarted || !token) return;
    
    try {
      console.log('⏳ Registrando INÍCIO do preenchimento...');
      await fetch('/api/leads/registrar-inicio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      setHasStarted(true);
    } catch (error) {
      console.error('❌ Erro ao registrar início:', error);
    }
  }, [hasStarted, token]);

  // ATUALIZAR PROGRESSO em tempo real (usa form.elements quando disponível)
  const atualizarProgresso = useCallback(async (camposPreenchidos: Record<string, any>) => {
    if (!token || !form) return;

    try {
      // Usa form.elements para contar perguntas quando disponível
      const elements = form.elements as any[] | null;
      let questionCount = 0;
      if (elements && elements.length > 0) {
        questionCount = elements.filter(el => el.type === 'question').length;
      } else {
        questionCount = (form.questions as any[] || []).length;
      }
      const totalCampos = questionCount + 2; // +2 para nome e email
      
      console.log(`📊 Atualizando progresso: ${Object.keys(camposPreenchidos).length}/${totalCampos} campos`);
      
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

  // Handler para responder pergunta
  const handleAnswer = (questionId: string, answer: string, points: number) => {
    const newAnswers = {
      ...answers,
      [questionId]: { questionId, answer, points }
    };
    setAnswers(newAnswers);

    // Registra início se for a primeira resposta
    if (Object.keys(answers).length === 0) {
      registrarInicio();
    }

    // Atualiza progresso
    const camposPreenchidos: Record<string, any> = { ...newAnswers };
    if (contactName) camposPreenchidos.contactName = contactName;
    if (contactEmail) camposPreenchidos.contactEmail = contactEmail;
    
    atualizarProgresso(camposPreenchidos);
  };

  // Handler para mudar nome
  const handleNameChange = (value: string) => {
    setContactName(value);
    
    if (value && !hasStarted) {
      registrarInicio();
    }

    // Atualiza progresso
    const camposPreenchidos: Record<string, any> = { ...answers, contactName: value };
    if (contactEmail) camposPreenchidos.contactEmail = contactEmail;
    atualizarProgresso(camposPreenchidos);
  };

  // Handler para mudar email
  const handleEmailChange = (value: string) => {
    setContactEmail(value);
    
    if (value && !hasStarted) {
      registrarInicio();
    }

    // Atualiza progresso
    const camposPreenchidos: Record<string, any> = { ...answers, contactEmail: value };
    if (contactName) camposPreenchidos.contactName = contactName;
    atualizarProgresso(camposPreenchidos);
  };

  // Submeter formulário
  const handleSubmit = async () => {
    if (!form || !token) return;
    
    if (!contactName || !contactEmail) {
      toast.error("Por favor, preencha seu nome e email");
      return;
    }

    setIsSubmitting(true);

    try {
      const answerArray = Object.values(answers);
      const totalScore = answerArray.reduce((sum, ans) => sum + ans.points, 0);
      
      const passingScore = form.passingScore || 0;
      let passed = totalScore >= passingScore;
      
      const scoreTiers = form.scoreTiers as ScoreTier[] | undefined;
      if (scoreTiers && scoreTiers.length > 0) {
        const tier = scoreTiers.find(
          t => totalScore >= t.minScore && totalScore <= t.maxScore
        );
        passed = tier?.qualifies || false;
      }

      console.log(`📝 Submetendo formulário: ${totalScore} pontos - ${passed ? 'APROVADO' : 'REPROVADO'}`);

      // 1. Criar submission normal
      const submissionResponse = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: form.id,
          answers: answerArray,
          totalScore,
          passed,
          contactName,
          contactEmail,
          contactPhone: telefoneOriginal || contactPhone || null // FORÇA telefone original
        })
      });

      if (!submissionResponse.ok) {
        throw new Error('Erro ao enviar formulário');
      }

      const submission = await submissionResponse.json();

      // 2. REGISTRAR CONCLUSÃO com tracking (usando telefone original do WhatsApp)
      console.log('✅ Registrando CONCLUSÃO do formulário...');
      console.log('📱 Telefone usado na submissão:', telefoneOriginal || contactPhone);
      await fetch('/api/leads/registrar-conclusao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          submissionId: submission.id,
          pontuacao: totalScore,
          passou: passed,
          telefone: telefoneOriginal || contactPhone // FORÇA telefone original do WhatsApp
        })
      });

      // Mostra resultado
      setResult({
        answers: answerArray,
        totalScore,
        passed,
      });
      
      toast.success("Formulário enviado com sucesso!");
    } catch (error: any) {
      console.error('❌ Erro ao enviar formulário:', error);
      toast.error(error.message || "Erro ao enviar formulário");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, hsl(0, 0%, 100%), hsl(210, 40%, 96%))' }}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: 'hsl(221, 83%, 53%)' }} />
          <p style={{ color: 'hsl(222, 47%, 11%)' }}>Carregando formulário...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!form || !sessao) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, hsl(0, 0%, 100%), hsl(210, 40%, 96%))' }}>
        <Card className="p-8 text-center max-w-md" style={{ backgroundColor: 'hsl(0, 0%, 100%)' }}>
          <XCircle className="h-12 w-12 mx-auto mb-4" style={{ color: '#ef4444' }} />
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'hsl(222, 47%, 11%)' }}>Formulário não encontrado</h2>
          <p style={{ color: 'hsla(222, 47%, 11%, 0.6)' }}>O formulário que você está procurando não existe ou foi removido.</p>
        </Card>
      </div>
    );
  }

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
    spacing: "comfortable"
  };

  const baseDesign = (form.designConfig as any) ?? {};
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

  const colors = design.colors;

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

  // Calcular progresso atual
  const totalQuestions = questionPages.reduce((sum, page) => sum + page.questions.length, 0);
  const totalCampos = totalQuestions + 2; // +2 para nome e email
  const camposPreenchidosCount = Object.keys(answers).length + (contactName ? 1 : 0) + (contactEmail ? 1 : 0);
  const progressoAtual = Math.round((camposPreenchidosCount / totalCampos) * 100);

  // Tela de resultado
  if (result) {
    const scoreTiers = form.scoreTiers as ScoreTier[] | undefined;
    const tier = scoreTiers?.find(
      t => result.totalScore >= t.minScore && result.totalScore <= t.maxScore
    );

    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: `linear-gradient(to bottom right, ${colors.background}, ${colors.secondary})` }}>
        <Card className="w-full max-w-2xl p-8 text-center">
          {result.passed ? (
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4" style={{ color: colors.primary }} />
          ) : (
            <XCircle className="h-16 w-16 mx-auto mb-4" style={{ color: `${colors.text}60` }} />
          )}
          
          <h2 className="text-3xl font-bold mb-2" style={{ color: colors.text }}>
            {result.passed ? "Parabéns!" : "Obrigado!"}
          </h2>

          <p className="text-lg mb-6" style={{ color: `${colors.text}99` }}>
            {result.passed 
              ? "Você está qualificado! Entraremos em contato em breve."
              : "Obrigado pela sua participação. Infelizmente você não atingiu a pontuação mínima."}
          </p>

          {tier && (
            <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: colors.secondary }}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Award className="h-5 w-5" style={{ color: colors.primary }} />
                <span className="font-semibold" style={{ color: colors.text }}>{tier.label}</span>
              </div>
              <p className="text-sm" style={{ color: colors.text }}>{tier.description}</p>
            </div>
          )}

          <div className="p-4 rounded-lg mb-6" style={{ backgroundColor: colors.secondary }}>
            <p className="text-sm mb-2" style={{ color: `${colors.text}99` }}>Sua pontuação</p>
            <p className="text-4xl font-bold" style={{ color: colors.primary }}>{result.totalScore}</p>
          </div>
        </Card>
      </div>
    );
  }

  // Formulário principal
  return (
    <div className="min-h-screen p-4" style={{ background: `linear-gradient(to bottom right, ${colors.background}, ${colors.secondary})` }}>
      <div className="max-w-3xl mx-auto">
        {/* Header com progresso */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold" style={{ color: colors.text }}>{form.title}</h1>
            <div className="flex items-center gap-2 text-sm" style={{ color: `${colors.text}99` }}>
              <Clock className="h-4 w-4" />
              <span>{progressoAtual}% completo</span>
            </div>
          </div>
          {form.description && (
            <p style={{ color: `${colors.text}99` }}>{form.description}</p>
          )}
          
          {/* Barra de progresso */}
          <div className="mt-4 h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.secondary }}>
            <div 
              className="h-full transition-all duration-300" 
              style={{ 
                width: `${progressoAtual}%`,
                backgroundColor: colors.progressBar || colors.primary
              }}
            />
          </div>
        </div>

        <Card className="p-6" style={{ backgroundColor: colors.background, borderColor: `${colors.primary}30` }}>
          <div className="space-y-6">
            {/* Barra de progresso de páginas */}
            {totalPages > 1 && (
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: colors.text }}>
                    Página {currentPage + 1} de {totalPages}
                  </span>
                  <span className="text-sm font-medium" style={{ color: colors.primary }}>
                    {Math.round(((currentPage + 1) / totalPages) * 100)}%
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.secondary }}>
                  <div className="h-full transition-all duration-300" style={{ width: `${((currentPage + 1) / totalPages) * 100}%`, backgroundColor: colors.progressBar || colors.primary }} />
                </div>
              </div>
            )}

            {/* Perguntas da página atual */}
            {currentPageQuestions.map((question, index) => {
              const questionType = question.questionType || question.type;
              const globalIndex = questionPages.slice(0, currentPage).reduce((sum, page) => sum + page.questions.length, 0) + index;
              
              return (
                <div key={question.id} className="space-y-3">
                  <Label className="text-base font-semibold" style={{ color: colors.text }}>
                    {globalIndex + 1}. {question.text}
                    {question.required && <span className="ml-1" style={{ color: '#ef4444' }}>*</span>}
                  </Label>

                  {questionType === "multiple-choice" && question.options && (
                    <RadioGroup
                      value={answers[question.id]?.answer}
                      onValueChange={(value) => {
                        const option = question.options.find((opt: any) => opt.text === value || opt.id === value);
                        if (option) {
                          handleAnswer(question.id, value, option.points || 0);
                        }
                      }}
                    >
                      {question.options.map((option: any, optIndex: number) => (
                        <div 
                          key={optIndex} 
                          className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-accent transition-colors cursor-pointer"
                          style={{ backgroundColor: colors.secondary, borderColor: `${colors.primary}30` }}
                        >
                          <RadioGroupItem value={option.text || option.id} id={`${question.id}-${optIndex}`} />
                          <Label htmlFor={`${question.id}-${optIndex}`} className="font-normal cursor-pointer flex-1" style={{ color: colors.text }}>
                            {option.text}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {(questionType === "short-text" || questionType === "text") && (
                    <Input
                      value={answers[question.id]?.answer || ""}
                      onChange={(e) => handleAnswer(question.id, e.target.value, 0)}
                      placeholder="Digite sua resposta"
                      style={{ backgroundColor: colors.secondary, borderColor: `${colors.primary}30`, color: colors.text }}
                    />
                  )}

                  {questionType === "long-text" && (
                    <Textarea
                      value={answers[question.id]?.answer || ""}
                      onChange={(e) => handleAnswer(question.id, e.target.value, 0)}
                      placeholder="Digite sua resposta"
                      rows={4}
                      style={{ backgroundColor: colors.secondary, borderColor: `${colors.primary}30`, color: colors.text }}
                    />
                  )}
                </div>
              );
            })}

            {/* Navegação entre páginas */}
            {totalPages > 1 && !isLastPage && (
              <div className="flex justify-end pt-4">
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

            {/* Campos de contato - apenas na última página ou se há apenas 1 página */}
            {(isLastPage || totalPages <= 1) && (
              <div className="space-y-4 pt-6 border-t" style={{ borderColor: `${colors.primary}30` }}>
                <h3 className="text-lg font-semibold" style={{ color: colors.text }}>Informações de Contato</h3>
                <div>
                  <Label style={{ color: colors.text }}>Nome completo *</Label>
                  <Input
                    value={contactName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Digite seu nome"
                    style={{ backgroundColor: colors.secondary, borderColor: `${colors.primary}30`, color: colors.text }}
                  />
                </div>
                <div>
                  <Label style={{ color: colors.text }}>Email *</Label>
                  <Input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="seu@email.com"
                    style={{ backgroundColor: colors.secondary, borderColor: `${colors.primary}30`, color: colors.text }}
                  />
                </div>
                <div>
                  {telefoneOriginal ? (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2" style={{ color: colors.text }}>
                        Telefone (confirmado via WhatsApp)
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.primary, color: colors.background }}>
                          ✓ Verificado
                        </span>
                      </Label>
                      <Input
                        type="tel"
                        value={contactPhone}
                        disabled={true}
                        className="cursor-not-allowed font-medium"
                        style={{ backgroundColor: colors.secondary, borderColor: '#22c55e', borderWidth: '2px', color: colors.text }}
                      />
                      <p className="text-xs flex items-center gap-1" style={{ color: colors.text, opacity: 0.7 }}>
                        <span>ℹ️</span>
                        <span>Este é o número verificado via WhatsApp e não pode ser alterado por segurança.</span>
                      </p>
                    </div>
                  ) : (
                    <>
                      <Label style={{ color: colors.text }}>Telefone</Label>
                      <Input
                        type="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="(00) 00000-0000"
                        style={{ backgroundColor: colors.secondary, borderColor: `${colors.primary}30`, color: colors.text }}
                      />
                    </>
                  )}
                </div>

                {/* Botão de envio */}
                <div className="pt-4">
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full"
                    style={{ backgroundColor: colors.button, color: colors.buttonText }}
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
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TrackedPublicForm;
