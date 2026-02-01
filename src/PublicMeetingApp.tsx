/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  ⚠️  ULTRA-LIGHT PUBLIC MEETING COMPONENT - CRITICAL FOR PERFORMANCE  ⚠️ ║
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
 * ║  - React core (useState, useEffect, useCallback, useMemo, lazy, Suspense) ║
 * ║  - Native fetch() for API calls                                           ║
 * ║  - Inline CSS (no external CSS imports)                                   ║
 * ║  - 100ms SDK (lazy loaded only when needed)                               ║
 * ║                                                                           ║
 * ║  🔧 OPTIMIZATIONS:                                                         ║
 * ║  - Camera initialization delayed 100ms for UI to render first             ║
 * ║  - Uses combined /full-public endpoint (1 request vs 2)                   ║
 * ║  - Backend cache: 2 min TTL for meeting data                              ║
 * ║                                                                           ║
 * ║  📖 Full documentation: docs/PUBLIC_FORM_PERFORMANCE_FIX.md               ║
 * ║  💰 Cost to discover this fix: $30+ in debugging time                     ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";

interface RoomDesignConfig {
  branding: {
    logo?: string | null;
    logoSize?: number;
    logoPosition?: 'left' | 'center' | 'right';
    companyName?: string;
    showCompanyName?: boolean;
    showLogoInLobby?: boolean;
  };
  colors: {
    background: string;
    controlsBackground: string;
    controlsText: string;
    primaryButton: string;
    dangerButton: string;
    avatarBackground: string;
    avatarText: string;
  };
  lobby: {
    title?: string;
    subtitle?: string;
    buttonText?: string;
    showCameraPreview?: boolean;
  };
  endScreen: {
    title?: string;
    message?: string;
    redirectUrl?: string | null;
  };
}

interface MeetingData {
  id: string;
  titulo: string;
  descricao?: string;
  roomId100ms?: string;
  status?: string;
}

const DEFAULT_CONFIG: RoomDesignConfig = {
  branding: {
    logo: null,
    logoSize: 60,
    logoPosition: 'center',
    companyName: '',
    showCompanyName: true,
    showLogoInLobby: true,
  },
  colors: {
    background: '#0f172a',
    controlsBackground: '#18181b',
    controlsText: '#ffffff',
    primaryButton: '#3b82f6',
    dangerButton: '#ef4444',
    avatarBackground: '#3b82f6',
    avatarText: '#ffffff',
  },
  lobby: {
    title: 'Pronto para participar?',
    subtitle: '',
    buttonText: 'Participar agora',
    showCameraPreview: true,
  },
  endScreen: {
    title: 'Reunião Encerrada',
    message: 'Obrigado por participar!',
    redirectUrl: null,
  },
};

const Meeting100msWithProvider = lazy(() => 
  import("@/components/Meeting100ms").then(m => ({ default: m.Meeting100msWithProvider }))
);

