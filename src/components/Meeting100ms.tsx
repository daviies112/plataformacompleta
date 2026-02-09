import { useEffect, useRef, useState, useCallback } from "react";
import {
  useHMSStore,
  useHMSActions,
  useVideo,
  useHMSNotifications,
  HMSNotificationTypes,
  selectPeers,
  selectIsConnectedToRoom,
  selectIsLocalAudioEnabled,
  selectIsLocalVideoEnabled,
  selectIsLocalScreenShared,
  selectRoom,
  selectRoomState,
  selectLocalPeer,
  HMSPeer,
  HMSRoomState,
  HMSRoomProvider,
} from "@100mslive/react-sdk";
import { Mic, MicOff, Video, VideoOff, PhoneOff, MonitorUp, MonitorOff, Circle, Copy, Check, Share2, FileSignature, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import type { RoomDesignConfig } from "@/types/reuniao";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface Meeting100msProps {
  roomId: string;
  userName: string;
  authToken: string;
  onLeave: () => void;
  config: RoomDesignConfig;
  meetingId?: string;
}

function PeerVideo({
  peer,
  config,
  totalPeers,
}: {
  peer: HMSPeer;
  config: RoomDesignConfig;
  totalPeers: number;
}) {
  const { videoRef } = useVideo({
    trackId: peer.videoTrack,
  });

  const isVideoOff = !peer.videoTrack;

  const isRecordingBot = window.location.search.includes("recording_bot=true") || 
                        window.location.search.includes("recording=true") ||
                        window.location.search.includes("auto_join=true");

  // Get participant identifiers from URL
  const searchParams = new URLSearchParams(window.location.search);
  const participantEmail = searchParams.get("email");
  const participantPhone = searchParams.get("phone");
  const participantCpf = searchParams.get("cpf");

  return (
    <Card 
      className={cn(
        "relative aspect-video overflow-hidden border-white/5 shadow-2xl transition-all duration-300",
        totalPeers === 1 ? "w-full max-w-4xl mx-auto" : "w-full",
        isRecordingBot && "border-none shadow-none"
      )}
      style={{ 
        backgroundColor: isRecordingBot ? "#000000" : (config?.colors?.controlsBackground || "#18181b"),
      }}
    >
      <div 
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity duration-500 z-0",
          (!isVideoOff || isRecordingBot) ? "opacity-0" : "opacity-100"
        )}
        style={{ backgroundColor: isRecordingBot ? "#000000" : (config?.colors?.background || "#0f172a") }}
      >
        <div 
          className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold border-4 border-white/10 shadow-xl"
          style={{ 
            backgroundColor: config?.colors?.avatarBackground || "#3b82f6",
            color: config?.colors?.avatarText || "#ffffff" 
          }}
        >
          {peer.name?.charAt(0).toUpperCase() || "?"}
        </div>
      </div>

      <video
        ref={videoRef}
        autoPlay
        muted={peer.isLocal}
        playsInline
        className={cn(
          "absolute inset-0 w-full h-full object-cover transition-opacity duration-500 z-10",
          (isVideoOff && !isRecordingBot) ? "opacity-0" : "opacity-100",
          peer.isLocal && "transform scale-x-[-1]"
        )}
      />

      {!isRecordingBot && (
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-none">
          <div 
            className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 backdrop-blur-md border border-white/10 shadow-lg"
            style={{ 
              backgroundColor: config?.colors?.participantNameBackground || "rgba(0, 0, 0, 0.6)",
              color: config?.colors?.participantNameText || "#ffffff" 
            }}
          >
            <span className="truncate max-w-[150px]">{peer.name} {peer.isLocal && "(Você)"}</span>
            {!peer.audioTrack && <MicOff className="w-3 h-3 text-red-500" />}
          </div>
        </div>
      )}
    </Card>
  );
}

function ScreenShareFullView({
  peer,
  trackId,
}: {
  peer: HMSPeer;
  trackId: string;
}) {
  const { videoRef } = useVideo({ trackId });

  return (
    <div className="w-full h-full relative">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-contain"
      />
      <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg text-xs font-bold bg-black/60 text-white backdrop-blur-md z-20">
        Tela de {peer.name}
      </div>
    </div>
  );
}

