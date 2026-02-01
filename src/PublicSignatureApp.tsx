import { useState, useEffect, useCallback } from "react";

interface ContractData {
  id: string;
  client_name: string;
  client_cpf?: string;
  client_email?: string;
  client_phone?: string;
  status?: string;
  access_token?: string;
  created_at?: string;
  signed_at?: string;
  protocol_number?: string;
  contract_html?: string;
  logo_url?: string;
  logo_size?: string;
  logo_position?: string;
  primary_color?: string;
  text_color?: string;
  font_family?: string;
  font_size?: string;
  company_name?: string;
  footer_text?: string;
  verification_primary_color?: string;
  verification_text_color?: string;
  verification_welcome_text?: string;
  verification_instructions?: string;
  verification_footer_text?: string;
  verification_security_text?: string;
  verification_header_company_name?: string;
  verification_header_background_color?: string;
}

const PublicSignatureApp = () => {
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'welcome' | 'signing'>('welcome');
  const [HeavyComponent, setHeavyComponent] = useState<any>(null);

  const path = window.location.pathname;

  const extractToken = useCallback(() => {
    const patterns = [
      /^\/assinar\/([^/]+)$/,
      /^\/assinatura\/([^/]+)$/,
    ];
    
    for (const pattern of patterns) {
      const match = path.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }, [path]);

  useEffect(() => {
    const token = extractToken();
    if (!token) {
      setError("Token não encontrado na URL");
      setLoading(false);
      return;
    }

    const fetchContract = async () => {
      try {
        const response = await fetch(`/api/assinatura/${token}`);
        if (!response.ok) {
          throw new Error('Contrato não encontrado');
        }
        
        const data = await response.json();
        setContractData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar contrato');
      } finally {
        setLoading(false);
      }
    };

    fetchContract();
  }, [extractToken]);

  const handleStartSigning = async () => {
    setStep('signing');
    
    try {
      const module = await import('./pages/AssinaturaClientPage');
      setHeavyComponent(() => module.default);
    } catch (err) {
      console.error('Erro ao carregar componente:', err);
      window.location.reload();
    }
  };

  const primaryColor = contractData?.verification_primary_color || contractData?.primary_color || '#1e3a5f';
  const textColor = contractData?.verification_text_color || contractData?.text_color || '#ffffff';
  const companyName = contractData?.verification_header_company_name || contractData?.company_name || 'Empresa';
  const logoUrl = contractData?.logo_url;
  const clientName = contractData?.client_name || 'Cliente';
  const welcomeText = contractData?.verification_welcome_text || `Olá ${clientName}, estamos prontos para iniciar sua assinatura digital.`;
  const headerBgColor = contractData?.verification_header_background_color || primaryColor;
  const fontFamily = contractData?.font_family || 'Arial, sans-serif';

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
          <div style={styles.errorIcon}>⚠️</div>
          <h2 style={styles.errorTitle}>Erro</h2>
          <p style={styles.errorText}>{error}</p>
          <p style={styles.errorHint}>
            Verifique se o link está correto ou entre em contato com a empresa.
          </p>
        </div>
      </div>
    );
  }

  if (step === 'signing' && HeavyComponent) {
    return <HeavyComponent />;
  }

  if (step === 'signing' && !HeavyComponent) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.loadingSpinner} />
          <p style={styles.loadingText}>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...styles.welcomeContainer, fontFamily }}>
      <div style={{ ...styles.header, backgroundColor: headerBgColor }}>
        {logoUrl && (
          <img 
            src={logoUrl} 
            alt={companyName}
            style={styles.logo}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        <h1 style={{ ...styles.companyName, color: textColor }}>{companyName}</h1>
      </div>

      <div style={styles.welcomeContent}>
        <div style={styles.welcomeCard}>
          <div style={{ ...styles.iconCircle, backgroundColor: primaryColor }}>
            <span style={styles.icon}>✍️</span>
          </div>
          
          <h2 style={styles.welcomeTitle}>Assinatura Digital</h2>
          
          <div style={styles.clientInfo}>
            <p style={styles.clientLabel}>Cliente</p>
            <p style={styles.clientName}>{clientName}</p>
          </div>
          
          <p style={styles.welcomeText}>{welcomeText}</p>
          
          {contractData?.protocol_number && (
            <div style={styles.protocolBox}>
              <span style={styles.protocolLabel}>Protocolo:</span>
              <span style={styles.protocolNumber}>{contractData.protocol_number}</span>
            </div>
          )}
          
          <button
            style={{ ...styles.startButton, backgroundColor: primaryColor }}
            onClick={handleStartSigning}
            onMouseOver={(e) => {
              (e.target as HTMLButtonElement).style.opacity = '0.9';
              (e.target as HTMLButtonElement).style.transform = 'scale(1.02)';
            }}
            onMouseOut={(e) => {
              (e.target as HTMLButtonElement).style.opacity = '1';
              (e.target as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            Iniciar Assinatura →
          </button>
          
          <p style={styles.securityText}>
            🔒 {contractData?.verification_security_text || 'Processo 100% seguro e criptografado'}
          </p>
        </div>
        
        {contractData?.verification_footer_text && (
          <p style={styles.footerText}>{contractData.verification_footer_text}</p>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 32,
    maxWidth: 400,
    width: '100%',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    textAlign: 'center' as const,
  },
  skeleton: {
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    height: 24,
    width: '100%',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  errorHint: {
    fontSize: 14,
    color: '#888',
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    border: '3px solid #e0e0e0',
    borderTopColor: '#1e3a5f',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  welcomeContainer: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    maxHeight: 60,
    maxWidth: 200,
    objectFit: 'contain' as const,
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    margin: 0,
  },
  welcomeContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  welcomeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    maxWidth: 420,
    width: '100%',
    boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
    textAlign: 'center' as const,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
  },
  icon: {
    fontSize: 36,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 24,
  },
  clientInfo: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  clientLabel: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    margin: '0 0 4px 0',
  },
  clientName: {
    fontSize: 18,
    fontWeight: 600,
    color: '#1e293b',
    margin: 0,
  },
  welcomeText: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 1.6,
    marginBottom: 24,
  },
  protocolBox: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: '12px 16px',
    marginBottom: 24,
    display: 'flex',
    justifyContent: 'center',
    gap: 8,
    alignItems: 'center',
  },
  protocolLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  protocolNumber: {
    fontSize: 14,
    fontWeight: 600,
    color: '#334155',
    fontFamily: 'monospace',
  },
  startButton: {
    width: '100%',
    padding: '16px 24px',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginBottom: 16,
  },
  securityText: {
    fontSize: 13,
    color: '#94a3b8',
    margin: 0,
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 24,
    textAlign: 'center' as const,
  },
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default PublicSignatureApp;
