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
 * ║  - React core (useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense) ║
 * ║  - Native fetch() for API calls                                           ║
 * ║  - Inline CSS (no external CSS imports)                                   ║
 * ║  - 100ms SDK (lazy loaded only when needed)                               ║
 * ║                                                                           ║
 * ║  🔧 OPTIMIZATIONS:                                                         ║
 * ║  - 100ms SDK preloaded while user fills name (before join click)          ║
 * ║  - Camera initialization delayed 100ms for UI to render first             ║
 * ║  - Uses combined /full-public endpoint (1 request vs 2)                   ║
 * ║  - Backend cache: 2 min TTL for meeting data                              ║
 * ║  - Auto-fetches participant name from URL params (fsid/pid)               ║
 * ║                                                                           ║
 * ║  📖 Full documentation: docs/PUBLIC_FORM_PERFORMANCE_FIX.md               ║
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
    buttonTextColor?: string;
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
    buttonTextColor: '#ffffff',
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

const preloadMeeting100ms = () => {
  import("@/components/Meeting100ms");
};

const PublicMeetingApp = () => {
  const [meetingData, setMeetingData] = useState<MeetingData | null>(null);
  const [roomDesign, setRoomDesign] = useState<RoomDesignConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [participantNameFromServer, setParticipantNameFromServer] = useState<string | null>(null);
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
    
    const twoSegmentPattern = /^\/reuniao\/[^/?]+\/([^/?]+)/;
    const twoSegmentPublicaPattern = /^\/reuniao-publica\/[^/?]+\/([^/?]+)/;
    const oneSegmentPattern = /^\/reuniao-publica\/([^/?]+)/;
    
    let match = path.match(twoSegmentPattern);
    if (match) {
      return match[1].split('?')[0].split('%3F')[0];
    }
    
    match = path.match(twoSegmentPublicaPattern);
    if (match) {
      return match[1].split('?')[0].split('%3F')[0];
    }
    
    match = path.match(oneSegmentPattern);
    if (match) {
      return match[1].split('?')[0].split('%3F')[0];
    }
    
    const uuidPattern = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
    match = path.match(uuidPattern);
    if (match) {
      return match[1];
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
        const response = await fetch(`/api/public/reunioes/${meetingId}/full-public`);

        if (!response.ok) {
          throw new Error('Reunião não encontrada');
        }

        const data = await response.json();
        
        setMeetingData(data.meeting);

        if (data.roomDesignConfig) {
          setRoomDesign({
            branding: { ...DEFAULT_CONFIG.branding, ...data.roomDesignConfig.branding },
            colors: { ...DEFAULT_CONFIG.colors, ...data.roomDesignConfig.colors },
            lobby: { ...DEFAULT_CONFIG.lobby, ...data.roomDesignConfig.lobby },
            endScreen: { ...DEFAULT_CONFIG.endScreen, ...data.roomDesignConfig.endScreen },
          });
        }

        const searchParams = new URLSearchParams(window.location.search);
        const fsid = searchParams.get('fsid');
        const pid = searchParams.get('pid');

        if (fsid || pid) {
          try {
            const params = new URLSearchParams();
            if (fsid) params.set('fsid', fsid);
            if (pid) params.set('pid', pid);

            const participantRes = await fetch(
              `/api/public/reunioes/${meetingId}/participant-data?${params.toString()}`
            );

            if (participantRes.ok) {
              const participantData = await participantRes.json();
              if (participantData.found && participantData.data?.nome) {
                const name = participantData.data.nome;
                setUserName(name);
                setParticipantNameFromServer(name);
              }
            }
          } catch (err) {
            console.log('[Lobby] Could not fetch participant data:', err);
          }
        }

        const autoJoin = searchParams.get('autoJoin');
        const botName = searchParams.get('botName');
        const isRecordingBot = searchParams.get('isRecordingBot') === 'true';

        if (isRecordingBot && botName) {
          setUserName(botName);
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
    if (step === 'lobby' && meetingData && !loading) {
      preloadMeeting100ms();
    }
  }, [step, meetingData, loading]);

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

    const CSS_STYLE_ID = 'meeting-global-css';
    if (!document.getElementById(CSS_STYLE_ID)) {
      try {
        await import('./index.css');
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

  const hexToLuminance = (hex: string): number => {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16) / 255;
    const g = parseInt(h.substring(2, 4), 16) / 255;
    const b = parseInt(h.substring(4, 6), 16) / 255;
    const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  };

  const getContrastRatio = (c1: string, c2: string): number => {
    const l1 = hexToLuminance(c1);
    const l2 = hexToLuminance(c2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  };

  const resolvedButtonTextColor = colors.buttonTextColor || (() => {
    const bg = colors.primaryButton || '#3b82f6';
    const bgLum = hexToLuminance(bg);
    return bgLum > 0.5 ? '#000000' : '#ffffff';
  })();

  const normalizeHex = (hex: string): string => {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return '3b82f6';
    return h;
  };

  const hexToRgb = (hex: string) => {
    const h = normalizeHex(hex);
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16),
    };
  };

  const bgLum = hexToLuminance(colors.background || '#0f172a');
  const isLightBg = bgLum > 0.4;
  const inputBg = isLightBg ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)';
  const inputBorder = isLightBg ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.13)';
  const inputTextColor = isLightBg ? '#1a1a1a' : '#fafafa';
  const placeholderColor = isLightBg ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)';
  const labelColor = isLightBg ? 'rgba(0,0,0,0.7)' : 'rgba(250,250,250,0.8)';

  const disabledButtonBg = (() => {
    const { r, g, b } = hexToRgb(colors.primaryButton || '#3b82f6');
    return `rgba(${r},${g},${b},0.35)`;
  })();

  const styles: Record<string, React.CSSProperties> = {
    fullPage: {
      minHeight: '100dvh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: colors.background,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      overflow: 'hidden',
    },
    lobbyContent: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      padding: '12px 16px',
      maxWidth: '560px',
      width: '100%',
      margin: '0 auto',
      boxSizing: 'border-box' as const,
    },
    logoRow: {
      display: 'flex',
      justifyContent: 'flex-start',
      alignItems: 'center',
      padding: '12px 16px 8px 16px',
    },
    logo: {
      height: `${branding.logoSize || 60}px`,
      maxWidth: '200px',
      objectFit: 'contain' as const,
    },
    videoSection: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      minHeight: 0,
      width: '100%',
    },
    videoContainer: {
      position: 'relative' as const,
      width: '100%',
      aspectRatio: '3/4',
      maxHeight: 'calc(100dvh - 280px)',
      borderRadius: '16px',
      overflow: 'hidden',
      backgroundColor: colors.controlsBackground,
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
      backgroundColor: colors.avatarBackground + '33',
    },
    avatarCircle: {
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      backgroundColor: colors.primaryButton,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    controlsRow: {
      position: 'absolute' as const,
      bottom: '12px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '12px',
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
      transition: 'transform 0.15s',
      backdropFilter: 'blur(8px)',
    },
    bottomSection: {
      flexShrink: 0,
      paddingTop: '16px',
      paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
      width: '100%',
    },
    welcomeText: {
      fontSize: '17px',
      fontWeight: 600,
      color: colors.controlsText,
      marginBottom: '16px',
      textAlign: 'center' as const,
    },
    formGroup: {
      marginBottom: '12px',
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: 500,
      color: labelColor,
      marginBottom: '6px',
    },
    input: {
      width: '100%',
      padding: '14px 16px',
      fontSize: '16px',
      borderRadius: '12px',
      border: `1px solid ${inputBorder}`,
      backgroundColor: inputBg,
      color: inputTextColor,
      outline: 'none',
      boxSizing: 'border-box' as const,
    },
    primaryButton: {
      width: '100%',
      padding: '16px 24px',
      fontSize: '17px',
      fontWeight: 600,
      borderRadius: '12px',
      border: 'none',
      backgroundColor: colors.primaryButton,
      color: resolvedButtonTextColor,
      cursor: 'pointer',
      transition: 'transform 0.15s, opacity 0.15s',
    },
    errorText: {
      color: colors.dangerButton,
      fontSize: '14px',
      marginTop: '8px',
      marginBottom: '8px',
      textAlign: 'center' as const,
    },
    centeredCard: {
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
      maxWidth: '440px',
      padding: '32px',
      borderRadius: '16px',
      backgroundColor: colors.controlsBackground,
      boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
    },
    title: {
      fontSize: '20px',
      fontWeight: 700,
      color: colors.controlsText,
      textAlign: 'center' as const,
      marginBottom: '8px',
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
      <div style={styles.fullPage}>
        <style>{`
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
        <div style={styles.lobbyContent}>
          <div style={{ ...styles.skeleton, width: '100px', height: '36px', marginBottom: '16px' }} />
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <div style={{ ...styles.skeleton, width: '100%', height: '60%', borderRadius: '16px' }} />
          </div>
          <div style={{ paddingTop: '16px' }}>
            <div style={{ ...styles.skeleton, height: '48px', marginBottom: '12px', borderRadius: '12px' }} />
            <div style={{ ...styles.skeleton, height: '52px', borderRadius: '12px' }} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centeredCard}>
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
      <div style={styles.centeredCard}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
              <div style={{ ...styles.loadingSpinner, width: '28px', height: '28px' }} />
            </div>
            <h2 style={{ ...styles.title, fontSize: '20px', marginBottom: '8px' }}>Conectando...</h2>
            <p style={{ color: colors.controlsText, opacity: 0.7, fontSize: '14px' }}>
              Preparando a sala de reunião
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'meeting' && token100ms && meetingData?.roomId100ms) {
    return (
      <Suspense fallback={
        <div style={styles.centeredCard}>
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
      <div style={styles.centeredCard}>
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
    <div style={styles.fullPage}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        [data-testid="input-participant-name"]::placeholder { color: ${placeholderColor}; opacity: 1; }
        @media (max-width: 640px) {
          .meeting-logo-row { justify-content: center !important; }
          .meeting-lobby-content { align-items: center !important; }
        }
      `}</style>
      {branding.showLogoInLobby && branding.logo && (
        <div className="meeting-logo-row" style={styles.logoRow}>
          <img
            src={branding.logo}
            alt={branding.companyName || "Logo"}
            style={styles.logo}
            data-testid="img-company-logo-lobby"
          />
        </div>
      )}
      <div className="meeting-lobby-content" style={styles.lobbyContent}>
        {lobby.showCameraPreview !== false && (
          <div style={styles.videoSection}>
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
                    <svg style={{ width: '40px', height: '40px', color: colors.avatarText }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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
                    backgroundColor: isVideoEnabled 
                      ? colors.controlsBackground + 'cc' 
                      : colors.dangerButton,
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
                    backgroundColor: isAudioEnabled 
                      ? colors.controlsBackground + 'cc' 
                      : colors.dangerButton,
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
          </div>
        )}

        <div style={styles.bottomSection}>
          {participantNameFromServer ? (
            <p style={styles.welcomeText} data-testid="text-welcome-participant">
              Bem-vindo(a), {participantNameFromServer}
            </p>
          ) : (
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
          )}

          {tokenError && (
            <p style={styles.errorText}>{tokenError}</p>
          )}

          <button
            style={{
              ...styles.primaryButton,
              backgroundColor: !userName.trim() ? disabledButtonBg : colors.primaryButton,
              cursor: !userName.trim() ? 'default' : 'pointer',
            }}
            onClick={handleJoin}
            disabled={!userName.trim()}
            data-testid="button-join-meeting"
          >
            {lobby.buttonText || 'Participar agora'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublicMeetingApp;
