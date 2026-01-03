import { useEffect, useState, useRef, useCallback } from "react";
import {
  HMSReactiveStore,
  selectIsConnectedToRoom,
  selectPeers,
  selectIsLocalAudioEnabled,
  selectIsLocalVideoEnabled,
  selectLocalPeer,
  selectVideoTrackByID,
  selectAudioTrackByID,
  HMSPeer,
} from "@100mslive/hms-video-store";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MonitorUp,
  Circle,
  Loader2,
  Users,
  MessageSquare,
  Hand,
  Smile,
  MoreVertical,
  Copy,
  Settings,
  Grid,
  Maximize,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { RoomDesignConfig, DEFAULT_ROOM_DESIGN_CONFIG } from "@/types/reuniao";

interface Meeting100msProps {
  roomId: string;
  meetingId: string;
  participantName?: string;
  initialAudioEnabled?: boolean;
  initialVideoEnabled?: boolean;
  onLeave: () => void;
  tenant?: {
    nome: string;
    logoUrl?: string;
  };
  roomDesignConfig?: RoomDesignConfig;
  meetingCode?: string;
  companySlug?: string;
  isRecordingBot?: boolean;
}

const hmsManager = new HMSReactiveStore();
const hmsStore = hmsManager.getStore();
const hmsActions = hmsManager.getActions();

const EMOJI_REACTIONS = [
  { emoji: "👍", label: "Positivo" },
  { emoji: "👏", label: "Aplausos" },
  { emoji: "❤️", label: "Coração" },
  { emoji: "😂", label: "Risada" },
  { emoji: "😮", label: "Surpresa" },
  { emoji: "🎉", label: "Celebração" },
];

// Recording-optimized PeerVideo - uses object-fit: contain to prevent cropping
function RecordingPeerVideo({
  peer,
  hmsStore,
  config,
  totalPeers,
}: {
  peer: HMSPeer;
  hmsStore: any;
  config: RoomDesignConfig;
  totalPeers: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const videoTrackId = peer.videoTrack;
  const audioTrackId = peer.audioTrack;

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !videoTrackId) {
      setHasVideo(false);
      return;
    }

    let isMounted = true;

    const handleTrackUpdate = async (track: any) => {
      if (!isMounted || !videoElement) return;

      if (track && (track.enabled || track.displayEnabled)) {
        try {
          await hmsActions.attachVideo(videoTrackId, videoElement);
          if (isMounted) {
            setHasVideo(true);
          }
        } catch (err) {
          console.error('[RecordingPeerVideo] Attach error:', err);
          if (isMounted) setHasVideo(false);
        }
      } else {
        try {
          await hmsActions.detachVideo(videoTrackId, videoElement);
        } catch (err) {
          // Ignore detach errors
        }
        if (isMounted) setHasVideo(false);
      }
    };

    const initialTrack = hmsStore.getState(selectVideoTrackByID(videoTrackId));
    handleTrackUpdate(initialTrack);

    const unsubscribe = hmsStore.subscribe(handleTrackUpdate, selectVideoTrackByID(videoTrackId));

    return () => {
      isMounted = false;
      unsubscribe();
      if (videoElement && videoTrackId) {
        hmsActions.detachVideo(videoTrackId, videoElement).catch(() => {});
      }
    };
  }, [videoTrackId, peer.name]);

  useEffect(() => {
    if (!audioTrackId) {
      setIsAudioMuted(true);
      return;
    }

    const handleAudioUpdate = (track: any) => {
      setIsAudioMuted(!track?.enabled);
    };

    const initialAudioTrack = hmsStore.getState(selectAudioTrackByID(audioTrackId));
    handleAudioUpdate(initialAudioTrack);

    const unsubscribe = hmsStore.subscribe(handleAudioUpdate, selectAudioTrackByID(audioTrackId));
    return () => unsubscribe();
  }, [audioTrackId]);

  // Calculate avatar size based on number of peers
  const avatarSize = totalPeers <= 1 ? "h-40 w-40 text-6xl" : totalPeers <= 4 ? "h-28 w-28 text-4xl" : "h-20 w-20 text-2xl";

  return (
    <div
      className="relative rounded-xl overflow-hidden border border-zinc-700 flex items-center justify-center w-full h-full"
      style={{ 
        backgroundColor: config.colors.background,
        aspectRatio: '16/9',
      }}
    >
      {/* Video element with object-fit: contain to prevent cropping */}
      <video
        ref={videoRef}
        autoPlay
        muted={peer.isLocal}
        playsInline
        className={cn(
          "absolute inset-0 w-full h-full",
          !hasVideo && "invisible"
        )}
        style={{ objectFit: "contain", objectPosition: "center" }}
      />
      
      {/* Avatar fallback when no video */}
      {!hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              "rounded-full flex items-center justify-center font-bold",
              avatarSize
            )}
            style={{
              backgroundColor: config.colors.avatarBackground,
              color: config.colors.avatarText,
            }}
          >
            {peer.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
        </div>
      )}

      {/* Participant name overlay */}
      <div
        className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2"
        style={{
          backgroundColor: config.colors.participantNameBackground,
          color: config.colors.participantNameText,
        }}
      >
        {isAudioMuted && <MicOff className="h-3.5 w-3.5 text-red-400" />}
        <span className="font-medium">{peer.name}</span>
      </div>
    </div>
  );
}