const PublicMeetingApp = () => {
  const [meetingData, setMeetingData] = useState<MeetingData | null>(null);
  const [roomDesign, setRoomDesign] = useState<RoomDesignConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [step, setStep] = useState<'lobby' | 'joining' | 'meeting' | 'ended'>('lobby');
  const [token100ms, setToken100ms] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const extractMeetingId = useCallback(() => {
    const path = window.location.pathname;
    const patterns = [
      /^\/reuniao\/([^/?]+)/,
      /^\/reuniao-publica\/([^/?]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = path.match(pattern);
      if (match) {
        return match[1].split('?')[0].split('%3F')[0];
      }
    }
    return null;
  }, []);

  const meetingId = extractMeetingId();

  useEffect(() => {
    if (!meetingId) {
      setError("ID da reunião não encontrado na URL");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Use combined endpoint for single request (faster than 2 parallel requests)
        const response = await fetch(`/api/public/reunioes/${meetingId}/full-public`);

        if (!response.ok) {
          throw new Error('Reunião não encontrada');
        }

        const data = await response.json();
        
        // Set meeting data
        setMeetingData(data.meeting);

        // Set design config if available
        if (data.roomDesignConfig) {
          setRoomDesign({
            branding: { ...DEFAULT_CONFIG.branding, ...data.roomDesignConfig.branding },
            colors: { ...DEFAULT_CONFIG.colors, ...data.roomDesignConfig.colors },
            lobby: { ...DEFAULT_CONFIG.lobby, ...data.roomDesignConfig.lobby },
            endScreen: { ...DEFAULT_CONFIG.endScreen, ...data.roomDesignConfig.endScreen },
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar reunião');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [meetingId]);

  useEffect(() => {
    if (step !== 'lobby' || !roomDesign.lobby.showCameraPreview) return;

    let isMounted = true;

    const initMedia = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (!isMounted) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err: any) {
        console.log('Media not available:', err.name);
        if (err.name === 'NotFoundError') {
          setIsVideoEnabled(false);
          setIsAudioEnabled(false);
        }
      }
    };

    // Defer camera initialization to let UI render first (100ms delay)
    const timeoutId = setTimeout(initMedia, 100);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [step, roomDesign.lobby.showCameraPreview]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) videoTrack.enabled = isVideoEnabled;
  }, [isVideoEnabled, stream]);

  useEffect(() => {
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) audioTrack.enabled = isAudioEnabled;
  }, [isAudioEnabled, stream]);

  const handleJoin = useCallback(async () => {
    if (!userName.trim()) {
      setTokenError('Por favor, insira seu nome');
      return;
    }

    if (!meetingId || !meetingData) {
      setTokenError('Dados da reunião não disponíveis');
      return;
    }

    if (!meetingData.roomId100ms) {
      setTokenError('Esta reunião não possui uma sala configurada');
      return;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setStream(null);
    }

    setStep('joining');
    setTokenError(null);

    // Load global CSS before entering meeting room (Meeting100ms uses shadcn components)
    const CSS_STYLE_ID = 'meeting-global-css';
    if (!document.getElementById(CSS_STYLE_ID)) {
      try {
        await import('../index.css');
        // Mark as loaded to prevent duplicate imports
        const marker = document.createElement('meta');
        marker.id = CSS_STYLE_ID;
        document.head.appendChild(marker);
      } catch (cssError) {
        console.log('[Meeting] CSS import skipped:', cssError);
      }
    }

    try {
      const response = await fetch(`/api/public/reunioes/${meetingId}/token-public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: userName.trim(),
          role: 'guest'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao obter token de acesso');
      }

      const data = await response.json();
      if (data.token) {
        setToken100ms(data.token);
        setStep('meeting');
      } else {
        throw new Error('Token não retornado pela API');
      }
    } catch (err: any) {
      console.error('Erro ao buscar token:', err);
      setTokenError(err.message || 'Erro ao conectar à reunião');
      setStep('lobby');
    }
  }, [meetingId, meetingData, userName]);

  const handleLeave = useCallback(() => {
    setStep('ended');
    setToken100ms(null);
  }, []);

  const colors = roomDesign.colors;
  const branding = roomDesign.branding;
  const lobby = roomDesign.lobby;

  const styles: Record<string, React.CSSProperties> = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      backgroundColor: colors.background,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    card: {
      width: '100%',
      maxWidth: '600px',
      padding: '32px',
      borderRadius: '16px',
      backgroundColor: colors.controlsBackground,
      boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
    },
    logoContainer: {
      display: 'flex',
      justifyContent: branding.logoPosition === 'left' ? 'flex-start' : 
                     branding.logoPosition === 'right' ? 'flex-end' : 'center',
      marginBottom: '16px',
    },
    logo: {
      maxHeight: branding.logoSize || 60,
      maxWidth: '200px',
      objectFit: 'contain' as const,
    },
    companyName: {
      fontSize: '18px',
      fontWeight: 600,
      color: colors.controlsText,
      textAlign: 'center' as const,
      marginBottom: '8px',
    },
    title: {
      fontSize: '24px',
      fontWeight: 700,
      color: colors.controlsText,
      textAlign: 'center' as const,
      marginBottom: '8px',
    },
    meetingTitle: {
      fontSize: '14px',
      color: colors.controlsText,
      opacity: 0.7,
      textAlign: 'center' as const,
      marginBottom: '24px',
    },
    videoContainer: {
      position: 'relative' as const,
      width: '100%',
      aspectRatio: '16/9',
      borderRadius: '12px',
      overflow: 'hidden',
      backgroundColor: colors.avatarBackground,
      marginBottom: '16px',
    },
    video: {
      width: '100%',
      height: '100%',
      objectFit: 'cover' as const,
      transform: 'scaleX(-1)',
    },
    videoPlaceholder: {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarCircle: {
      width: '96px',
      height: '96px',
      borderRadius: '50%',
      backgroundColor: colors.primaryButton,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarIcon: {
      width: '48px',
      height: '48px',
      color: colors.avatarText,
    },
    controlsRow: {
      position: 'absolute' as const,
      bottom: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '8px',
    },
    controlButton: {
      width: '48px',
      height: '48px',
      borderRadius: '50%',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'transform 0.2s',
    },
    formGroup: {
      marginBottom: '16px',
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: 500,
      color: colors.controlsText,
      marginBottom: '6px',
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      fontSize: '16px',
      borderRadius: '8px',
      border: `1px solid ${colors.controlsText}33`,
      backgroundColor: `${colors.background}88`,
      color: colors.controlsText,
      outline: 'none',
      boxSizing: 'border-box' as const,
    },
    primaryButton: {
      width: '100%',
      padding: '14px 24px',
      fontSize: '16px',
      fontWeight: 600,
      borderRadius: '8px',
      border: 'none',
      backgroundColor: colors.primaryButton,
      color: '#ffffff',
      cursor: 'pointer',
      transition: 'transform 0.2s, opacity 0.2s',
    },
    errorText: {
      color: colors.dangerButton,
      fontSize: '14px',
      marginTop: '8px',
      textAlign: 'center' as const,
    },
    skeleton: {
      height: '24px',
      backgroundColor: colors.controlsText + '22',
      borderRadius: '6px',
      animation: 'pulse 1.5s infinite',
    },
    loadingSpinner: {
      width: '32px',
      height: '32px',
      border: `3px solid ${colors.controlsText}33`,
      borderTopColor: colors.primaryButton,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <style>{`
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
        <div style={styles.card}>
          <div style={{ ...styles.skeleton, width: '60%', margin: '0 auto 16px' }} />
          <div style={{ ...styles.skeleton, height: '200px', marginBottom: '16px' }} />
          <div style={{ ...styles.skeleton, height: '48px' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              backgroundColor: colors.dangerButton + '22',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={colors.dangerButton} strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <h2 style={{ ...styles.title, fontSize: '20px' }}>Erro</h2>
            <p style={{ color: colors.controlsText, opacity: 0.7 }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'joining') {
    return (
      <div style={styles.container}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={styles.card}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ ...styles.loadingSpinner, margin: '0 auto 16px' }} />
            <p style={{ color: colors.controlsText }}>Conectando à reunião...</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'meeting' && token100ms && meetingData?.roomId100ms) {
    return (
      <Suspense fallback={
        <div style={styles.container}>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={styles.card}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ ...styles.loadingSpinner, margin: '0 auto 16px' }} />
              <p style={{ color: colors.controlsText }}>Carregando sala de reunião...</p>
            </div>
          </div>
        </div>
      }>
        <Meeting100msWithProvider
          authToken={token100ms}
          roomId={meetingData.roomId100ms}
          userName={userName || "Participante"}
          onLeave={handleLeave}
          config={roomDesign as any}
        />
      </Suspense>
    );
  }

  if (step === 'ended') {
    const searchParams = new URLSearchParams(window.location.search);
    const fsid = searchParams.get('fsid') || (meetingData as any)?.metadata?.formSubmissionId;
    const redirectUrl = roomDesign.endScreen.redirectUrl || 
      (fsid ? `/assinatura/from-meeting?meetingId=${meetingId}&fsid=${fsid}` : null);

    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              backgroundColor: colors.primaryButton + '22',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={colors.primaryButton} strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h2 style={styles.title}>{roomDesign.endScreen.title}</h2>
            <p style={{ color: colors.controlsText, opacity: 0.7, marginBottom: '24px' }}>
              {roomDesign.endScreen.message}
            </p>
            {redirectUrl && (
              <button
                style={styles.primaryButton}
                onClick={() => window.location.href = redirectUrl}
              >
                Continuar para Assinatura
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={styles.card}>
        {branding.showLogoInLobby && branding.logo && (
          <div style={styles.logoContainer}>
            <img
              src={branding.logo}
              alt={branding.companyName || "Logo"}
              style={styles.logo}
              data-testid="img-company-logo-lobby"
            />
          </div>
        )}

        {branding.showCompanyName && branding.companyName && (
          <p style={styles.companyName} data-testid="text-company-name-lobby">
            {branding.companyName}
          </p>
        )}

        <h1 style={styles.title} data-testid="text-lobby-title">
          {lobby.title}
        </h1>

        <p style={styles.meetingTitle} data-testid="text-meeting-title">
          {meetingData?.titulo || 'Reunião'}
        </p>

        {lobby.showCameraPreview !== false && (
          <div style={styles.videoContainer}>
            {stream && isVideoEnabled ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={styles.video}
              />
            ) : (
              <div style={styles.videoPlaceholder}>
                <div style={styles.avatarCircle}>
                  <svg style={styles.avatarIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
              </div>
            )}

            <div style={styles.controlsRow}>
              <button
                style={{
                  ...styles.controlButton,
                  backgroundColor: isVideoEnabled ? colors.controlsBackground : colors.dangerButton,
                }}
                onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                data-testid="button-toggle-video"
              >
                {isVideoEnabled ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.controlsText} strokeWidth="2">
                    <path d="M23 7l-7 5 7 5V7z"/>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.controlsText} strokeWidth="2">
                    <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                )}
              </button>

              <button
                style={{
                  ...styles.controlButton,
                  backgroundColor: isAudioEnabled ? colors.controlsBackground : colors.dangerButton,
                }}
                onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                data-testid="button-toggle-audio"
              >
                {isAudioEnabled ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.controlsText} strokeWidth="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.controlsText} strokeWidth="2">
                    <line x1="1" y1="1" x2="23" y2="23"/>
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}

        <div style={styles.formGroup}>
          <label style={styles.label}>Seu nome</label>
          <input
            type="text"
            style={styles.input}
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Digite seu nome..."
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            data-testid="input-participant-name"
          />
        </div>

        {tokenError && (
          <p style={styles.errorText}>{tokenError}</p>
        )}

        <button
          style={{
            ...styles.primaryButton,
            opacity: !userName.trim() ? 0.6 : 1,
          }}
          onClick={handleJoin}
          disabled={!userName.trim()}
          data-testid="button-join-meeting"
        >
          {lobby.buttonText || 'Participar agora'}
        </button>
      </div>
    </div>
  );
};

export default PublicMeetingApp;
