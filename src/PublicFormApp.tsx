/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  ⚠️  ULTRA-LIGHT PUBLIC FORM COMPONENT - CRITICAL FOR PERFORMANCE  ⚠️    ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  This component loads in <1 second vs 15+ seconds with full App.tsx       ║
 * ║                                                                           ║
 * ║  🔴 NEVER IMPORT:                                                          ║
 * ║  - TanStack Query (@tanstack/react-query)                                  ║
 * ║  - React Router (react-router-dom, wouter)                                 ║
 * ║  - shadcn/ui components (@/components/ui/*)                               ║
 * ║  - Lucide icons (lucide-react)                                            ║
 * ║  - Framer Motion                                                          ║
 * ║  - Any authentication/context providers                                   ║
 * ║                                                                           ║
 * ║  🟢 ALLOWED:                                                               ║
 * ║  - React core (useState, useEffect, useCallback, useMemo)                  ║
 * ║  - Native fetch() for API calls                                           ║
 * ║  - Inline CSS (no external CSS imports)                                   ║
 * ║                                                                           ║
 * ║  📖 Full documentation: docs/PUBLIC_FORM_PERFORMANCE_FIX.md               ║
 * ║  💰 Cost to discover this fix: $30+ in debugging time                     ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
import { useState, useEffect, useCallback, useMemo } from "react";

interface DesignColors {
  primary?: string;
  button?: string;
  buttonText?: string;
  text?: string;
  background?: string;
  secondary?: string;
  progressBar?: string;
}

interface DesignConfig {
  colors?: DesignColors;
  spacing?: string;
  typography?: {
    fontFamily?: string;
    titleSize?: string;
    textSize?: string;
  };
}

interface WelcomeConfig {
  title?: string;
  description?: string;
  buttonText?: string;
  logo?: string;
  logoAlign?: string;
  titleSize?: string;
}

interface FormData {
  id: string;
  title: string;
  description?: string;
  questions?: any[];
  elements?: any[];
  settings?: any;
  welcome_screen?: any;
  thank_you_screen?: any;
  designConfig?: DesignConfig;
  welcomeConfig?: WelcomeConfig;
}

interface PersonalData {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  instagram: string;
}

interface AddressData {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

const formatCPF = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const formatCEP = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const PublicFormApp = () => {
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentQuestionPage, setCurrentQuestionPage] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Extract telefone from URL query params
  const extractTelefoneFromUrl = useCallback(() => {
    try {
      // Method 1: URLSearchParams
      const params = new URLSearchParams(window.location.search);
      const tel = params.get('telefone');
      if (tel) return tel;
      
      // Method 2: Check if encoded in href (%3F = ?)
      const href = window.location.href;
      const match = href.match(/[?&]telefone=([^&]+)/);
      if (match) return decodeURIComponent(match[1]);
      
      // Method 3: Check pathname (some frameworks encode query in path)
      const pathMatch = window.location.pathname.match(/[?]telefone=([^&]+)/);
      if (pathMatch) return decodeURIComponent(pathMatch[1]);
      
      return null;
    } catch (e) {
      console.warn('[PublicFormApp] Error extracting telefone:', e);
      return null;
    }
  }, []);
  
  const telefoneFromUrl = useMemo(() => extractTelefoneFromUrl(), [extractTelefoneFromUrl]);
  const [phoneLocked, setPhoneLocked] = useState(!!telefoneFromUrl);
  
  // Format telefone from URL
  const formatTelefoneFromUrl = useCallback((tel: string): string => {
    const digits = tel.replace(/\D/g, '');
    // Remove country code 55 if present
    const cleanDigits = digits.startsWith('55') && digits.length > 11 
      ? digits.slice(2) 
      : digits;
    return formatPhone(cleanDigits);
  }, []);
  
  const initialPhone = telefoneFromUrl ? formatTelefoneFromUrl(telefoneFromUrl) : '';
  
  const [personalData, setPersonalData] = useState<PersonalData>({
    name: '', email: '', cpf: '', phone: initialPhone, instagram: ''
  });
  const [personalErrors, setPersonalErrors] = useState<Partial<PersonalData>>({});
  
  const [addressData, setAddressData] = useState<AddressData>({
    cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: ''
  });
  const [addressErrors, setAddressErrors] = useState<Partial<AddressData>>({});
  const [loadingCep, setLoadingCep] = useState(false);

  // Clean path: remove query string if present (some browsers/proxies may encode ? as %3F in path)
  const rawPath = window.location.pathname;
  const path = useMemo(() => {
    // Remove any query string that might have been encoded in the path
    let cleanPath = rawPath.split('?')[0];
    // Also handle URL-encoded ? (%3F)
    if (cleanPath.includes('%3F')) {
      cleanPath = cleanPath.split('%3F')[0];
    }
    return cleanPath;
  }, [rawPath]);
  
  // Log telefone extraction for debugging
  useEffect(() => {
    if (telefoneFromUrl) {
      console.log('📱 [PublicFormApp] Telefone extracted from URL:', telefoneFromUrl, '→', initialPhone);
      setPhoneLocked(true);
    }
  }, [telefoneFromUrl, initialPhone]);

  const extractParams = useCallback(() => {
    const patterns = [
      /^\/f\/([^/]+)$/,
      /^\/form\/([^/]+)\/([^/]+)$/,
      /^\/formulario\/([^/]+)\/form\/([^/]+)$/,
      /^\/([^/]+)\/form\/([^/]+)$/,
    ];
    
    for (const pattern of patterns) {
      const match = path.match(pattern);
      if (match) {
        if (pattern.source.includes('f\\/')) {
          // Also clean token from any query string artifacts
          const cleanToken = match[1].split('?')[0].split('%3F')[0];
          return { token: cleanToken };
        }
        // Clean slugs from any query string artifacts
        const cleanCompanySlug = match[1].split('?')[0].split('%3F')[0];
        const cleanFormSlug = match[2].split('?')[0].split('%3F')[0];
        return { companySlug: cleanCompanySlug, formSlug: cleanFormSlug };
      }
    }
    return null;
  }, [path]);

  useEffect(() => {
    const params = extractParams();
    if (!params) {
      setError("URL inválida");
      setLoading(false);
      return;
    }

    const fetchForm = async () => {
      try {
        let url = '';
        if ('token' in params) {
          url = `/api/forms/public/${params.token}`;
        } else {
          url = `/api/forms/public/by-slug/${params.companySlug}/${params.formSlug}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Formulário não encontrado');
        
        const data = await response.json();
        setForm(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar');
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [extractParams]);

  const getQuestions = useCallback(() => {
    if (!form) return [];
    const data = form.questions || form.elements || [];
    // Only include actual questions (type='question' or has questionType)
    // Exclude headings, text elements, and pageBreaks
    return data.filter((q: any) => {
      const isQuestion = q.type === 'question' || q.questionType;
      const isNotHeading = q.type !== 'heading' && q.type !== 'text' && q.type !== 'pageBreak';
      return isQuestion && isNotHeading;
    });
  }, [form]);

  const lookupCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    
    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setAddressData(prev => ({
          ...prev,
          street: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || '',
        }));
      }
    } catch (err) {
      console.error('Erro ao buscar CEP:', err);
    } finally {
      setLoadingCep(false);
    }
  };

  const validatePersonalData = (): boolean => {
    const errors: Partial<PersonalData> = {};
    if (!personalData.name || personalData.name.length < 3) errors.name = 'Nome deve ter pelo menos 3 caracteres';
    if (!personalData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalData.email)) errors.email = 'Email inválido';
    const cpfDigits = personalData.cpf.replace(/\D/g, '');
    if (cpfDigits.length !== 11) errors.cpf = 'CPF deve ter 11 dígitos';
    setPersonalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateAddressData = (): boolean => {
    const errors: Partial<AddressData> = {};
    if (!addressData.cep || addressData.cep.replace(/\D/g, '').length < 8) errors.cep = 'CEP inválido';
    if (!addressData.street || addressData.street.length < 3) errors.street = 'Rua é obrigatória';
    if (!addressData.number) errors.number = 'Número é obrigatório';
    if (!addressData.city || addressData.city.length < 2) errors.city = 'Cidade é obrigatória';
    if (!addressData.state || addressData.state.length !== 2) errors.state = 'Estado inválido';
    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 0) {
      setCurrentStep(1);
    } else if (currentStep === 1) {
      if (validatePersonalData()) setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateAddressData()) setCurrentStep(3);
    } else if (currentStep === 3) {
      const questions = getQuestions();
      if (currentQuestionPage < questions.length - 1) {
        setCurrentQuestionPage(p => p + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep === 3 && currentQuestionPage > 0) {
      setCurrentQuestionPage(p => p - 1);
    } else if (currentStep > 0) {
      setCurrentStep(s => s - 1);
    }
  };

  const handleSubmit = async () => {
    if (!form) return;
    setSubmitting(true);

    try {
      const params = extractParams();
      const companySlug = params && 'companySlug' in params ? params.companySlug : undefined;
      
      // Use the correct public submission endpoint
      const response = await fetch(`/api/forms/${form.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers,
          contactName: personalData.name,
          contactEmail: personalData.email,
          contactPhone: personalData.phone,
          contactCpf: personalData.cpf,
          contactInstagram: personalData.instagram,
          addressData,
          companySlug,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao enviar');
      }
      setSubmitted(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao enviar formulário');
    } finally {
      setSubmitting(false);
    }
  };

  // Memoize derived values to prevent recalculation on every render
  const {
    questions,
    currentQuestion,
    totalSteps,
    progressPercent,
    colors,
    primaryColor,
    buttonColor,
    buttonTextColor,
    textColor,
    secondaryColor,
    progressBarColor,
    welcomeConfig
  } = useMemo(() => {
    const questions = getQuestions();
    const totalSteps = 3 + questions.length;
    const progressStep = currentStep === 3 ? 3 + currentQuestionPage : currentStep;
    const colors = form?.designConfig?.colors;
    const primaryColor = colors?.primary || '#e91e63';
    
    return {
      questions,
      currentQuestion: questions[currentQuestionPage],
      totalSteps,
      progressPercent: Math.round(((progressStep + 1) / totalSteps) * 100),
      colors,
      primaryColor,
      buttonColor: colors?.button || primaryColor,
      buttonTextColor: colors?.buttonText || '#ffffff',
      textColor: colors?.text || '#1a1a1a',
      secondaryColor: colors?.secondary || '#f1f5f9',
      progressBarColor: colors?.progressBar || primaryColor,
      welcomeConfig: form?.welcomeConfig
    };
  }, [form, currentStep, currentQuestionPage, getQuestions]);

  // Use CSS classes for mobile optimization (defined in index.html)
  // This reduces JavaScript style recalculations significantly on mobile
  
  if (loading) {
    return (
      <div className="pf-container" style={{ background: `linear-gradient(135deg, ${colors?.background || '#e0f7fa'} 0%, ${colors?.secondary || '#b2ebf2'} 100%)` }}>
        <div className="pf-card">
          <div style={styles.skeleton} />
          <div style={{ ...styles.skeleton, width: '70%', marginTop: 16 }} />
          <div style={{ ...styles.skeleton, height: 48, marginTop: 32 }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pf-container" style={{ background: `linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)` }}>
        <div className="pf-card">
          <h2 style={styles.errorTitle}>Erro</h2>
          <p style={styles.errorText}>{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    const thankYou = form?.thank_you_screen;
    return (
      <div className="pf-container" style={{ background: `linear-gradient(135deg, ${colors?.background || '#e0f7fa'} 0%, ${colors?.secondary || '#b2ebf2'} 100%)` }}>
        <div className="pf-card">
          <div style={{ ...styles.successIcon, backgroundColor: buttonColor }}>✓</div>
          <h2 style={{ ...styles.successTitle, color: primaryColor }}>
            {thankYou?.title || 'Obrigado!'}
          </h2>
          <p style={styles.successText}>
            {thankYou?.description || 'Sua resposta foi enviada com sucesso.'}
          </p>
        </div>
      </div>
    );
  }

  if (currentStep === 0) {
    return (
      <div className="pf-container" style={{ background: `linear-gradient(135deg, ${colors?.background || '#e0f7fa'} 0%, ${colors?.secondary || '#b2ebf2'} 100%)` }}>
        <div className="pf-card" style={{ textAlign: 'center' }}>
          <h1 style={{ ...styles.welcomeTitle, color: primaryColor }}>
            {welcomeConfig?.title || form?.title || 'Bem-vindo!'}
          </h1>
          <p style={styles.welcomeDesc}>
            {welcomeConfig?.description || form?.description || 'Preencha o formulário abaixo.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              className="pf-btn"
              style={{ backgroundColor: buttonColor, color: buttonTextColor }}
              onClick={handleNext}
            >
              ✨ {welcomeConfig?.buttonText || 'Começar'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 1) {
    return (
      <div className="pf-container" style={{ background: `linear-gradient(135deg, ${colors?.background || '#e0f7fa'} 0%, ${colors?.secondary || '#b2ebf2'} 100%)` }}>
        <div className="pf-card">
          <div className="pf-progress" style={{ backgroundColor: secondaryColor }}>
            <div className="pf-progress-bar" style={{ width: `${progressPercent}%`, backgroundColor: progressBarColor }} />
          </div>
          <p style={styles.stepLabel}>{progressPercent}% completo</p>
          
          <h2 style={styles.sectionTitle}>Dados Pessoais</h2>
          <p style={styles.sectionDesc}>Por favor, preencha suas informações de contato</p>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Nome completo *</label>
            <input
              type="text"
              className="pf-input"
              style={{ ...(personalErrors.name ? styles.inputError : {}), backgroundColor: secondaryColor }}
              value={personalData.name}
              onChange={(e) => setPersonalData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="João da Silva"
            />
            {personalErrors.name && <span style={styles.errorMsg}>{personalErrors.name}</span>}
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Email *</label>
            <input
              type="email"
              className="pf-input"
              style={{ ...(personalErrors.email ? styles.inputError : {}), backgroundColor: secondaryColor }}
              value={personalData.email}
              onChange={(e) => setPersonalData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="joao@email.com"
            />
            {personalErrors.email && <span style={styles.errorMsg}>{personalErrors.email}</span>}
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>CPF *</label>
            <input
              type="text"
              className="pf-input"
              style={{ ...(personalErrors.cpf ? styles.inputError : {}), backgroundColor: secondaryColor }}
              value={personalData.cpf}
              onChange={(e) => setPersonalData(prev => ({ ...prev, cpf: formatCPF(e.target.value) }))}
              placeholder="123.456.789-00"
            />
            {personalErrors.cpf && <span style={styles.errorMsg}>{personalErrors.cpf}</span>}
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Telefone
              {phoneLocked && (
                <span style={{ 
                  marginLeft: '8px', 
                  color: '#22c55e', 
                  fontSize: '12px',
                  fontWeight: 'normal'
                }}>
                  ✓ Preenchido
                </span>
              )}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="pf-input"
                style={{ 
                  backgroundColor: phoneLocked ? '#f0fdf4' : secondaryColor,
                  borderColor: phoneLocked ? '#22c55e' : undefined,
                  borderWidth: phoneLocked ? '2px' : '1px',
                  paddingRight: phoneLocked ? '40px' : undefined,
                  cursor: phoneLocked ? 'not-allowed' : 'text'
                }}
                value={personalData.phone}
                onChange={(e) => !phoneLocked && setPersonalData(prev => ({ ...prev, phone: formatPhone(e.target.value) }))}
                placeholder="(11) 99999-9999"
                readOnly={phoneLocked}
              />
              {phoneLocked && (
                <span style={{ 
                  position: 'absolute', 
                  right: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: '#22c55e',
                  fontSize: '18px'
                }}>
                  🔒
                </span>
              )}
            </div>
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Instagram</label>
            <input
              type="text"
              className="pf-input"
              style={{ backgroundColor: secondaryColor }}
              value={personalData.instagram}
              onChange={(e) => setPersonalData(prev => ({ ...prev, instagram: e.target.value }))}
              placeholder="@joaosilva"
            />
          </div>
          
          <div style={styles.buttonRow}>
            <button className="pf-btn" style={{ backgroundColor: '#f1f5f9', color: '#333' }} onClick={handleBack}>Voltar</button>
            <button className="pf-btn" style={{ backgroundColor: buttonColor, color: buttonTextColor }} onClick={handleNext}>
              Próxima →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 2) {
    return (
      <div className="pf-container" style={{ background: `linear-gradient(135deg, ${colors?.background || '#e0f7fa'} 0%, ${colors?.secondary || '#b2ebf2'} 100%)` }}>
        <div className="pf-card">
          <div className="pf-progress" style={{ backgroundColor: secondaryColor }}>
            <div className="pf-progress-bar" style={{ width: `${progressPercent}%`, backgroundColor: progressBarColor }} />
          </div>
          <p style={styles.stepLabel}>{progressPercent}% completo</p>
          
          <h2 style={styles.sectionTitle}>Dados de Endereço</h2>
          <p style={styles.sectionDesc}>Preencha seu endereço completo</p>
          
          <div style={styles.row}>
            <div style={{ ...styles.formGroup, flex: 2 }}>
              <label style={styles.label}>CEP *</label>
              <input
                type="text"
                style={{ ...styles.input, ...(addressErrors.cep ? styles.inputError : {}), backgroundColor: secondaryColor }}
                value={addressData.cep}
                onChange={(e) => {
                  const formatted = formatCEP(e.target.value);
                  setAddressData(prev => ({ ...prev, cep: formatted }));
                  if (formatted.replace(/\D/g, '').length === 8) lookupCep(formatted);
                }}
                placeholder="01310-100"
              />
              {addressErrors.cep && <span style={styles.errorMsg}>{addressErrors.cep}</span>}
            </div>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Estado *</label>
              <input
                type="text"
                style={{ ...styles.input, ...(addressErrors.state ? styles.inputError : {}), backgroundColor: secondaryColor }}
                value={addressData.state}
                onChange={(e) => setAddressData(prev => ({ ...prev, state: e.target.value.toUpperCase().slice(0, 2) }))}
                placeholder="SP"
                maxLength={2}
              />
            </div>
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Rua * {loadingCep && <span style={{ color: '#888' }}>(buscando...)</span>}</label>
            <input
              type="text"
              style={{ ...styles.input, ...(addressErrors.street ? styles.inputError : {}), backgroundColor: secondaryColor }}
              value={addressData.street}
              onChange={(e) => setAddressData(prev => ({ ...prev, street: e.target.value }))}
              placeholder="Av. Paulista"
            />
            {addressErrors.street && <span style={styles.errorMsg}>{addressErrors.street}</span>}
          </div>
          
          <div style={styles.row}>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Número *</label>
              <input
                type="text"
                style={{ ...styles.input, ...(addressErrors.number ? styles.inputError : {}), backgroundColor: secondaryColor }}
                value={addressData.number}
                onChange={(e) => setAddressData(prev => ({ ...prev, number: e.target.value }))}
                placeholder="1000"
              />
            </div>
            <div style={{ ...styles.formGroup, flex: 2 }}>
              <label style={styles.label}>Complemento</label>
              <input
                type="text"
                style={{ ...styles.input, backgroundColor: secondaryColor }}
                value={addressData.complement}
                onChange={(e) => setAddressData(prev => ({ ...prev, complement: e.target.value }))}
                placeholder="Sala 501"
              />
            </div>
          </div>
          
          <div style={styles.row}>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Bairro</label>
              <input
                type="text"
                style={{ ...styles.input, backgroundColor: secondaryColor }}
                value={addressData.neighborhood}
                onChange={(e) => setAddressData(prev => ({ ...prev, neighborhood: e.target.value }))}
                placeholder="Bela Vista"
              />
            </div>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Cidade *</label>
              <input
                type="text"
                style={{ ...styles.input, ...(addressErrors.city ? styles.inputError : {}), backgroundColor: secondaryColor }}
                value={addressData.city}
                onChange={(e) => setAddressData(prev => ({ ...prev, city: e.target.value }))}
                placeholder="São Paulo"
              />
            </div>
          </div>
          
          <div style={styles.buttonRow}>
            <button className="pf-btn" style={{ backgroundColor: '#f1f5f9', color: '#333' }} onClick={handleBack}>Voltar</button>
            <button className="pf-btn" style={{ backgroundColor: buttonColor, color: buttonTextColor }} onClick={handleNext}>
              Próxima →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 3) {
    if (!currentQuestion) {
      return (
        <div className="pf-container" style={{ background: `linear-gradient(135deg, ${colors?.background || '#e0f7fa'} 0%, ${colors?.secondary || '#b2ebf2'} 100%)` }}>
          <div className="pf-card">
            <p>Carregando perguntas...</p>
          </div>
        </div>
      );
    }

    const isLastQuestion = currentQuestionPage === questions.length - 1;

    return (
      <div className="pf-container" style={{ background: `linear-gradient(135deg, ${colors?.background || '#e0f7fa'} 0%, ${colors?.secondary || '#b2ebf2'} 100%)` }}>
        <div className="pf-card">
          <div className="pf-progress" style={{ backgroundColor: secondaryColor }}>
            <div className="pf-progress-bar" style={{ width: `${progressPercent}%`, backgroundColor: progressBarColor }} />
          </div>
          <p style={styles.stepLabel}>{progressPercent}% completo</p>
          
          <p style={styles.counter}>{currentQuestionPage + 1} de {questions.length}</p>
          
          <h2 style={styles.questionTitle}>
            {currentQuestion.text}
            {currentQuestion.required && <span style={styles.required}>*</span>}
          </h2>

          <div style={styles.inputContainer}>
            {renderInput(currentQuestion, answers[currentQuestion.id], (v) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: v })))}
          </div>

          <div style={styles.buttonRow}>
            <button className="pf-btn" style={{ backgroundColor: '#f1f5f9', color: '#333' }} onClick={handleBack}>Voltar</button>
            
            {isLastQuestion ? (
              <button
                className="pf-btn"
                style={{ backgroundColor: buttonColor, color: buttonTextColor, opacity: submitting ? 0.6 : 1 }}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Enviando...' : 'Enviar ✓'}
              </button>
            ) : (
              <button
                className="pf-btn"
                style={{ backgroundColor: buttonColor, color: buttonTextColor }}
                onClick={handleNext}
              >
                Próxima →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

const renderInput = (question: any, value: any, onChange: (v: any) => void) => {
  const type = question.questionType || question.type;
  
  if (type === 'text' || type === 'short-text') {
    return (
      <input
        type="text"
        style={styles.input}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Digite sua resposta..."
      />
    );
  }
  
  if (type === 'textarea' || type === 'long-text') {
    return (
      <textarea
        style={styles.textarea}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Digite sua resposta..."
        rows={4}
      />
    );
  }
  
  if (type === 'multiple-choice' || type === 'radio') {
    const options = question.options || [];
    return (
      <div style={styles.optionsContainer}>
        {options.map((opt: any, i: number) => {
          const optValue = typeof opt === 'string' ? opt : opt.text || opt.value;
          const isSelected = value === optValue;
          return (
            <button
              key={i}
              style={{
                ...styles.optionButton,
                ...(isSelected ? styles.optionButtonSelected : {}),
              }}
              onClick={() => onChange(optValue)}
            >
              {optValue}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <input
      type="text"
      style={styles.input}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Digite sua resposta..."
    />
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    background: 'linear-gradient(to bottom right, #87CEEB, #E0F4FF)',
  },
  card: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  },
  skeleton: {
    height: 36,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 600,
    color: '#dc2626',
    marginBottom: 8,
  },
  errorText: {
    color: '#666',
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    color: 'white',
    fontSize: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 8,
  },
  successText: {
    color: '#666',
    textAlign: 'center',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 16,
  },
  welcomeDesc: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    fontSize: 16,
    lineHeight: 1.5,
  },
  primaryButton: {
    padding: '14px 28px',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButton: {
    padding: '14px 24px',
    backgroundColor: '#f1f5f9',
    color: '#333',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 500,
    cursor: 'pointer',
    marginRight: 8,
  },
  progress: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
  stepLabel: {
    fontSize: 13,
    color: '#888',
    marginBottom: 24,
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  sectionDesc: {
    color: '#666',
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
    color: '#333',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: 12,
    fontSize: 16,
    border: '2px solid #e5e7eb',
    borderRadius: 8,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  inputError: {
    borderColor: '#dc2626',
  },
  errorMsg: {
    color: '#dc2626',
    fontSize: 12,
    marginTop: 4,
    display: 'block',
  },
  row: {
    display: 'flex',
    gap: 12,
  },
  counter: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  questionTitle: {
    fontSize: 22,
    fontWeight: 600,
    color: '#1a1a1a',
    marginBottom: 24,
  },
  required: {
    color: '#dc2626',
    marginLeft: 4,
  },
  inputContainer: {
    marginBottom: 24,
  },
  textarea: {
    width: '100%',
    padding: 12,
    fontSize: 16,
    border: '2px solid #e5e7eb',
    borderRadius: 8,
    outline: 'none',
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
  },
  optionsContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  optionButton: {
    padding: '12px 16px',
    backgroundColor: '#f8fafc',
    border: '2px solid #e5e7eb',
    borderRadius: 8,
    fontSize: 16,
    textAlign: 'left' as const,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  optionButtonSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 24,
  },
};

export default PublicFormApp;