function PeerVideo({
  peer,
  hmsStore,
  config,
  isSpotlight = false,
}: {
  peer: HMSPeer;
  hmsStore: any;
  config: RoomDesignConfig;
  isSpotlight?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const videoTrackId = peer.videoTrack;
  const audioTrackId = peer.audioTrack;

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !videoTrackId) {
      setHasVideo(false);
      return;
    }

    let isMounted = true;

    const handleTrackUpdate = async (track: any) => {
      if (!isMounted || !videoElement) return;
      
      console.log('[PeerVideo] Track update for peer:', peer.name, { 
        trackId: videoTrackId, 
        enabled: track?.enabled,
        displayEnabled: track?.displayEnabled 
      });

      if (track && (track.enabled || track.displayEnabled)) {
        try {
          await hmsActions.attachVideo(videoTrackId, videoElement);
          if (isMounted) {
            setHasVideo(true);
            console.log('[PeerVideo] Video attached for:', peer.name);
          }
        } catch (err) {
          console.error('[PeerVideo] Attach error:', err);
          if (isMounted) setHasVideo(false);
        }
      } else {
        try {
          await hmsActions.detachVideo(videoTrackId, videoElement);
        } catch (err) {
          // Ignore detach errors
        }
        if (isMounted) setHasVideo(false);
      }
    };

    // Initial attach
    const initialTrack = hmsStore.getState(selectVideoTrackByID(videoTrackId));
    handleTrackUpdate(initialTrack);

    // Subscribe to track changes
    const unsubscribe = hmsStore.subscribe(handleTrackUpdate, selectVideoTrackByID(videoTrackId));

    return () => {
      isMounted = false;
      unsubscribe();
      if (videoElement && videoTrackId) {
        hmsActions.detachVideo(videoTrackId, videoElement).catch(() => {});
      }
    };
  }, [videoTrackId, peer.name]);

  // Audio track subscription
  useEffect(() => {
    if (!audioTrackId) {
      setIsAudioMuted(true);
      return;
    }

    const handleAudioUpdate = (track: any) => {
      setIsAudioMuted(!track?.enabled);
    };

    const initialAudioTrack = hmsStore.getState(selectAudioTrackByID(audioTrackId));
    handleAudioUpdate(initialAudioTrack);

    const unsubscribe = hmsStore.subscribe(handleAudioUpdate, selectAudioTrackByID(audioTrackId));
    return () => unsubscribe();
  }, [audioTrackId]);

  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden border border-zinc-700",
        isSpotlight ? "aspect-video" : "aspect-video"
      )}
      style={{ backgroundColor: config.colors.background }}
    >
      {/* Always render video element - hide with CSS when no video */}
      <video
        ref={videoRef}
        autoPlay
        muted={peer.isLocal}
        playsInline
        className={cn(
          "absolute inset-0 w-full h-full object-cover",
          peer.isLocal && "transform scale-x-[-1]",
          !hasVideo && "invisible"
        )}
      />
      
      {/* Avatar fallback when no video */}
      {!hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              "rounded-full flex items-center justify-center font-bold",
              isSpotlight ? "h-32 w-32 text-5xl" : "h-20 w-20 text-2xl"
            )}
            style={{
              backgroundColor: config.colors.avatarBackground,
              color: config.colors.avatarText,
            }}
          >
            {peer.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
        </div>
      )}

      <div
        className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2"
        style={{
          backgroundColor: config.colors.participantNameBackground,
          color: config.colors.participantNameText,
        }}
      >
        {isAudioMuted && <MicOff className="h-3.5 w-3.5 text-red-400" />}
        <span className="font-medium">
          {peer.name} {peer.isLocal && "(Você)"}
        </span>
      </div>
    </div>
  );
}

