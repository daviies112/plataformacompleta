/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  ⚠️  ULTRA-LIGHT PUBLIC SIGNATURE COMPONENT - CRITICAL FOR PERFORMANCE ⚠️║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  This component loads in <1 second                                        ║
 * ║  Heavy providers (QueryClient, ThemeProvider, Toaster) are loaded         ║
 * ║  dynamically via AssinaturaClientWrapper only when user clicks start      ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
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
  verification_background_color?: string;
  background_color?: string;
  title_color?: string;
  button_color?: string;
  button_text_color?: string;
  icon_color?: string;
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

    const fetchContractAndLoadComponent = async () => {
      try {
        // Fetch contract data
        const response = await fetch(`/api/assinatura/public/contract/${token}`);
        if (!response.ok) {
          throw new Error('Contrato não encontrado');
        }
        
        const data = await response.json();
        setContractData(data);
        
        // Go directly to signing step - skip welcome screen
        setStep('signing');
        
        // Load the heavy component immediately
        const module = await import('./pages/AssinaturaClientWrapper');
        setHeavyComponent(() => module.default);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar contrato');
      } finally {
        setLoading(false);
      }
    };

    fetchContractAndLoadComponent();
  }, [extractToken]);

  const handleStartSigning = async () => {
    setStep('signing');
    
    try {
      // Load the wrapper that includes all providers (QueryClient, ThemeProvider, etc.)
      const module = await import('./pages/AssinaturaClientWrapper');
      setHeavyComponent(() => module.default);
    } catch (err) {
      console.error('Erro ao carregar componente:', err);
      window.location.reload();
    }
  };

  const buttonColor = contractData?.button_color || contractData?.verification_primary_color || contractData?.primary_color || '#1e3a5f';
  const buttonTextColor = contractData?.button_text_color || '#ffffff';
  const titleColor = contractData?.title_color || contractData?.primary_color || '#1a1a1a';
  const pageTextColor = contractData?.text_color || contractData?.verification_text_color || '#64748b';
  const bgColor = contractData?.background_color || contractData?.verification_background_color || '#f8fafc';
  const iconBgColor = contractData?.icon_color || buttonColor;
  const companyName = contractData?.verification_header_company_name || contractData?.company_name || 'Empresa';
  const logoUrl = contractData?.logo_url;
  const clientName = contractData?.client_name || 'Cliente';
  const welcomeText = contractData?.verification_welcome_text || `Olá ${clientName}, estamos prontos para iniciar sua assinatura digital.`;
  const headerBgColor = contractData?.verification_header_background_color || buttonColor;
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
          <div style={styles.errorIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
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
    // HeavyComponent is AssinaturaClientWrapper which includes all providers
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
    <div style={{ ...styles.welcomeContainer, fontFamily, backgroundColor: bgColor }}>
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
        <h1 style={{ ...styles.companyName, color: buttonTextColor }}>{companyName}</h1>
      </div>

      <div style={styles.welcomeContent}>
        <div style={styles.welcomeCard}>
          <div style={{ ...styles.iconCircle, backgroundColor: iconBgColor }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
              <path d="M12 19l7-7 3 3-7 7-3-3z"/>
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
              <path d="M2 2l7.586 7.586"/>
              <circle cx="11" cy="11" r="2"/>
            </svg>
          </div>
          
          <h2 style={{ ...styles.welcomeTitle, color: titleColor }}>Assinatura Digital</h2>
          
          <div style={styles.clientInfo}>
            <p style={styles.clientLabel}>Cliente</p>
            <p style={styles.clientName}>{clientName}</p>
          </div>
          
          <p style={{ ...styles.welcomeText, color: pageTextColor }}>{welcomeText}</p>
          
          {contractData?.protocol_number && (
            <div style={styles.protocolBox}>
              <span style={styles.protocolLabel}>Protocolo:</span>
              <span style={styles.protocolNumber}>{contractData.protocol_number}</span>
            </div>
          )}
          
          <button
            style={{ ...styles.startButton, backgroundColor: buttonColor, color: buttonTextColor }}
            onClick={handleStartSigning}
            onMouseOver={(e) => {
              (e.target as HTMLButtonElement).style.opacity = '0.9';
            }}
            onMouseOut={(e) => {
              (e.target as HTMLButtonElement).style.opacity = '1';
            }}
          >
            Iniciar Assinatura
          </button>
          
          <p style={styles.securityText}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            {contractData?.verification_security_text || 'Processo 100% seguro e criptografado'}
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

// Inject styles once - use IIFE to prevent duplicates
const STYLE_ID = 'public-signature-animations';
if (!document.getElementById(STYLE_ID)) {
  const styleSheet = document.createElement('style');
  styleSheet.id = STYLE_ID;
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
}

export default PublicSignatureApp;