function PeerVideoMini({
  peer,
  config,
}: {
  peer: HMSPeer;
  config: RoomDesignConfig;
}) {
  const { videoRef } = useVideo({ trackId: peer.videoTrack });
  const isVideoOff = !peer.videoTrack;

  return (
    <div 
      className="w-40 h-28 sm:w-48 sm:h-32 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl relative"
      style={{ backgroundColor: config?.colors?.controlsBackground || "#18181b" }}
    >
      {isVideoOff && (
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ backgroundColor: config?.colors?.background || "#0f172a" }}
        >
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
            style={{ 
              backgroundColor: config?.colors?.avatarBackground || "#3b82f6",
              color: config?.colors?.avatarText || "#ffffff" 
            }}
          >
            {peer.name?.charAt(0).toUpperCase() || "?"}
          </div>
        </div>
      )}
      <video
        ref={videoRef}
        autoPlay
        muted={peer.isLocal}
        playsInline
        className={cn(
          "w-full h-full object-cover",
          isVideoOff ? "opacity-0" : "opacity-100",
          peer.isLocal && "transform scale-x-[-1]"
        )}
      />
      <div className="absolute bottom-1 left-1 px-2 py-0.5 rounded text-[10px] font-bold bg-black/60 text-white z-10">
        {peer.name} {peer.isLocal && "(Você)"}
      </div>
    </div>
  );
}