function EmojiReactionsPopover({
  config,
  onReact,
}: {
  config: RoomDesignConfig;
  onReact: (emoji: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (!config.meeting.enableReactions) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-12 w-12 bg-zinc-800 hover:bg-zinc-700"
        >
          <Smile className="h-5 w-5 text-white" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2 bg-zinc-800 border-zinc-700">
        <div className="flex gap-1">
          {EMOJI_REACTIONS.map(({ emoji, label }) => (
            <TooltipProvider key={emoji}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-xl hover:bg-zinc-700 rounded-full"
                    onClick={() => {
                      onReact(emoji);
                      setIsOpen(false);
                    }}
                  >
                    {emoji}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FloatingReaction({ emoji, id }: { emoji: string; id: string }) {
  return (
    <div
      key={id}
      className="absolute bottom-24 left-1/2 transform -translate-x-1/2 animate-bounce text-4xl"
      style={{ animationDuration: "0.5s" }}
    >
      {emoji}
    </div>
  );
}

function Controls({
  onLeave,
  hmsStore,
  config,
  meetingCode,
  meetingId,
  onReact,
  transcriptionStarted = false,
}: {
  onLeave: () => void;
  hmsStore: any;
  config: RoomDesignConfig;
  meetingCode?: string;
  meetingId?: string;
  onReact: (emoji: string) => void;
  transcriptionStarted?: boolean;
}) {
  const [isLocalAudioEnabled, setIsLocalAudioEnabled] = useState(true);
  const [isLocalVideoEnabled, setIsLocalVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingLoading, setIsRecordingLoading] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isTranscriptionLoading, setIsTranscriptionLoading] = useState(false);
  const [transcriptionTimer, setTranscriptionTimer] = useState(0);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const unsubAudio = hmsStore.subscribe(setIsLocalAudioEnabled, selectIsLocalAudioEnabled);
    const unsubVideo = hmsStore.subscribe(setIsLocalVideoEnabled, selectIsLocalVideoEnabled);
    return () => {
      unsubAudio();
      unsubVideo();
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTranscribing) {
      interval = setInterval(() => {
        setTranscriptionTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTranscribing]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleLeave = async () => {
    // Finalize transcription if it was started (auto or manual)
    if ((transcriptionStarted || isTranscribing) && meetingId) {
      try {
        console.log('[Meeting100ms] Finalizing transcription on leave for meeting:', meetingId);
        await api.post(`/api/reunioes/${meetingId}/transcricao/finalizar`);
        console.log('[Meeting100ms] Transcription finalized successfully');
      } catch (error: any) {
        console.error('[Meeting100ms] Error finalizing transcription on leave:', error);
        // Continue with leave even if transcription finalization fails
      }
    }
    
    try {
      await hmsActions.leave();
    } catch (e) {
      console.error("Error leaving room:", e);
    }
    onLeave();
  };

  const toggleAudio = async () => {
    try {
      await hmsActions.setLocalAudioEnabled(!isLocalAudioEnabled);
    } catch (e) {
      console.error("Error toggling audio:", e);
    }
  };

  const toggleVideo = async () => {
    try {
      await hmsActions.setLocalVideoEnabled(!isLocalVideoEnabled);
    } catch (e) {
      console.error("Error toggling video:", e);
    }
  };

  const toggleScreenShare = async () => {
    if (!config.meeting.enableScreenShare) return;
    try {
      await hmsActions.setScreenShareEnabled(!isScreenSharing);
      setIsScreenSharing(!isScreenSharing);
    } catch (e) {
      console.error("Screen share error:", e);
      toast({
        variant: "destructive",
        title: "Erro ao compartilhar tela",
        description: "Não foi possível compartilhar a tela.",
      });
    }
  };

  const toggleRecording = async () => {
    if (!roomId) {
      toast({ variant: "destructive", title: "Erro", description: "ID da sala não encontrado." });
      return;
    }

    setIsRecordingLoading(true);
    
    try {
      if (isRecording) {
        await api.post(`/api/reunioes/recording/stop`, { roomId });
        toast({ title: "Gravação Finalizada", description: "A gravação foi encerrada e está sendo processada." });
        setIsRecording(false);
        setRecordingTimer(0);
      } else {
        await api.post(`/api/reunioes/recording/start`, { roomId });
        toast({ title: "Gravação Iniciada", description: "A reunião está sendo gravada." });
        setIsRecording(true);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Erro ao controlar gravação";
      toast({ variant: "destructive", title: "Erro", description: message });
    } finally {
      setIsRecordingLoading(false);
    }
  };

  const toggleTranscription = async () => {
    if (!meetingId) {
      toast({ variant: "destructive", title: "Erro", description: "ID da reunião não encontrado." });
      return;
    }

    setIsTranscriptionLoading(true);
    
    try {
      if (isTranscribing) {
        await api.post(`/api/reunioes/${meetingId}/transcricao/finalizar`);
        toast({ 
          title: "Transcrição Finalizada", 
          description: "Você receberá o documento estratégico por WhatsApp e Email em breve." 
        });
        setIsTranscribing(false);
        setTranscriptionTimer(0);
      } else {
        await api.post(`/api/reunioes/${meetingId}/transcricao/iniciar`);
        toast({ 
          title: "Transcrição Iniciada", 
          description: "A reunião está sendo transcrita em tempo real." 
        });
        setIsTranscribing(true);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Erro ao controlar transcrição";
      toast({ variant: "destructive", title: "Erro", description: message });
    } finally {
      setIsTranscriptionLoading(false);
    }
  };

  const toggleRaiseHand = () => {
    if (!config.meeting.enableRaiseHand) return;
    setIsHandRaised(!isHandRaised);
    toast({
      title: isHandRaised ? "Mão abaixada" : "Mão levantada",
      description: isHandRaised
        ? "Você abaixou a mão"
        : "O organizador será notificado",
    });
  };

  const copyMeetingCode = () => {
    if (meetingCode) {
      navigator.clipboard.writeText(meetingCode);
      toast({ title: "Código copiado!", description: meetingCode });
    }
  };

  return (
    <div
      className="h-20 border-t flex items-center justify-between px-4 md:px-8"
      style={{
        backgroundColor: config.colors.controlsBackground,
        borderColor: `${config.colors.controlsText}20`,
      }}
    >
      <div className="flex items-center gap-4">
        {config.meeting.showMeetingCode && meetingCode && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-zinc-400 hover:text-white gap-2"
                  onClick={copyMeetingCode}
                >
                  <span className="text-sm font-mono">{meetingCode}</span>
                  <Copy className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copiar código da reunião</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {config.meeting.showRecordingIndicator && isRecording && (
          <div className="flex items-center gap-2 text-red-500 bg-red-500/10 px-3 py-1 rounded-full animate-pulse">
            <Circle className="h-2 w-2 fill-current" />
            <span className="text-xs font-bold">REC {formatTime(recordingTimer)}</span>
          </div>
        )}
        {isTranscribing && (
          <div className="flex items-center gap-2 text-green-500 bg-green-500/10 px-3 py-1 rounded-full animate-pulse">
            <FileText className="h-3 w-3" />
            <span className="text-xs font-bold">TRANSCREVENDO {formatTime(transcriptionTimer)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "rounded-full h-12 w-12",
                  !isLocalAudioEnabled
                    ? "text-white"
                    : "bg-zinc-800 hover:bg-zinc-700"
                )}
                style={{
                  backgroundColor: !isLocalAudioEnabled
                    ? config.colors.dangerButton
                    : undefined,
                }}
                onClick={toggleAudio}
              >
                {isLocalAudioEnabled ? (
                  <Mic className="h-5 w-5 text-white" />
                ) : (
                  <MicOff className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isLocalAudioEnabled ? "Desativar microfone" : "Ativar microfone"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "rounded-full h-12 w-12",
                  !isLocalVideoEnabled
                    ? "text-white"
                    : "bg-zinc-800 hover:bg-zinc-700"
                )}
                style={{
                  backgroundColor: !isLocalVideoEnabled
                    ? config.colors.dangerButton
                    : undefined,
                }}
                onClick={toggleVideo}
              >
                {isLocalVideoEnabled ? (
                  <Video className="h-5 w-5 text-white" />
                ) : (
                  <VideoOff className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isLocalVideoEnabled ? "Desativar câmera" : "Ativar câmera"}
            </TooltipContent>
          </Tooltip>

          {config.meeting.enableScreenShare && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "rounded-full h-12 w-12 bg-zinc-800 hover:bg-zinc-700",
                    isScreenSharing && "ring-2 ring-blue-500"
                  )}
                  onClick={toggleScreenShare}
                >
                  <MonitorUp
                    className={cn(
                      "h-5 w-5",
                      isScreenSharing ? "text-blue-400" : "text-white"
                    )}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isScreenSharing ? "Parar compartilhamento" : "Compartilhar tela"}
              </TooltipContent>
            </Tooltip>
          )}

          <EmojiReactionsPopover config={config} onReact={onReact} />

          {config.meeting.enableRaiseHand && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "rounded-full h-12 w-12 bg-zinc-800 hover:bg-zinc-700",
                    isHandRaised && "bg-yellow-600 hover:bg-yellow-700"
                  )}
                  onClick={toggleRaiseHand}
                >
                  <Hand
                    className={cn(
                      "h-5 w-5",
                      isHandRaised ? "text-white" : "text-white"
                    )}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isHandRaised ? "Abaixar mão" : "Levantar mão"}
              </TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "rounded-full h-12 w-12 bg-zinc-800 hover:bg-zinc-700",
                  isRecording && "bg-red-900 text-red-500"
                )}
                onClick={toggleRecording}
                disabled={isRecordingLoading}
              >
                {isRecordingLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <Circle
                    className={cn(
                      "h-5 w-5",
                      isRecording ? "fill-current text-red-500 animate-pulse" : "text-white"
                    )}
                  />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isRecordingLoading 
                ? "Processando..." 
                : isRecording 
                  ? "Parar gravação" 
                  : "Iniciar gravação"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "rounded-full h-12 w-12 bg-zinc-800 hover:bg-zinc-700",
                  isTranscribing && "bg-green-700 text-green-400"
                )}
                onClick={toggleTranscription}
                disabled={isTranscriptionLoading}
              >
                {isTranscriptionLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <FileText
                    className={cn(
                      "h-5 w-5",
                      isTranscribing ? "text-green-400 animate-pulse" : "text-white"
                    )}
                  />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isTranscriptionLoading 
                ? "Processando..." 
                : isTranscribing 
                  ? "Finalizar Transcrição" 
                  : "Iniciar Transcrição"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-12 w-12 ml-2"
                style={{ backgroundColor: config.colors.dangerButton }}
                onClick={handleLeave}
              >
                <PhoneOff className="h-5 w-5 text-white" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sair da reunião</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex items-center gap-2">
        {config.meeting.showParticipantCount && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-zinc-400 hover:text-white"
                  onClick={() => setShowParticipants(!showParticipants)}
                >
                  <Users className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Participantes</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {config.meeting.enableChat && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                  <MessageSquare className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Chat</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Mais opções</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

function Conference({
  onLeave,
  hmsStore,
  config,
  tenant,
  meetingCode,
  meetingId,
  isRecordingBot = false,
  transcriptionStarted = false,
}: {
  onLeave: () => void;
  hmsStore: any;
  config: RoomDesignConfig;
  tenant?: { nome: string; logoUrl?: string };
  meetingCode?: string;
  meetingId?: string;
  isRecordingBot?: boolean;
  transcriptionStarted?: boolean;
}) {
  const [peers, setPeers] = useState<HMSPeer[]>([]);
  const [reactions, setReactions] = useState<{ id: string; emoji: string }[]>([]);

  useEffect(() => {
    const unsubscribe = hmsStore.subscribe(setPeers, selectPeers);
    return () => unsubscribe();
  }, []);

  const handleReaction = (emoji: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setReactions((prev) => [...prev, { id, emoji }]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2000);
  };

  const gridCols =
    peers.length <= 1
      ? "grid-cols-1"
      : peers.length <= 4
      ? "grid-cols-2"
      : peers.length <= 9
      ? "grid-cols-3"
      : "grid-cols-4";

  // Filter out the recording bot from the peers list (it has no video/audio)
  const visiblePeers = isRecordingBot
    ? peers.filter((peer) => !peer.isLocal)
    : peers;

  // Recording Bot Layout - optimized for 1280x720 viewport (fullscreen, no headers/controls)
  if (isRecordingBot) {
    const recordingGridCols =
      visiblePeers.length <= 1
        ? "grid-cols-1"
        : visiblePeers.length <= 4
        ? "grid-cols-2"
        : visiblePeers.length <= 9
        ? "grid-cols-3"
        : "grid-cols-4";

    return (
      <div
        className="w-screen h-screen overflow-hidden flex items-center justify-center"
        style={{ 
          backgroundColor: config.colors.background,
          minWidth: '1280px',
          minHeight: '720px',
          maxWidth: '1280px',
          maxHeight: '720px',
        }}
      >
        {visiblePeers.length === 0 ? (
          <div className="flex items-center justify-center text-white/50 w-full h-full">
            <div className="text-center">
              <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-xl">Aguardando participantes...</p>
            </div>
          </div>
        ) : (
          <div 
            className={`grid ${recordingGridCols} gap-3 w-full h-full p-4`}
            style={{ aspectRatio: '16/9' }}
          >
            {visiblePeers.map((peer) => (
              <RecordingPeerVideo
                key={peer.id}
                peer={peer}
                hmsStore={hmsStore}
                config={config}
                totalPeers={visiblePeers.length}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Normal Conference Layout
  return (
    <div
      className="flex h-screen flex-col text-white"
      style={{ backgroundColor: config.colors.background }}
    >
      <div
        className="h-14 flex items-center justify-between px-4 border-b"
        style={{
          backgroundColor: config.colors.controlsBackground,
          borderColor: `${config.colors.controlsText}20`,
        }}
      >
        <div className="flex items-center gap-3">
          {tenant?.logoUrl && (
            <img
              src={tenant.logoUrl}
              alt={tenant.nome}
              className="h-8 w-auto"
              style={{ maxHeight: config.branding.logoSize || 32 }}
            />
          )}
          {config.branding.showCompanyName !== false && tenant?.nome && (
            <span className="font-medium text-white">{tenant.nome}</span>
          )}
        </div>

        {config.meeting.showParticipantCount && (
          <div className="flex items-center gap-2 text-zinc-400">
            <Users className="h-4 w-4" />
            <span className="text-sm">{peers.length} participante{peers.length !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      <div className="flex-1 p-4 overflow-hidden relative">
        <div className={`grid ${gridCols} gap-4 h-full auto-rows-fr`}>
          {peers.map((peer) => (
            <PeerVideo
              key={peer.id}
              peer={peer}
              hmsStore={hmsStore}
              config={config}
              isSpotlight={peers.length === 1}
            />
          ))}
          {peers.length === 0 && (
            <div className="flex items-center justify-center text-zinc-400">
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aguardando participantes...</p>
              </div>
            </div>
          )}
        </div>

        {reactions.map(({ id, emoji }) => (
          <FloatingReaction key={id} id={id} emoji={emoji} />
        ))}
      </div>

      <Controls
        onLeave={onLeave}
        hmsStore={hmsStore}
        config={config}
        meetingCode={meetingCode}
        meetingId={meetingId}
        onReact={handleReaction}
        transcriptionStarted={transcriptionStarted}
      />
    </div>
  );
}

export function Meeting100ms({
  roomId,
  meetingId,
  participantName = "Participante",
  initialAudioEnabled = true,
  initialVideoEnabled = true,
  onLeave,
  tenant,
  roomDesignConfig,
  meetingCode,
  companySlug,
  isRecordingBot = false,
}: Meeting100msProps) {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStep, setConnectionStep] = useState<string>("Inicializando...");

  const config = roomDesignConfig || DEFAULT_ROOM_DESIGN_CONFIG;
  const [transcriptionStarted, setTranscriptionStarted] = useState(false);

  useEffect(() => {
    const unsubscribe = hmsStore.subscribe((connected) => {
      setIsConnected(connected ?? false);
    }, selectIsConnectedToRoom);
    return () => unsubscribe();
  }, []);

  // Auto-start transcription when connected to the room
  useEffect(() => {
    const startAutoTranscription = async () => {
      if (!isConnected || transcriptionStarted || !meetingId || isRecordingBot) return;
      
      try {
        console.log('[Meeting100ms] Auto-starting transcription for meeting:', meetingId);
        await api.post(`/api/reunioes/${meetingId}/transcricao/iniciar`);
        setTranscriptionStarted(true);
        console.log('[Meeting100ms] Transcription started automatically');
        toast({
          title: "Transcrição Iniciada",
          description: "A reunião está sendo transcrita automaticamente.",
        });
      } catch (error: any) {
        console.error('[Meeting100ms] Failed to auto-start transcription:', error);
        // Don't show error to user - transcription is optional
      }
    };

    startAutoTranscription();
  }, [isConnected, meetingId, transcriptionStarted, isRecordingBot]);

  // Ref to track transcription state without causing re-renders
  const transcriptionStartedRef = useRef(transcriptionStarted);
  useEffect(() => {
    transcriptionStartedRef.current = transcriptionStarted;
  }, [transcriptionStarted]);

  useEffect(() => {
    const joinRoom = async () => {
      if (isConnected || isJoining) return;

      setIsJoining(true);
      setError(null);

      try {
        setConnectionStep("Obtendo token de autenticação...");

        let token: string;
        
        if (companySlug) {
          const response = await api.post(`/api/public/reuniao/${companySlug}/${roomId}/token`, { name: participantName });
          token = response.data.token;
        } else {
          const response = await api.get(`/api/reunioes/${meetingId}/token-100ms`);
          token = response.data.token;
        }

        if (!token) {
          throw new Error("Token não recebido do servidor");
        }

        setConnectionStep("Conectando à sala...");

        await hmsActions.join({
          authToken: token,
          userName: participantName,
          settings: {
            isAudioMuted: !initialAudioEnabled,
            isVideoMuted: !initialVideoEnabled,
          },
        });

        toast({
          title: "Conectado!",
          description: "Você entrou na sala de reunião.",
        });
      } catch (err: any) {
        console.error("Error joining room:", err);
        const errorMessage = err.response?.data?.message || err.message || "Erro ao conectar à sala";
        setError(errorMessage);
        toast({
          variant: "destructive",
          title: "Erro ao entrar na reunião",
          description: errorMessage,
        });
      } finally {
        setIsJoining(false);
      }
    };

    joinRoom();

    return () => {
      // Finalize transcription on unmount if it was started (use ref to get latest value)
      if (transcriptionStartedRef.current && meetingId) {
        // Use sendBeacon for reliable delivery on page close/navigation
        const finalizeUrl = `/api/reunioes/${meetingId}/transcricao/finalizar`;
        navigator.sendBeacon(finalizeUrl);
        console.log('[Meeting100ms] Sent transcription finalization beacon on unmount');
      }
      if (hmsStore.getState(selectIsConnectedToRoom)) {
        hmsActions.leave();
      }
    };
  }, [meetingId, participantName, initialAudioEnabled, initialVideoEnabled, companySlug, roomId]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      // Finalize transcription on page close if it was started
      if (transcriptionStarted && meetingId) {
        const finalizeUrl = `/api/reunioes/${meetingId}/transcricao/finalizar`;
        navigator.sendBeacon(finalizeUrl);
        console.log('[Meeting100ms] Sent transcription finalization beacon on beforeunload');
      }
      if (hmsStore.getState(selectIsConnectedToRoom)) {
        hmsActions.leave();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [transcriptionStarted, meetingId]);

  if (error) {
    return (
      <div
        className="flex h-screen w-full items-center justify-center text-white flex-col gap-6 p-8"
        style={{ backgroundColor: config.colors.background }}
      >
        <div className="text-center space-y-4">
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center mx-auto"
            style={{ backgroundColor: `${config.colors.dangerButton}33` }}
          >
            <PhoneOff className="h-8 w-8" style={{ color: config.colors.dangerButton }} />
          </div>
          <h3 className="text-xl font-medium">Erro ao Conectar</h3>
          <p className="text-sm text-zinc-400 max-w-md">{error}</p>
          <div className="flex gap-4 justify-center mt-4">
            <Button variant="outline" onClick={onLeave}>
              Voltar
            </Button>
            <Button
              onClick={() => window.location.reload()}
              style={{ backgroundColor: config.colors.primaryButton }}
            >
              Tentar Novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div
        className="flex h-screen w-full items-center justify-center text-white flex-col gap-6"
        style={{ backgroundColor: config.colors.background }}
      >
        <div className="relative">
          <Loader2
            className="h-16 w-16 animate-spin"
            style={{ color: config.colors.primaryButton }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Video className="h-6 w-6" style={{ color: config.colors.primaryButton }} />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-medium">Conectando à Reunião...</h3>
          <p className="text-sm text-zinc-400">{connectionStep}</p>
          <p className="text-xs text-zinc-500 mt-4">
            Você será solicitado a permitir acesso à câmera e microfone.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Conference
      onLeave={onLeave}
      hmsStore={hmsStore}
      config={config}
      tenant={tenant}
      meetingCode={meetingCode}
      meetingId={meetingId}
      isRecordingBot={isRecordingBot}
      transcriptionStarted={transcriptionStarted}
    />
  );
}
