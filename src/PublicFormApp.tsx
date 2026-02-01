import { useState, useEffect, useCallback } from "react";

interface FormData {
  id: string;
  title: string;
  description?: string;
  questions?: any[];
  elements?: any[];
  settings?: any;
  welcome_screen?: any;
  thank_you_screen?: any;
}

const PublicFormApp = () => {
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  const path = window.location.pathname;

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
          return { token: match[1] };
        }
        return { companySlug: match[1], formSlug: match[2] };
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
        
        if (!data.welcome_screen?.enabled) {
          setShowWelcome(false);
        }
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
    return data.filter((q: any) => q.text || q.questionType);
  }, [form]);

  const handleAnswer = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!form) return;
    setSubmitting(true);

    try {
      const params = extractParams();
      const response = await fetch('/api/form-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_id: form.id,
          company_slug: params && 'companySlug' in params ? params.companySlug : undefined,
          responses: answers,
        }),
      });

      if (!response.ok) throw new Error('Erro ao enviar');
      setSubmitted(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao enviar formulário');
    } finally {
      setSubmitting(false);
    }
  };

  const questions = getQuestions();
  const currentQuestion = questions[currentPage];
  const isLastPage = currentPage === questions.length - 1;
  const canGoNext = currentQuestion && answers[currentQuestion.id];

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.skeleton} />
          <div style={{ ...styles.skeleton, width: '70%', marginTop: 16 }} />
          <div style={{ ...styles.skeleton, height: 48, marginTop: 32 }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.errorTitle}>Erro</h2>
          <p style={styles.errorText}>{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    const thankYou = form?.thank_you_screen;
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.successIcon}>✓</div>
          <h2 style={styles.successTitle}>
            {thankYou?.title || 'Obrigado!'}
          </h2>
          <p style={styles.successText}>
            {thankYou?.description || 'Sua resposta foi enviada com sucesso.'}
          </p>
        </div>
      </div>
    );
  }

  if (showWelcome && form?.welcome_screen?.enabled) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.welcomeTitle}>
            {form.welcome_screen.title || form.title}
          </h1>
          <p style={styles.welcomeDesc}>
            {form.welcome_screen.description || form.description}
          </p>
          <button
            style={styles.primaryButton}
            onClick={() => setShowWelcome(false)}
          >
            {form.welcome_screen.button_text || 'Começar'}
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p>Formulário sem perguntas</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.progress}>
          <div style={{ ...styles.progressBar, width: `${((currentPage + 1) / questions.length) * 100}%` }} />
        </div>
        
        <p style={styles.counter}>{currentPage + 1} de {questions.length}</p>
        
        <h2 style={styles.questionTitle}>
          {currentQuestion.text}
          {currentQuestion.required && <span style={styles.required}>*</span>}
        </h2>

        <div style={styles.inputContainer}>
          {renderInput(currentQuestion, answers[currentQuestion.id], (v) => handleAnswer(currentQuestion.id, v))}
        </div>

        <div style={styles.buttonRow}>
          {currentPage > 0 && (
            <button
              style={styles.secondaryButton}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              Voltar
            </button>
          )}
          
          {isLastPage ? (
            <button
              style={{ ...styles.primaryButton, opacity: submitting || !canGoNext ? 0.6 : 1 }}
              onClick={handleSubmit}
              disabled={submitting || !canGoNext}
            >
              {submitting ? 'Enviando...' : 'Enviar'}
            </button>
          ) : (
            <button
              style={{ ...styles.primaryButton, opacity: !canGoNext ? 0.6 : 1 }}
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={!canGoNext}
            >
              Próxima
            </button>
          )}
        </div>
      </div>
    </div>
  );
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
    animation: 'pulse 1.5s ease-in-out infinite',
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
    backgroundColor: '#22c55e',
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
    color: '#22c55e',
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
    color: '#e91e63',
    textAlign: 'center',
    marginBottom: 16,
  },
  welcomeDesc: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryButton: {
    width: '100%',
    padding: '14px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
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
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3b82f6',
    transition: 'width 0.3s ease',
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
  input: {
    width: '100%',
    padding: 12,
    fontSize: 16,
    border: '2px solid #e5e7eb',
    borderRadius: 8,
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: 12,
    fontSize: 16,
    border: '2px solid #e5e7eb',
    borderRadius: 8,
    outline: 'none',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  optionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  optionButton: {
    padding: '12px 16px',
    backgroundColor: '#f8fafc',
    border: '2px solid #e5e7eb',
    borderRadius: 8,
    fontSize: 16,
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  optionButtonSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
};

export default PublicFormApp;
