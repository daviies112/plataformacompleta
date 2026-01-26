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
  HMSPeer,
  HMSRoomState,
  HMSRoomProvider,
} from "@100mslive/react-sdk";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users, MonitorUp, MonitorOff, Circle, Copy, Check, Share2, FileSignature, AlertCircle } from "lucide-react";
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

function ScreenShare({
  peer,
  trackId,
}: {
  peer: HMSPeer;
  trackId: string;
}) {
  const { videoRef } = useVideo({
    trackId,
  });

  return (
    <Card className="relative w-full aspect-video overflow-hidden bg-black border-blue-500/30 border-2 shadow-2xl col-span-full max-w-5xl mx-auto">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-contain z-10"
      />
      <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg text-xs font-bold bg-black/60 text-white backdrop-blur-md z-20">
        Tela de {peer.name}
      </div>
    </Card>
  );
}

export function Meeting100ms({
  roomId,
  userName,
  authToken,
  onLeave,
  config,
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
  
  // DEBUG: Ativar logs verbose do 100ms SDK
  useEffect(() => {
    console.log("[Meeting100ms] 🔧 Ativando logs de debug do SDK 100ms...");
    try {
      // Tenta configurar log level para debug se disponível
      if ((hmsActions as any).setLogLevel) {
        (hmsActions as any).setLogLevel('debug');
        console.log("[Meeting100ms] ✅ Log level setado para debug");
      }
    } catch (e) {
      console.warn("[Meeting100ms] ⚠️ Não foi possível setar log level:", e);
    }
  }, [hmsActions]);
  
  // DEBUG: Monitorar estado do room continuamente
  useEffect(() => {
    console.log("[Meeting100ms] 📊 Room state atualizado:", {
      roomId: room?.id,
      roomName: room?.name,
      roomState: roomState,
      sessionId: room?.sessionId,
      isConnected,
      peersCount: peers?.length,
      localPeerId: room?.localPeer,
    });
    
    // Se o roomState for "Connected" mas isConnected é false, logar isso
    if (roomState === HMSRoomState.Connected && !isConnected) {
      console.warn("[Meeting100ms] ⚠️ INCONSISTÊNCIA: roomState=Connected mas isConnected=false!");
    }
  }, [room, roomState, isConnected, peers]);

  const localPeer = useHMSStore((store) => store.localPeer);
  const isHost = localPeer?.roleName === 'host';
  const canRecord = isHost;
  const canShare = isHost || config.meeting?.enableScreenShare;
  
  // Usar cores da configuração para os controles
  const controlStyles = {
    backgroundColor: config.colors.controlsBackground,
    color: config.colors.controlsText,
    borderColor: `${config.colors.controlsText}20`
  };

  const [localRecordingStatus, setLocalRecordingStatus] = useState<boolean | 'loading'>(false);

  // No SDK v0.11.0, o estado de gravação pode estar em outro lugar ou ser nulo
  // Vamos usar uma verificação segura para evitar o erro de tipagem
  const sdkRecordingOn = (room as any)?.recording?.browser?.running || 
                        (room as any)?.browserRecordingState?.running || 
                        (room as any)?.recording?.server?.running || 
                        (room as any)?.recording?.hls?.running || 
                        ['starting', 'started', 'recording'].includes((room as any)?.recording?.status) ||
                        false;
  
  // Sincronizar o estado local com o SDK quando o SDK mudar
  useEffect(() => {
    setLocalRecordingStatus(sdkRecordingOn);
  }, [sdkRecordingOn]);

  const isRecordingOn = localRecordingStatus === 'loading' ? sdkRecordingOn : localRecordingStatus;
  
  const tenantId = (room as any)?.tenantId;
  
  // Encontrar o track de compartilhamento de tela
  const screenSharePeer = peers.find(p => p.auxiliaryTracks.length > 0);
  const screenShareTrackId = screenSharePeer?.auxiliaryTracks[0];
  
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [canRetry, setCanRetry] = useState(false);
  const [sdkError, setSdkError] = useState<{ code: string; message: string } | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const hasAttemptedJoin = useRef(false);
  const joinTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Processar notificações do SDK para debug e tratamento de erros
  useEffect(() => {
    if (!notification) return;
    
    console.log("[Meeting100ms] 🔔 Notificação recebida:", notification.type, notification.data);
    
    switch (notification.type) {
      case HMSNotificationTypes.ERROR:
        console.error("[Meeting100ms] ❌ ERRO DO SDK:", notification.data);
        const errorData = notification.data as any;
        const errorMsg = errorData?.message || errorData?.description || "Erro de conexão com a sala";
        const errorCode = errorData?.code?.toString() || "UNKNOWN";
        console.error(`[Meeting100ms] Código: ${errorCode}, Mensagem: ${errorMsg}`);
        
        // Erros críticos que devem ser mostrados ao usuário
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
        console.warn("[Meeting100ms] 🔄 Reconectando...");
        setIsReconnecting(true);
        break;
        
      case HMSNotificationTypes.RECONNECTED:
        console.log("[Meeting100ms] ✅ Reconectado com sucesso!");
        setIsReconnecting(false);
        setSdkError(null);
        break;
        
      case HMSNotificationTypes.PEER_JOINED:
        console.log("[Meeting100ms] 👤 Peer entrou:", (notification.data as any)?.name);
        break;
        
      case HMSNotificationTypes.PEER_LEFT:
        console.log("[Meeting100ms] 👋 Peer saiu:", (notification.data as any)?.name);
        break;
        
      case HMSNotificationTypes.ROOM_ENDED:
        console.log("[Meeting100ms] 🏁 Sala encerrada");
        break;
    }
  }, [notification]);

  useEffect(() => {
    // CRÍTICO: Não tentar join se não temos token válido
    if (!authToken || authToken.length < 10) {
      console.error("[Meeting100ms] ❌ Token inválido ou vazio! Aguardando token válido...");
      return;
    }
    
    if (hasAttemptedJoin.current) {
      console.log("[Meeting100ms] Join já foi tentado, ignorando...");
      return;
    }
    hasAttemptedJoin.current = true;
    
    const isBot = window.location.search.includes("recording_bot=true") || 
                  window.location.search.includes("recording=true");
    
    if (isBot) {
      console.log("[Meeting100ms] Bot de gravação detectado, forçando início de áudio/vídeo e desativando overlay");
      hmsActions.setLocalAudioEnabled(true).catch(console.error);
      hmsActions.setLocalVideoEnabled(true).catch(console.error);
    }

    let isMounted = true;
    
    const joinRoom = async (attempt: number = 0) => {
      if (!isMounted) return;
      
      try {
        console.log(`[Meeting100ms] 🚀 Tentativa ${attempt + 1} de entrar na sala...`);
        console.log("[Meeting100ms] Token válido:", authToken.substring(0, 30) + "...");
        console.log("[Meeting100ms] userName:", userName);
        console.log("[Meeting100ms] roomId:", roomId);
        
        if (joinTimeoutRef.current) {
          clearTimeout(joinTimeoutRef.current);
        }
        
        joinTimeoutRef.current = setTimeout(() => {
          if (isMounted && attempt < 2) {
            console.warn(`[Meeting100ms] ⚠️ Timeout de conexão (10s) - tentativa ${attempt + 2}...`);
            setConnectionAttempts(attempt + 1);
            hasAttemptedJoin.current = false;
            joinRoom(attempt + 1);
          } else if (isMounted) {
            console.error("[Meeting100ms] ❌ Todas as tentativas falharam após 3 tentativas");
            setError("Timeout ao conectar à reunião. Verifique sua conexão e tente novamente.");
            setIsJoining(false);
            setCanRetry(true);
          }
        }, 10000);
        
        console.log("[Meeting100ms] Chamando hmsActions.join()...");
        // IMPORTANTE: Iniciar com áudio/vídeo MUTADOS para evitar problemas de dispositivos de mídia
        // O SDK pode falhar na conexão se tentar acessar dispositivos de mídia indisponíveis
        await hmsActions.join({
          userName,
          authToken,
          settings: { 
            isAudioMuted: true,  // Começa mutado para garantir conexão
            isVideoMuted: true   // Começa com vídeo off para garantir conexão
          },
          rememberDeviceSelection: true
        });
        
        console.log("[Meeting100ms] ✅ join() resolveu com sucesso!");
        
        // Verificar estado após join
        setTimeout(() => {
          console.log("[Meeting100ms] 📊 Estado 2s após join - verificando conexão...");
        }, 2000);
        
      } catch (err: any) {
        console.error("[Meeting100ms] ❌ Erro ao entrar na sala:", err);
        if (joinTimeoutRef.current) {
          clearTimeout(joinTimeoutRef.current);
          joinTimeoutRef.current = null;
        }
        if (isMounted) {
          const errorMessage = err.message || "Erro ao conectar";
          console.error("[Meeting100ms] 📋 Detalhes do erro:", {
            name: err.name,
            message: err.message,
            code: err.code,
            description: err.description
          });
          setError(errorMessage);
          setIsJoining(false);
          setCanRetry(true);
        }
      }
    };
    
    console.log("[Meeting100ms] 🎬 Iniciando processo de join...");
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
    console.log("[Meeting100ms] 🔍 Estado de conexão atualizado:", { isConnected, isJoining, peersCount: peers?.length });
    
    if (isConnected && isJoining) {
      console.log("[Meeting100ms] ✅ CONEXÃO CONFIRMADA! Removendo spinner de loading...");
      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current);
        joinTimeoutRef.current = null;
      }
      setIsJoining(false);
    }
    
    // Se estamos conectados mas isJoining ainda é true por algum motivo, corrigir
    if (isConnected && !isJoining && peers && peers.length > 0) {
      console.log("[Meeting100ms] 👥 Conexão estável com", peers.length, "participante(s)");
    }
  }, [isConnected, isJoining, peers]);

  // Registrar presença automática quando entrar na reunião (uma única vez por sessão)
  const hasRegisteredAttendance = useRef(false);
  useEffect(() => {
    if (isConnected && !hasRegisteredAttendance.current && roomId) {
      hasRegisteredAttendance.current = true;
      console.log("[Meeting100ms] 📋 Registrando presença automática na sala:", roomId);
      
      // Fire and forget - não bloquear a UI
      fetch('/api/public/reunioes/registrar-presenca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id_100ms: roomId,
          nome: userName
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            console.log("[Meeting100ms] ✅ Presença registrada:", data.message);
          } else {
            console.warn("[Meeting100ms] ⚠️ Falha ao registrar presença:", data.error);
          }
        })
        .catch(err => {
          console.error("[Meeting100ms] ❌ Erro ao registrar presença:", err);
        });
    }
  }, [isConnected, roomId, userName]);

  useEffect(() => {
    return () => {
      if (isConnected) {
        hmsActions.leave().catch(() => {});
      }
    };
  }, [hmsActions, isConnected]);

  const toggleAudio = useCallback(async () => {
    try {
      console.log("[Meeting100ms] Executando toggle áudio... Estado atual:", isAudioEnabled);
      await hmsActions.setLocalAudioEnabled(!isAudioEnabled);
      console.log("[Meeting100ms] SDK Processou Áudio");
    } catch (err: any) {
      console.error("[Meeting100ms] Erro no SDK (Áudio):", err);
      toast.error("Erro no áudio: " + err.message);
    }
  }, [hmsActions, isAudioEnabled]);

  const toggleVideo = useCallback(async () => {
    try {
      console.log("[Meeting100ms] Executando toggle vídeo... Estado atual:", isVideoEnabled);
      await hmsActions.setLocalVideoEnabled(!isVideoEnabled);
      console.log("[Meeting100ms] SDK Processou Vídeo");
    } catch (err: any) {
      console.error("[Meeting100ms] Erro no SDK (Vídeo):", err);
      toast.error("Erro no vídeo: " + err.message);
    }
  }, [hmsActions, isVideoEnabled]);
  
  const toggleScreenShare = useCallback(async () => {
    try {
      console.log("[Meeting100ms] Executando toggle tela... Estado atual:", isScreenShared);
      // Para o SDK v0.11.0, o método correto é setScreenShareEnabled
      await hmsActions.setScreenShareEnabled(!isScreenShared);
      console.log("[Meeting100ms] SDK Processou Tela");
      if (!isScreenShared) {
        toast.success("Compartilhamento de tela iniciado");
      } else {
        toast.success("Compartilhamento de tela encerrado");
      }
    } catch (err: any) {
      console.error("[Meeting100ms] Erro no SDK (Tela):", err);
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

  const toggleRecording = useCallback(async () => {
    if (localRecordingStatus === 'loading') return;

    try {
      const isCurrentlyRecording = isRecordingOn;
      console.log("[Meeting100ms] Executando toggle gravação... Estado atual:", isCurrentlyRecording);
      
      const currentRoomId = roomId || window.location.pathname.split('/').pop();
      const currentUrl = window.location.href;

      setLocalRecordingStatus('loading');

      if (isCurrentlyRecording) {
        console.log('[Meeting] Parando gravação...');
        const response = await fetch('/api/100ms/recording/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            roomId: currentRoomId
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          console.error('[Meeting] Erro ao parar gravação:', errData);
          setLocalRecordingStatus(true); // Reverter se der erro
          throw new Error(errData.message || errData.error || 'Erro ao parar gravação');
        }

        toast.success("Gravação parada! O vídeo será processado em breve.");
        setLocalRecordingStatus(false);
      } else {
        console.log('[Meeting] Iniciando gravação...');
        const response = await fetch('/api/100ms/recording/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: currentRoomId,
            meetingUrl: currentUrl,
            tenantSlug: companySlug
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          console.error('[Meeting] Erro ao iniciar gravação:', errData);
          setLocalRecordingStatus(false); // Reverter se der erro
          throw new Error(errData.message || errData.error || 'Erro ao iniciar gravação');
        }

        toast.success("Gravação iniciada!");
        setLocalRecordingStatus(true);
      }
    } catch (err: any) {
      console.error('[Meeting] Erro exaustivo na gravação:', err);
      toast.error(err.message || 'Erro ao controlar gravação');
    }
  }, [isRecordingOn, localRecordingStatus, roomId, companySlug]);

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
          body: JSON.stringify({ roomId: currentRoomId }),
        });

        if (!response.ok) {
          setIsRecording(false);
          throw new Error('Erro ao iniciar gravação');
        }

        const data = await response.json();
        setRecordingId(data.recordingId);
        toast.success("✅ Gravação iniciada!");
      } else {
        const response = await fetch('/api/100ms/recording/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId: currentRoomId }),
        });

        if (!response.ok) throw new Error('Erro ao parar gravação');

        setIsRecording(false);
        setRecordingId(null);
        toast.success("⏸️ Gravação parada! O vídeo será processado em breve.");
      }
    } catch (err: any) {
      toast.error("❌ " + err.message);
    }
  };

  const copyLink = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    toast.success("Link da reunião copiado!");
    setTimeout(() => setIsCopied(false), 2000);
  }, []);

  const handleLeave = useCallback(async () => {
    await hmsActions.leave();
    onLeave();
  }, [hmsActions, onLeave]);

  const handleRetry = useCallback(async () => {
    console.log("[Meeting100ms] Retry manual solicitado");
    setError(null);
    setIsJoining(true);
    setCanRetry(false);
    setConnectionAttempts(0);
    
    const retryTimeout = setTimeout(() => {
      console.warn("[Meeting100ms] Timeout no retry (30s)");
      setError("Timeout ao reconectar. Verifique sua conexão.");
      setIsJoining(false);
      setCanRetry(true);
    }, 30000);
    
    try {
      console.log("[Meeting100ms] Re-tentando conexão...");
      await hmsActions.join({
        userName,
        authToken,
        settings: { 
          isAudioMuted: true,  // Começa mutado para garantir conexão
          isVideoMuted: true   // Começa com vídeo off para garantir conexão
        },
        rememberDeviceSelection: true
      });
      clearTimeout(retryTimeout);
      console.log("[Meeting100ms] join() resolveu após retry");
    } catch (err: any) {
      clearTimeout(retryTimeout);
      console.error("[Meeting100ms] Erro no retry:", err);
      setError(err.message || "Erro ao reconectar");
      setIsJoining(false);
      setCanRetry(true);
    }
  }, [hmsActions, userName, authToken]);

  // Log de debug para entender o estado atual - DEVE estar antes de qualquer return condicional
  useEffect(() => {
    console.log("[Meeting100ms] 🔄 Estado atual:", {
      isJoining,
      isConnected,
      hasError: !!error,
      errorMessage: error,
      peersCount: peers?.length || 0,
      authTokenExists: !!authToken,
      roomIdExists: !!roomId,
      connectionAttempts,
      roomState: room ? 'exists' : 'null'
    });
  }, [isJoining, isConnected, error, peers, authToken, roomId, connectionAttempts, room]);

  // Mostrar tela de erro do SDK se houver
  if (sdkError) {
    console.log("[Meeting100ms] Mostrando erro do SDK:", sdkError);
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
    console.log("[Meeting100ms] Mostrando tela de erro:", error, "canRetry:", canRetry);
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
    console.log("[Meeting100ms] Mostrando tela de conexão. isJoining:", isJoining, "isConnected:", isConnected);
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
            className="h-14 px-6 border-b flex items-center justify-between z-20"
            style={headerStyle}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-7 h-7 rounded-lg flex items-center justify-center shadow-lg"
                style={{ backgroundColor: config?.colors?.primaryButton || "#3b82f6" }}
              >
                <Video className="h-4 w-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-white text-xs leading-none">
                  {config?.branding?.companyName || "MeetFlow"}
                </span>
                {isRecordingOn && (
                  <div className="flex items-center gap-1 mt-0.5 animate-pulse">
                    <Circle className="h-1.5 w-1.5 fill-red-500 text-red-500" />
                    <span className="text-[9px] text-red-500 font-bold uppercase tracking-wider">Gravando</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={copyLink}
                className="px-3 py-1.5 h-8 rounded-full flex items-center gap-2 text-[10px] font-bold text-white transition-all"
                style={{ backgroundColor: `${config?.colors?.controlsBackground || "#18181b"}66` }}
              >
                {isCopied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                <span>{isCopied ? "COPIADO" : "COPIAR LINK"}</span>
              </Button>
              
              <div 
                className="px-3 py-1.5 h-8 rounded-full flex items-center gap-2 text-[10px] font-bold border"
                style={{ 
                  backgroundColor: `${config?.colors?.controlsBackground || "#18181b"}66`,
                  color: `${config?.colors?.controlsText || "#ffffff"}99`,
                  borderColor: `${config?.colors?.controlsText || "#ffffff"}0d`
                }}
              >
                <Users className="h-3 w-3" />
                <span>{peers.length} PARTICIPANTES</span>
              </div>
            </div>
          </header>
        )}

        <main className={cn("flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center gap-6", isRecordingBot && "p-0")}>
          {screenSharePeer && screenShareTrackId && (
            <ScreenShare peer={screenSharePeer} trackId={screenShareTrackId} />
          )}
          <div className={cn("grid gap-6 w-full h-fit mx-auto", gridClass, isRecordingBot && "gap-0 max-w-full h-full")}>
            {peers.map((peer) => (
              <PeerVideo key={peer.id} peer={peer} config={config} totalPeers={peers.length} />
            ))}
          </div>
        </main>

        {!isRecordingBot && (
          <footer className="h-24 px-6 flex items-center justify-center z-50">
            <div 
              className="px-6 py-3 rounded-3xl flex items-center gap-3 border shadow-2xl relative"
              style={footerStyle}
            >
              <div className="flex items-center gap-3 relative z-50">
                <Button
                  onClick={() => {
                    console.log("[Meeting100ms] Click Áudio Direto");
                    toggleAudio();
                  }}
                  variant="ghost"
                  size="icon"
                  className={cn("h-12 w-12 rounded-2xl transition-all duration-300 relative z-50")}
                  style={controlButtonStyle(isAudioEnabled, !isAudioEnabled)}
                  title={isAudioEnabled ? "Mudar áudio" : "Ativar áudio"}
                >
                  {isAudioEnabled ? <Mic className="h-5 w-5 pointer-events-none" /> : <MicOff className="h-5 w-5 pointer-events-none" />}
                </Button>

                <Button
                  onClick={() => {
                    console.log("[Meeting100ms] Click Vídeo Direto");
                    toggleVideo();
                  }}
                  variant="ghost"
                  size="icon"
                  className={cn("h-12 w-12 rounded-2xl transition-all duration-300 relative z-50")}
                  style={controlButtonStyle(isVideoEnabled, !isVideoEnabled)}
                  title={isVideoEnabled ? "Desligar câmera" : "Ligar câmera"}
                >
                  {isVideoEnabled ? <Video className="h-5 w-5 pointer-events-none" /> : <VideoOff className="h-5 w-5 pointer-events-none" />}
                </Button>

                <div 
                  className="h-8 w-[1px] mx-1" 
                  style={{ backgroundColor: `${config?.colors?.controlsText || "#ffffff"}1a` }}
                />

                <Button
                  onClick={() => {
                    console.log("[Meeting100ms] Click Tela Direto");
                    if (!canShare) {
                      toast.error("Somente o administrador pode compartilhar tela nesta sala.");
                      return;
                    }
                    toggleScreenShare();
                  }}
                  variant="ghost"
                  size="icon"
                  className={cn("h-12 w-12 rounded-2xl transition-all duration-300 relative z-50")}
                  style={controlButtonStyle(isScreenShared)}
                  title={isScreenShared ? "Parar compartilhamento" : "Compartilhar tela"}
                >
                  {isScreenShared ? <MonitorOff className="h-5 w-5 pointer-events-none" /> : <MonitorUp className="h-5 w-5 pointer-events-none" />}
                </Button>

                {canRecord && (
                  <Button
                    onClick={handleToggleRecording}
                    variant={isRecording ? "destructive" : "ghost"}
                    size="icon"
                    className={cn(
                      "h-12 w-12 rounded-2xl transition-all duration-300 relative z-50", 
                      isRecording && "shadow-lg shadow-red-500/20"
                    )}
                    style={controlButtonStyle(isRecording, isRecording)}
                    title={isRecording ? "Parar gravação" : "Iniciar gravação"}
                  >
                    <Circle className={cn("h-5 w-5 pointer-events-none", isRecording && "fill-white animate-pulse")} />
                  </Button>
                )}

                <div 
                  className="h-8 w-[1px] mx-1" 
                  style={{ backgroundColor: `${config?.colors?.controlsText || "#ffffff"}1a` }}
                />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={async () => {
                        console.log("[Meeting100ms] Click Assinar Contrato");
                        
                        // IMPORTANTE: Abrir a janela ANTES das chamadas async para evitar bloqueio de popup
                        // Em celulares, popups só funcionam se abertos diretamente pelo clique do usuário
                        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                        let signatureWindow: Window | null = null;
                        
                        if (!isMobile) {
                          // Desktop: abrir janela em branco primeiro
                          signatureWindow = window.open('about:blank', '_blank');
                        }
                        
                        try {
                          // Buscar dados do participante da submissão do formulário
                          const currentRoomId = roomId || window.location.pathname.split('/').pop();
                          let participantData: any = {};
                          
                          try {
                            const participantResponse = await fetch(`/api/public/reunioes/${currentRoomId}/participant-data`, {
                              credentials: 'include',
                            });
                            if (participantResponse.ok) {
                              const result = await participantResponse.json();
                              if (result.found && result.participantData) {
                                participantData = result.participantData;
                              }
                              console.log("[Meeting100ms] Dados do participante encontrados:", participantData);
                            }
                          } catch (e) {
                            console.log("[Meeting100ms] Nenhum dado de formulário encontrado, usando nome da reunião");
                          }
                          
                          // Criar contrato com dados pré-preenchidos e status inicial "sem preencher"
                          const response = await fetch('/api/assinatura/public/contracts', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              client_name: participantData.nome || userName || 'Novo Revendedor',
                              client_cpf: participantData.cpf || '',
                              client_email: participantData.email || '',
                              client_phone: participantData.telefone || '',
                              status: 'sem preencher',
                            }),
                          });
                          
                          if (!response.ok) throw new Error('Erro ao criar contrato');
                          
                          const contract = await response.json();
                          const signatureUrl = `/assinar/${contract.access_token}`;
                          
                          if (isMobile) {
                            // Mobile: navegar diretamente (sai da reunião)
                            toast.info("Redirecionando para assinatura...");
                            window.location.href = signatureUrl;
                          } else if (signatureWindow) {
                            // Desktop: redirecionar a janela já aberta
                            signatureWindow.location.href = signatureUrl;
                            toast.success("Página de assinatura aberta!");
                          } else {
                            // Fallback: navegação direta
                            window.location.href = signatureUrl;
                          }
                        } catch (err: any) {
                          console.error("[Meeting100ms] Erro ao criar contrato:", err);
                          if (signatureWindow) signatureWindow.close();
                          toast.error("Erro ao abrir página de assinatura");
                        }
                      }}
                      variant="ghost"
                      className="h-12 px-4 rounded-2xl font-bold text-white shadow-lg hover:scale-105 transition-transform relative z-50 flex items-center gap-2"
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
                  onClick={() => {
                    console.log("[Meeting100ms] Click Sair Direto");
                    handleLeave();
                  }}
                  variant="destructive" 
                  className="h-12 px-6 rounded-2xl font-bold shadow-lg hover:scale-105 transition-transform relative z-50"
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