export function Meeting100ms({
  roomId,
  userName,
  authToken,
  onLeave,
  config,
  meetingId,
}: Meeting100msProps) {
  const hmsActions = useHMSActions();
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const peers = useHMSStore(selectPeers);
  const isAudioEnabled = useHMSStore(selectIsLocalAudioEnabled);
  const isVideoEnabled = useHMSStore(selectIsLocalVideoEnabled);
  const isScreenShared = useHMSStore(selectIsLocalScreenShared);
  const room = useHMSStore(selectRoom);
  const roomState = useHMSStore(selectRoomState);
  
  // CRÍTICO: Capturar notificações/erros do SDK 100ms
  const notification = useHMSNotifications();

  const localPeer = useHMSStore(selectLocalPeer);
  const isHost = localPeer?.roleName === 'host';
  const canRecord = true;
  const canShare = isHost || localPeer?.roleName === 'guest' || config.meeting?.enableScreenShare !== false;
  
  // Usar cores da configuração para os controles
  const controlStyles = {
    backgroundColor: config.colors.controlsBackground,
    color: config.colors.controlsText,
    borderColor: `${config.colors.controlsText}20`
  };

  const tenantId = (room as any)?.tenantId;
  
  // Encontrar o track de compartilhamento de tela
  const screenSharePeer = peers.find(p => p.auxiliaryTracks.length > 0);
  const screenShareTrackId = screenSharePeer?.auxiliaryTracks[0];
  
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [showSharePopup, setShowSharePopup] = useState(false);
  const sharePopupRef = useRef<HTMLDivElement>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [canRetry, setCanRetry] = useState(false);
  const [sdkError, setSdkError] = useState<{ code: string; message: string } | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const hasAttemptedJoin = useRef(false);
  const joinTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Estado para controlar se a reunião tem formulário associado (botão Assinar sempre visível)
  const [hasFormSubmission, setHasFormSubmission] = useState<boolean | null>(true);
  
  // Processar notificações do SDK para tratamento de erros (silenciado para performance)
  useEffect(() => {
    if (!notification) return;
    
    switch (notification.type) {
      case HMSNotificationTypes.ERROR:
        const errorData = notification.data as any;
        const errorMsg = errorData?.message || errorData?.description || "Erro de conexão com a sala";
        const errorCode = errorData?.code?.toString() || "UNKNOWN";
        
        const criticalCodes = ['401', '403', '404', '500', '4001', '4002', '4003', '4004', '4005', '4100', '4101'];
        const isCritical = criticalCodes.some(code => errorCode.includes(code)) || 
                          errorMsg.toLowerCase().includes('token') ||
                          errorMsg.toLowerCase().includes('permission') ||
                          errorMsg.toLowerCase().includes('room');
        
        if (isCritical) {
          setSdkError({ code: errorCode, message: errorMsg });
          setIsJoining(false);
          setCanRetry(true);
        }
        break;
        
      case HMSNotificationTypes.RECONNECTING:
        setIsReconnecting(true);
        break;
        
      case HMSNotificationTypes.RECONNECTED:
        setIsReconnecting(false);
        setSdkError(null);
        break;
    }
  }, [notification]);

  useEffect(() => {
    // CRÍTICO: Não tentar join se não temos token válido
    if (!authToken || authToken.length < 10) return;
    if (hasAttemptedJoin.current) return;
    hasAttemptedJoin.current = true;
    
    const isBot = window.location.search.includes("recording_bot=true") || 
                  window.location.search.includes("recording=true");
    
    if (isBot) {
      hmsActions.setLocalAudioEnabled(true).catch(() => {});
      hmsActions.setLocalVideoEnabled(true).catch(() => {});
    }

    let isMounted = true;
    
    const joinRoom = async (attempt: number = 0) => {
      if (!isMounted) return;
      
      try {
        if (joinTimeoutRef.current) clearTimeout(joinTimeoutRef.current);
        
        // Timeout reduzido para 5s para falhar mais rápido
        joinTimeoutRef.current = setTimeout(() => {
          if (isMounted && attempt < 2) {
            setConnectionAttempts(attempt + 1);
            hasAttemptedJoin.current = false;
            joinRoom(attempt + 1);
          } else if (isMounted) {
            setError("Timeout ao conectar à reunião. Verifique sua conexão e tente novamente.");
            setIsJoining(false);
            setCanRetry(true);
          }
        }, 5000);
        
        // Join otimizado com settings mínimos
        await hmsActions.join({
          userName,
          authToken,
          settings: { isAudioMuted: false, isVideoMuted: false },
          rememberDeviceSelection: false // Desabilita para acelerar
        });
        
      } catch (err: any) {
        if (joinTimeoutRef.current) {
          clearTimeout(joinTimeoutRef.current);
          joinTimeoutRef.current = null;
        }
        if (isMounted) {
          setError(err.message || "Erro ao conectar");
          setIsJoining(false);
          setCanRetry(true);
        }
      }
    };
    
    joinRoom(0);
    
    return () => { 
      isMounted = false; 
      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current);
        joinTimeoutRef.current = null;
      }
    };
  }, [hmsActions, authToken, userName, roomId]);

  useEffect(() => {
    if (isConnected && isJoining) {
      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current);
        joinTimeoutRef.current = null;
      }
      setIsJoining(false);
    }
  }, [isConnected, isJoining, peers]);

  useEffect(() => {
    return () => {
      if (isConnected) {
        hmsActions.leave().catch(() => {});
      }
    };
  }, [hmsActions, isConnected]);

  const toggleAudio = useCallback(async () => {
    try {
      await hmsActions.setLocalAudioEnabled(!isAudioEnabled);
    } catch (err: any) {
      toast.error("Erro no áudio: " + err.message);
    }
  }, [hmsActions, isAudioEnabled]);

  const toggleVideo = useCallback(async () => {
    try {
      await hmsActions.setLocalVideoEnabled(!isVideoEnabled);
    } catch (err: any) {
      toast.error("Erro no vídeo: " + err.message);
    }
  }, [hmsActions, isVideoEnabled]);
  
  const toggleScreenShare = useCallback(async () => {
    try {
      await hmsActions.setScreenShareEnabled(!isScreenShared);
      if (!isScreenShared) {
        toast.success("Compartilhamento de tela iniciado");
      } else {
        toast.success("Compartilhamento de tela encerrado");
      }
    } catch (err: any) {
      // Verificando se o erro é de permissão ou cancelamento
      if (err.message?.includes("Permission denied") || err.message?.includes("cancelled")) {
        toast.error("Compartilhamento cancelado ou negado");
      } else {
        // Se o erro for de permissão da role, avisar o usuário
        if (err.message?.includes("not allowed to publish screen")) {
          toast.error("Sua permissão não permite compartilhar tela.");
        } else {
          toast.error("Erro na tela: " + err.message);
        }
      }
    }
  }, [hmsActions, isScreenShared]);

  const [companySlug, setCompanySlug] = useState<string>("");

  useEffect(() => {
    // Tenta extrair o company slug da URL se não estiver no config
    const pathParts = window.location.pathname.split("/");
    const reuniaoIdx = pathParts.indexOf("reuniao");
    if (reuniaoIdx !== -1 && pathParts[reuniaoIdx + 1]) {
      setCompanySlug(pathParts[reuniaoIdx + 1]);
    } else if (config?.branding?.companyName) {
      setCompanySlug(config.branding.companyName.toLowerCase().replace(/\s+/g, "-"));
    }
  }, [config]);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingId, setRecordingId] = useState<string | null>(null);

  // Sincronizar estado de gravação com o backend ao carregar
  useEffect(() => {
    const checkRecordingStatus = async () => {
      try {
        const currentRoomId = roomId || window.location.pathname.split('/').pop();
        const response = await fetch(`/api/100ms/recording/${currentRoomId}`);
        if (response.ok) {
          const list = await response.json();
          const active = list.find((r: any) => r.status === 'recording');
          if (active) {
            setIsRecording(true);
            setRecordingId(active.recordingId100ms);
          }
        }
      } catch (err) {
        console.error("Erro ao verificar status da gravação:", err);
      }
    };
    checkRecordingStatus();
  }, [roomId]);

  const handleToggleRecording = async () => {
    try {
      const currentRoomId = roomId || window.location.pathname.split('/').pop();
      
      if (!isRecording) {
        setIsRecording(true); // Feedback visual imediato
        const response = await fetch('/api/100ms/recording/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId: currentRoomId, meetingId }),
        });

        if (!response.ok) {
          setIsRecording(false);
          throw new Error('Erro ao iniciar gravação');
        }

        const data = await response.json();
        setRecordingId(data.recordingId);
        toast.success("Gravação iniciada!");
      } else {
        const response = await fetch('/api/100ms/recording/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId: currentRoomId, meetingId }),
        });

        if (!response.ok) throw new Error('Erro ao parar gravação');

        setIsRecording(false);
        setRecordingId(null);
        toast.success("Gravação parada! O video sera processado em breve.");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sharePopupRef.current && !sharePopupRef.current.contains(e.target as Node)) {
        setShowSharePopup(false);
      }
    };
    if (showSharePopup) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSharePopup]);

  const copyLink = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    toast.success("Link da reunião copiado!");
    setTimeout(() => setIsCopied(false), 2000);
  }, []);

  const shareToWhatsApp = useCallback(() => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://wa.me/?text=${url}`, "_blank");
    setShowSharePopup(false);
  }, []);

  const shareToTelegram = useCallback(() => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://t.me/share/url?url=${url}`, "_blank");
    setShowSharePopup(false);
  }, []);

  const nativeShare = useCallback(async () => {
    try {
      await navigator.share({ url: window.location.href, title: "Reunião" });
    } catch {}
    setShowSharePopup(false);
  }, []);

  const handleLeave = useCallback(async () => {
    await hmsActions.leave();
    onLeave();
  }, [hmsActions, onLeave]);

  const handleRetry = useCallback(async () => {
    setError(null);
    setIsJoining(true);
    setCanRetry(false);
    setConnectionAttempts(0);
    
    const retryTimeout = setTimeout(() => {
      setError("Timeout ao reconectar. Verifique sua conexão.");
      setIsJoining(false);
      setCanRetry(true);
    }, 10000);
    
    try {
      await hmsActions.join({
        userName,
        authToken,
        settings: { isAudioMuted: false, isVideoMuted: false },
        rememberDeviceSelection: false
      });
      clearTimeout(retryTimeout);
    } catch (err: any) {
      clearTimeout(retryTimeout);
      setError(err.message || "Erro ao reconectar");
      setIsJoining(false);
      setCanRetry(true);
    }
  }, [hmsActions, userName, authToken]);

  // Mostrar tela de erro do SDK se houver
  if (sdkError) {
    return (
      <div className="h-screen flex items-center justify-center p-4 bg-[#09090b]">
        <Card className="p-8 max-w-md w-full text-center bg-zinc-900 border-zinc-800">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-white">Erro de Conexao</h2>
          <p className="text-zinc-400 mb-2 text-sm">{sdkError.message}</p>
          <p className="text-zinc-500 mb-6 text-xs font-mono">Codigo: {sdkError.code}</p>
          <div className="flex flex-col gap-3">
            <Button onClick={handleRetry} className="w-full" data-testid="button-retry-sdk-error">
              Tentar Novamente
            </Button>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              className="w-full"
              data-testid="button-reload-sdk-error"
            >
              Recarregar Pagina
            </Button>
          </div>
          <p className="text-zinc-600 text-[10px] mt-4">
            Se o problema persistir, entre em contato com o organizador da reuniao.
          </p>
        </Card>
      </div>
    );
  }

  // Mostrar tela de erro se houver
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center p-4 bg-[#09090b]">
        <Card className="p-8 max-w-md w-full text-center bg-zinc-900 border-zinc-800">
          <h2 className="text-xl font-bold mb-2 text-white">Erro ao conectar</h2>
          <p className="text-zinc-400 mb-6 text-sm">{error}</p>
          <div className="flex flex-col gap-3">
            {canRetry && (
              <Button onClick={handleRetry} className="w-full" data-testid="button-retry-connection">
                Tentar Novamente
              </Button>
            )}
            <Button 
              onClick={() => window.location.reload()} 
              variant={canRetry ? "outline" : "default"}
              className="w-full"
              data-testid="button-reload-page"
            >
              Recarregar Pagina
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Mostrar tela de conexão enquanto está conectando
  if (isJoining || !isConnected) {
    return (
      <div className="h-screen flex flex-col items-center justify-center" style={{ backgroundColor: "#09090b" }}>
        <div 
          className="w-16 h-16 border-4 border-t-transparent animate-spin rounded-full mb-6"
          style={{ borderColor: "#3b82f6", borderTopColor: "transparent" }}
        />
        <p className="text-xl font-bold mb-2" style={{ color: "#ffffff" }}>Conectando à reunião...</p>
        <p className="text-sm opacity-70" style={{ color: "#94a3b8" }}>
          {connectionAttempts > 0 ? `Tentativa ${connectionAttempts + 1}...` : "Aguarde enquanto preparamos a sala"}
        </p>
        {connectionAttempts > 0 && (
          <p className="text-xs mt-4 opacity-50" style={{ color: "#94a3b8" }}>
            Se demorar muito, verifique sua conexão com a internet
          </p>
        )}
      </div>
    );
  }

  const gridClass = peers.length === 1 ? "max-w-4xl" : 
                    peers.length === 2 ? "grid-cols-1 md:grid-cols-2" : 
                    peers.length <= 4 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-3";

  const isRecordingBot = window.location.search.includes("recording_bot=true") || 
                        window.location.search.includes("recording=true") ||
                        window.location.search.includes("auto_join=true");

  const containerStyle = {
    backgroundColor: isRecordingBot ? "#000000" : config?.colors?.background || "#09090b",
  };

  const headerStyle = {
    backgroundColor: `${config?.colors?.controlsBackground || "#18181b"}66`,
    borderColor: `${config?.colors?.controlsText || "#ffffff"}0d`,
    backdropFilter: 'blur(24px)',
  };

  const footerStyle = {
    backgroundColor: `${config?.colors?.controlsBackground || "#18181b"}e6`,
    borderColor: `${config?.colors?.controlsText || "#ffffff"}33`,
    backdropFilter: 'blur(24px)',
  };

  const controlButtonStyle = (active: boolean = false, isDanger: boolean = false) => ({
    backgroundColor: isDanger 
      ? config?.colors?.dangerButton || "#ef4444" 
      : active 
        ? config?.colors?.primaryButton || "#3b82f6" 
        : `${config?.colors?.controlsBackground || "#18181b"}80`,
    color: "#ffffff",
  });

  return (
    <TooltipProvider>
      <div 
        className={cn("flex flex-col h-screen overflow-hidden", isRecordingBot && "bg-black")}
        style={containerStyle}
      >
        {!isRecordingBot && (
          <header 
            className="h-14 px-3 sm:px-6 border-b flex items-center justify-between z-20"
            style={headerStyle}
          >
            <div className="flex items-center gap-3">
              {config?.branding?.showLogoInMeeting && config?.branding?.logo ? (
                <img
                  src={config.branding.logo}
                  alt={config?.branding?.companyName || "Logo"}
                  loading="lazy"
                  className="object-contain sm:!max-w-[120px]"
                  data-testid="img-company-logo-meeting"
                  style={{ 
                    maxHeight: Math.min(config?.branding?.logoSize || 32, 40),
                    maxWidth: "90px"
                  }}
                />
              ) : (
                <div 
                  className="w-7 h-7 rounded-lg flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: config?.colors?.primaryButton || "#3b82f6" }}
                >
                  <Video className="h-4 w-4 text-white" />
                </div>
              )}
              <div className="flex flex-col">
                {config?.branding?.showCompanyName && config?.branding?.companyName && (
                  <span className="font-bold text-white text-xs leading-none" data-testid="text-company-name-meeting">
                    {config.branding.companyName}
                  </span>
                )}
                {isRecording && (
                  <div className="flex items-center gap-1 mt-0.5 animate-pulse">
                    <Circle className="h-1.5 w-1.5 fill-red-500 text-red-500" />
                    <span className="text-[9px] text-red-500 font-bold uppercase tracking-wider">Gravando</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-4 relative" ref={sharePopupRef}>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowSharePopup(!showSharePopup)}
                className="px-3 py-1.5 h-8 rounded-full flex items-center gap-2 text-[10px] font-bold text-white transition-all"
                style={{ backgroundColor: `${config?.colors?.controlsBackground || "#18181b"}66` }}
                data-testid="button-share-meeting"
              >
                <Share2 className="h-3 w-3" />
                <span className="hidden sm:inline">COMPARTILHAR</span>
              </Button>

              {showSharePopup && (
                <div
                  className="absolute top-12 right-0 w-64 rounded-2xl border p-4 shadow-2xl z-50"
                  style={{
                    backgroundColor: `${config?.colors?.controlsBackground || "#18181b"}f2`,
                    borderColor: `${config?.colors?.controlsText || "#ffffff"}1a`,
                    backdropFilter: "blur(24px)",
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold" style={{ color: config?.colors?.controlsText || "#ffffff" }}>
                      Compartilhar
                    </span>
                    <button
                      onClick={() => setShowSharePopup(false)}
                      className="rounded-full p-1 transition-colors"
                      style={{ color: `${config?.colors?.controlsText || "#ffffff"}80` }}
                      data-testid="button-close-share-popup"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => { copyLink(); setShowSharePopup(false); }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                      style={{
                        backgroundColor: `${config?.colors?.controlsText || "#ffffff"}0d`,
                        color: config?.colors?.controlsText || "#ffffff",
                      }}
                      data-testid="button-share-copy-link"
                    >
                      {isCopied ? <Check className="h-4 w-4 text-green-500 shrink-0" /> : <Copy className="h-4 w-4 shrink-0" />}
                      <span>{isCopied ? "Link copiado!" : "Copiar link"}</span>
                    </button>

                    <button
                      onClick={shareToWhatsApp}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                      style={{
                        backgroundColor: `${config?.colors?.controlsText || "#ffffff"}0d`,
                        color: config?.colors?.controlsText || "#ffffff",
                      }}
                      data-testid="button-share-whatsapp"
                    >
                      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      <span>WhatsApp</span>
                    </button>

                    <button
                      onClick={shareToTelegram}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                      style={{
                        backgroundColor: `${config?.colors?.controlsText || "#ffffff"}0d`,
                        color: config?.colors?.controlsText || "#ffffff",
                      }}
                      data-testid="button-share-telegram"
                    >
                      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0h-.056zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                      <span>Telegram</span>
                    </button>

                    {typeof navigator !== "undefined" && "share" in navigator && (
                      <button
                        onClick={nativeShare}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                        style={{
                          backgroundColor: `${config?.colors?.controlsText || "#ffffff"}0d`,
                          color: config?.colors?.controlsText || "#ffffff",
                        }}
                        data-testid="button-share-native"
                      >
                        <Share2 className="h-4 w-4 shrink-0" />
                        <span>Mais opções</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </header>
        )}

        <main className={cn("flex-1 overflow-hidden relative", isRecordingBot && "p-0")}>
          {screenSharePeer && screenShareTrackId ? (
            <>
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <ScreenShareFullView peer={screenSharePeer} trackId={screenShareTrackId} />
              </div>
              <div className="absolute bottom-24 right-4 z-30 flex flex-col gap-2">
                {peers.map((peer) => (
                  <PeerVideoMini key={peer.id} peer={peer} config={config} />
                ))}
              </div>
            </>
          ) : (
            <div className={cn("h-full p-4 flex flex-col items-center justify-center gap-6")}>
              <div className={cn("grid gap-6 w-full h-fit mx-auto", gridClass, isRecordingBot && "gap-0 max-w-full h-full")}>
                {peers.map((peer) => (
                  <PeerVideo key={peer.id} peer={peer} config={config} totalPeers={peers.length} />
                ))}
              </div>
            </div>
          )}
        </main>

        {!isRecordingBot && (
          <footer className="h-20 sm:h-24 px-2 sm:px-6 flex items-center justify-center z-50">
            <div 
              className="px-3 sm:px-6 py-2 sm:py-3 rounded-3xl flex items-center gap-1.5 sm:gap-3 border shadow-2xl relative"
              style={footerStyle}
            >
              <div className="flex items-center gap-1.5 sm:gap-3 relative z-50">
                <Button
                  onClick={toggleAudio}
                  variant="ghost"
                  size="icon"
                  className={cn("h-10 w-10 sm:h-12 sm:w-12 rounded-2xl transition-all duration-300 relative z-50")}
                  style={controlButtonStyle(isAudioEnabled, !isAudioEnabled)}
                  title={isAudioEnabled ? "Mudar áudio" : "Ativar áudio"}
                >
                  {isAudioEnabled ? <Mic className="h-4 w-4 sm:h-5 sm:w-5 pointer-events-none" /> : <MicOff className="h-4 w-4 sm:h-5 sm:w-5 pointer-events-none" />}
                </Button>

                <Button
                  onClick={toggleVideo}
                  variant="ghost"
                  size="icon"
                  className={cn("h-10 w-10 sm:h-12 sm:w-12 rounded-2xl transition-all duration-300 relative z-50")}
                  style={controlButtonStyle(isVideoEnabled, !isVideoEnabled)}
                  title={isVideoEnabled ? "Desligar câmera" : "Ligar câmera"}
                >
                  {isVideoEnabled ? <Video className="h-4 w-4 sm:h-5 sm:w-5 pointer-events-none" /> : <VideoOff className="h-4 w-4 sm:h-5 sm:w-5 pointer-events-none" />}
                </Button>

                <div 
                  className="h-6 sm:h-8 w-[1px] mx-0.5 sm:mx-1" 
                  style={{ backgroundColor: `${config?.colors?.controlsText || "#ffffff"}1a` }}
                />

                <Button
                  onClick={() => {
                    if (!canShare) {
                      toast.error("Somente o administrador pode compartilhar tela nesta sala.");
                      return;
                    }
                    toggleScreenShare();
                  }}
                  variant="ghost"
                  size="icon"
                  className={cn("h-10 w-10 sm:h-12 sm:w-12 rounded-2xl transition-all duration-300 relative z-50")}
                  style={controlButtonStyle(isScreenShared)}
                  title={isScreenShared ? "Parar compartilhamento" : "Compartilhar tela"}
                >
                  {isScreenShared ? <MonitorOff className="h-4 w-4 sm:h-5 sm:w-5 pointer-events-none" /> : <MonitorUp className="h-4 w-4 sm:h-5 sm:w-5 pointer-events-none" />}
                </Button>

                {canRecord && (
                  <Button
                    onClick={handleToggleRecording}
                    variant={isRecording ? "destructive" : "ghost"}
                    size="icon"
                    className={cn(
                      "h-10 w-10 sm:h-12 sm:w-12 rounded-2xl transition-all duration-300 relative z-50", 
                      isRecording && "shadow-lg shadow-red-500/20"
                    )}
                    style={controlButtonStyle(isRecording, isRecording)}
                    title={isRecording ? "Parar gravação" : "Iniciar gravação"}
                  >
                    <Circle className={cn("h-4 w-4 sm:h-5 sm:w-5 pointer-events-none", isRecording && "fill-white animate-pulse")} />
                  </Button>
                )}

                {/* Botão Assinar sempre visível - tenta encontrar formSubmissionId dinamicamente */}
                <div 
                  className="h-6 sm:h-8 w-[1px] mx-0.5 sm:mx-1" 
                  style={{ backgroundColor: `${config?.colors?.controlsText || "#ffffff"}1a` }}
                />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={async () => {
                    // IMPORTANTE: Abrir a janela ANTES das chamadas async para evitar bloqueio de popup
                    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                    let signatureWindow: Window | null = null;
                    
                    if (!isMobile) {
                      signatureWindow = window.open('about:blank', '_blank');
                    }
                    
                    try {
                      const pathParts = window.location.pathname.split('/').filter(Boolean);
                      const currentMeetingId = pathParts[pathParts.length - 1] || '';
                      
                      let formSubmissionId: string | undefined = undefined;
                      
                      // PRIMEIRO: Tentar obter fsid da URL diretamente
                      const urlSearchParams = new URLSearchParams(window.location.search);
                      const currentFsid = urlSearchParams.get("fsid");
                      if (currentFsid) {
                        formSubmissionId = currentFsid;
                      }
                      
                      // SEGUNDO: Buscar dados da reunião para obter o formSubmissionId dos metadados
                      if (!formSubmissionId) {
                        const fsidQueryString = currentFsid ? `?fsid=${currentFsid}` : '';
                        try {
                          const meetingResponse = await fetch(`/api/public/reunioes/${currentMeetingId}/public${fsidQueryString}`);
                          if (meetingResponse.ok) {
                            const meetingData = await meetingResponse.json();
                            if (meetingData?.metadata?.formSubmissionId) {
                              formSubmissionId = meetingData.metadata.formSubmissionId;
                            }
                          }
                        } catch (e) {}
                      }
                      
                      // TERCEIRO: Tentar via participant-data (fallback)
                      if (!formSubmissionId) {
                        try {
                          const participantResponse = await fetch(`/api/public/reunioes/${currentMeetingId}/participant-data`, {
                            credentials: 'include',
                          });
                          if (participantResponse.ok) {
                            const result = await participantResponse.json();
                            if (result.formSubmissionId) {
                              formSubmissionId = result.formSubmissionId;
                            }
                          }
                        } catch (e) {}
                      }
                      
                      const response = await fetch('/api/assinatura/public/contracts/from-meeting', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          meetingId: currentMeetingId,
                          formSubmissionId: formSubmissionId || undefined,
                          client_name: localPeer?.name || undefined,
                        }),
                      });

                      if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.error || 'Erro ao criar contrato');
                      }

                      const result = await response.json();
                      const contract = result.contract;
                      const signatureUrl = `/assinar/${contract.access_token}`;
                      
                      if (isMobile) {
                        toast.info("Redirecionando para assinatura...");
                        window.location.href = signatureUrl;
                      } else if (signatureWindow) {
                        signatureWindow.location.href = signatureUrl;
                        toast.success("Página de assinatura aberta!");
                      } else {
                        window.location.href = signatureUrl;
                      }
                    } catch (err: any) {
                      if (signatureWindow) signatureWindow.close();
                      toast.error(err.message || "Erro ao abrir página de assinatura");
                    }
                  }}
                  variant="ghost"
                  className="h-10 sm:h-12 px-3 sm:px-4 rounded-2xl font-bold text-white shadow-lg hover:scale-105 transition-transform relative z-50 flex items-center gap-2 text-xs sm:text-sm"
                  style={{ 
                    backgroundColor: config?.colors?.primaryButton || "#059669",
                    boxShadow: `0 10px 15px -3px ${config?.colors?.primaryButton}33`
                  }}
                  data-testid="button-assinar-contrato"
                >
                  <FileSignature className="h-5 w-5" />
                  <span className="hidden sm:inline">Assinar</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Abrir página de assinatura de contrato</p>
                  </TooltipContent>
                </Tooltip>

                <Button 
                  onClick={handleLeave}
                  variant="destructive" 
                  className="h-10 sm:h-12 px-4 sm:px-6 rounded-2xl font-bold shadow-lg hover:scale-105 transition-transform relative z-50 text-xs sm:text-sm"
                  style={{ 
                    backgroundColor: config?.colors?.dangerButton || "#ef4444",
                    boxShadow: `0 10px 15px -3px ${config?.colors?.dangerButton || "#ef4444"}33`
                  }}
                >
                  Sair
                </Button>
              </div>
            </div>
          </footer>
        )}
      </div>
    </TooltipProvider>
  );
}

/**
 * Wrapper component that provides HMSRoomProvider context
 * This ensures the 100ms SDK is only loaded when the meeting component is used,
 * improving initial page load times significantly on mobile devices.
 */
export function Meeting100msWithProvider(props: Meeting100msProps) {
  return (
    <HMSRoomProvider>
      <Meeting100ms {...props} />
    </HMSRoomProvider>
  );
}
