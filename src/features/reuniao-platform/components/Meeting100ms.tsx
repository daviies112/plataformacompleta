import { useEffect, useState, useRef } from "react";
import {
  HMSReactiveStore,
  selectIsConnectedToRoom,
  selectPeers,
  selectIsLocalAudioEnabled,
  selectIsLocalVideoEnabled,
  selectVideoTrackByID,
  selectAudioTrackByID,
  HMSPeer,
} from "@100mslive/hms-video-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Smile,
  CheckCircle2,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RoomDesignConfig, DEFAULT_ROOM_DESIGN_CONFIG } from "../types";
import { useToast } from "@/hooks/use-toast";

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

function PeerVideo({
  peer,
  config,
  isSpotlight = false,
}: {
  peer: HMSPeer;
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

      if (track && (track.enabled || track.displayEnabled)) {
        try {
          await hmsActions.attachVideo(videoTrackId, videoElement);
          if (isMounted) {
            setHasVideo(true);
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

  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden border border-zinc-700",
        isSpotlight ? "aspect-video" : "aspect-video"
      )}
      style={{ backgroundColor: config.colors.background }}
    >
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
      
      {!hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
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

function Controls({
  onLeave,
  config,
  onReact,
  meetingId,
  onStartRecording,
  onStopRecording,
  isRecordingLoading,
}: {
  onLeave: () => void;
  config: RoomDesignConfig;
  onReact: (emoji: string) => void;
  meetingId?: string;
  onStartRecording?: () => Promise<void>;
  onStopRecording?: () => Promise<void>;
  isRecordingLoading?: boolean;
}) {
  const [isLocalAudioEnabled, setIsLocalAudioEnabled] = useState(true);
  const [isLocalVideoEnabled, setIsLocalVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(0);

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleLeave = async () => {
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
      if (!isScreenSharing) {
        await hmsActions.setScreenShareEnabled(true);
      } else {
        await hmsActions.setScreenShareEnabled(false);
      }
      setIsScreenSharing(!isScreenSharing);
    } catch (e) {
      console.error("Error toggling screen share:", e);
    }
  };

  const toggleRecording = async () => {
    if (isRecordingLoading) return;

    try {
      if (!isRecording) {
        if (onStartRecording) {
          await onStartRecording();
        }
        setIsRecording(true);
        setRecordingTimer(0);
      } else {
        if (onStopRecording) {
          await onStopRecording();
        }
        setIsRecording(false);
        setRecordingTimer(0);
      }
    } catch (error) {
      console.error('Erro ao controlar gravação:', error);
      setIsRecording(false);
    }
  };

  return (
    <div
      className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-zinc-900/80 backdrop-blur-md"
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleAudio}
              className={cn(
                "rounded-full h-12 w-12",
                isLocalAudioEnabled
                  ? "bg-zinc-800 hover:bg-zinc-700"
                  : "bg-red-500 hover:bg-red-600"
              )}
            >
              {isLocalAudioEnabled ? (
                <Mic className="h-5 w-5 text-white" />
              ) : (
                <MicOff className="h-5 w-5 text-white" />
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
              onClick={toggleVideo}
              className={cn(
                "rounded-full h-12 w-12",
                isLocalVideoEnabled
                  ? "bg-zinc-800 hover:bg-zinc-700"
                  : "bg-red-500 hover:bg-red-600"
              )}
            >
              {isLocalVideoEnabled ? (
                <Video className="h-5 w-5 text-white" />
              ) : (
                <VideoOff className="h-5 w-5 text-white" />
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
                onClick={toggleScreenShare}
                className={cn(
                  "rounded-full h-12 w-12",
                  isScreenSharing
                    ? "bg-blue-500 hover:bg-blue-600"
                    : "bg-zinc-800 hover:bg-zinc-700"
                )}
              >
                <MonitorUp className="h-5 w-5 text-white" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isScreenSharing ? "Parar compartilhamento" : "Compartilhar tela"}
            </TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleRecording}
              disabled={isRecordingLoading}
              className={cn(
                "rounded-full h-12 w-12",
                isRecording
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-zinc-800 hover:bg-zinc-700"
              )}
            >
              {isRecordingLoading ? (
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              ) : (
                <Circle
                  className={cn(
                    "h-5 w-5 text-white",
                    isRecording && "fill-current animate-pulse"
                  )}
                />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isRecordingLoading ? "Processando..." : isRecording ? `Gravando ${formatTime(recordingTimer)}` : "Iniciar gravação"}
          </TooltipContent>
        </Tooltip>

        {config.meeting.enableReactions && (
          <Popover>
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
                          onClick={() => onReact(emoji)}
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
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLeave}
              className="rounded-full h-12 w-12 bg-red-500 hover:bg-red-600"
            >
              <PhoneOff className="h-5 w-5 text-white" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Sair da reunião</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

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
}

export function Meeting100ms({
  roomId,
  meetingId,
  participantName: initialParticipantName = "Participante",
  initialAudioEnabled = true,
  initialVideoEnabled = true,
  onLeave,
  tenant,
  roomDesignConfig,
  meetingCode,
}: Meeting100msProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [peers, setPeers] = useState<HMSPeer[]>([]);
  const [reactions, setReactions] = useState<{ id: string; emoji: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRecordingLoading, setIsRecordingLoading] = useState(false);
  const [showLobby, setShowLobby] = useState(true);
  const [participantName, setParticipantName] = useState(initialParticipantName);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const config = roomDesignConfig || DEFAULT_ROOM_DESIGN_CONFIG;

  useEffect(() => {
    let isMounted = true;
    let localStream: MediaStream | null = null;
    
    const startPreview = async () => {
      if (videoRef.current && !isConnected && showLobby) {
        try {
          localStream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (isMounted && videoRef.current) {
            videoRef.current.srcObject = localStream;
          }
        } catch (err) {
          console.error("Lobby preview error:", err);
        }
      }
    };
    
    startPreview();
    
    return () => {
      isMounted = false;
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isConnected, showLobby]);

  const handleStartRecording = async () => {
    setIsRecordingLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/reunioes/${meetingId}/recording/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          meetingUrl: `${window.location.origin}/reuniao/${meetingId}`
        }),
      });

      if (!response.ok) {
        throw new Error("Falha ao iniciar gravação");
      }
    } catch (err: any) {
      console.error('[Meeting100ms] Erro ao iniciar gravação:', err);
      throw err;
    } finally {
      setIsRecordingLoading(false);
    }
  };

  const handleStopRecording = async () => {
    setIsRecordingLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/reunioes/${meetingId}/recording/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error("Falha ao parar gravação");
      }
    } catch (err: any) {
      console.error('[Meeting100ms] Erro ao parar gravação:', err);
    } finally {
      setIsRecordingLoading(false);
    }
  };

  useEffect(() => {
    const unsubConnected = hmsStore.subscribe(setIsConnected, selectIsConnectedToRoom);
    const unsubPeers = hmsStore.subscribe(setPeers, selectPeers);

    return () => {
      unsubConnected();
      unsubPeers();
    };
  }, []);

  const joinRoom = async () => {
    setIsJoining(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/meetings/${meetingId}/token?userName=${encodeURIComponent(participantName)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Falha ao obter token: ${response.status}`);
      }

      const result = await response.json();
      const authToken = result.data?.token;

      if (!authToken) {
        throw new Error('Token de acesso inválido');
      }

      await hmsActions.join({
        userName: participantName,
        authToken,
        settings: {
          isAudioMuted: !initialAudioEnabled,
          isVideoMuted: !initialVideoEnabled,
        },
      });
      
      setShowLobby(false);
    } catch (err: any) {
      console.error('[Meeting100ms] Join error:', err);
      setError(err.message || 'Erro ao entrar na reunião');
    } finally {
      setIsJoining(false);
    }
  };

  const handleReact = (emoji: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setReactions((prev) => [...prev, { id, emoji }]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 3000);
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/reuniao/${meetingId}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      toast({
        title: "Link copiado!",
        description: "O link da reunião foi copiado para a área de transferência.",
      });
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (showLobby && !isConnected) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#0f1115] text-white p-4">
        <div className="w-full max-w-2xl bg-[#1a1d21] rounded-2xl overflow-hidden shadow-2xl border border-zinc-800">
          <div className="p-8 flex flex-col items-center gap-6">
            <h2 className="text-2xl font-bold text-white">Pronto para participar?</h2>
            <p className="text-zinc-400 -mt-4 text-sm">Reunião Instantânea</p>

            <div className="relative w-full aspect-video bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 group">
               <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
               />
               
               <div className="absolute inset-0 flex items-center justify-center bg-zinc-800/50">
                  <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-4xl font-bold text-white">
                    {participantName.charAt(0).toUpperCase()}
                  </div>
               </div>
               
               <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="secondary" className="rounded-full bg-zinc-800/80 border-none h-10 w-10 text-white hover:bg-zinc-700/80">
                    <Video className="h-5 w-5" />
                  </Button>
                  <Button size="icon" variant="secondary" className="rounded-full bg-zinc-800/80 border-none h-10 w-10 text-white hover:bg-zinc-700/80">
                    <Mic className="h-5 w-5" />
                  </Button>
               </div>
            </div>

            <div className="w-full space-y-4">
              <div className="space-y-2 text-left">
                <label className="text-sm font-medium text-zinc-400">Como você quer ser chamado?</label>
                <Input 
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  className="bg-[#2a2d32] border-zinc-700 h-12 text-white focus:ring-blue-500"
                  placeholder="Seu nome"
                />
              </div>

              <Button 
                onClick={joinRoom}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all"
                disabled={!participantName.trim() || isJoining}
              >
                {isJoining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Participar agora"}
              </Button>

              <div className="flex justify-center gap-6 text-[10px] sm:text-xs text-zinc-500 mt-2">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-green-500" /> Câmera: Conectada</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-green-500" /> Microfone: Conectado</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const gridCols =
    peers.length <= 1
      ? "grid-cols-1"
      : peers.length <= 4
      ? "grid-cols-2"
      : peers.length <= 9
      ? "grid-cols-3"
      : "grid-cols-4";

  return (
    <div
      className="h-full flex flex-col bg-[#0f1115] relative overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-zinc-950/40 backdrop-blur-sm border-b border-zinc-800/50 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Video className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-white tracking-tight">MeetFlow</span>
        </div>

        <div className="flex items-center gap-3">
          {isConnected && hmsStore.getState((state: any) => state.recordings?.server?.running) && (
             <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-full">
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-medium text-red-500 uppercase tracking-wider">Gravando</span>
             </div>
          )}
          
          <Button variant="outline" size="sm" className="bg-zinc-800/50 border-zinc-700 text-white gap-2 h-9 px-4 rounded-lg hover:bg-zinc-700" onClick={handleCopyLink}>
             <Copy className="h-4 w-4" />
             <span className="hidden sm:inline">Copiar Link</span>
          </Button>

          <div className="flex items-center gap-2 bg-zinc-800/50 px-3 py-1.5 rounded-lg border border-zinc-700 h-9">
            <Users className="h-4 w-4 text-zinc-400" />
            <span className="text-sm font-medium text-white">{peers.length} Participantes</span>
          </div>
        </div>
      </div>

      {/* Video Grid Area */}
      <div className="flex-1 p-6 flex items-center justify-center overflow-hidden">
         <div className={cn("w-full h-full max-w-6xl grid gap-4 items-center justify-center", gridCols)}>
            {peers.map(peer => (
              <PeerVideo key={peer.id} peer={peer} config={config} isSpotlight={peers.length === 1} />
            ))}
         </div>
      </div>

      {/* Footer Controls */}
      <div className="p-6 bg-gradient-to-t from-black/80 to-transparent z-20">
        <div className="flex items-center justify-center max-w-screen-xl mx-auto">
           <Controls 
             onLeave={onLeave} 
             config={config} 
             onReact={handleReact}
             meetingId={meetingId}
             onStartRecording={handleStartRecording}
             onStopRecording={handleStopRecording}
             isRecordingLoading={isRecordingLoading}
           />
        </div>
      </div>

      {/* Emoji Overlay */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-4 pointer-events-none z-50">
        {reactions.map(r => (
          <div key={r.id} className="text-4xl animate-bounce">
            {r.emoji}
          </div>
        ))}
      </div>
    </div>
  );
}
