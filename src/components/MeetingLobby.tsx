import { useEffect, useRef, useState } from "react";
import { Camera, Mic, Video as VideoIcon, MicOff, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RoomDesignConfig } from "@/types/reuniao";

interface MeetingLobbyProps {
  onJoin: (settings: { audioEnabled: boolean; videoEnabled: boolean }) => void;
  config: RoomDesignConfig;
  participantName: string;
  onParticipantNameChange: (name: string) => void;
  meetingTitle: string;
  companyName?: string;
  companyLogo?: string | null;
  roomDesignConfig?: RoomDesignConfig;
  meetingDescription?: string | null;
  meetingDate?: string;
}

export function MeetingLobby({ 
  onJoin, 
  config, 
  participantName, 
  onParticipantNameChange,
  meetingTitle,
  companyName,
  companyLogo,
  roomDesignConfig,
  meetingDescription,
  meetingDate
}: MeetingLobbyProps) {
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initializeMedia = async () => {
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

        console.log("✅ Mídia inicializada no lobby");
      } catch (err: any) {
        console.error("❌ Erro ao acessar mídia:", err);
        if (isMounted) {
          if (err.name === "NotAllowedError") {
            setError("Permissão negada. Por favor, permita acesso à câmera e microfone.");
          } else if (err.name === "NotFoundError") {
            console.log("ℹ️ Dispositivos de mídia não encontrados - continuando sem preview");
            setIsVideoEnabled(false);
            setIsAudioEnabled(false);
          } else {
            setError("Erro ao acessar câmera/microfone. Verifique se estão conectados.");
          }
        }
      }
    };

    initializeMedia();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        console.log("🔄 Parando tracks do lobby...");
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log(`✅ Track parado: ${track.kind}`);
        });
        streamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (!stream) return;

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = isVideoEnabled;
    }
  }, [isVideoEnabled, stream]);

  useEffect(() => {
    if (!stream) return;

    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = isAudioEnabled;
    }
  }, [isAudioEnabled, stream]);

  useEffect(() => {
    const preload = () => import("@/components/Meeting100ms");
    preload();
  }, []);

  const handleJoin = () => {
    if (!participantName.trim()) {
      setError("Por favor, insira seu nome");
      return;
    }

    if (streamRef.current) {
      console.log("🔄 Parando preview do lobby antes de entrar...");
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log(`✅ Track parado: ${track.kind}`);
      });
      streamRef.current = null;
      setStream(null);
    }

    onJoin({ audioEnabled: isAudioEnabled, videoEnabled: isVideoEnabled });
  };

  const lobbyConfig = config?.lobby || {
    title: "Pronto para participar?",
    subtitle: "",
    buttonText: "Participar agora",
    showCameraPreview: true,
    showDeviceSelectors: true,
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: config?.colors?.background || "#0f172a" }}
    >
      <Card className="w-full max-w-2xl p-6" style={{ backgroundColor: config?.colors?.controlsBackground || "#18181b" }}>
        <div className="text-center mb-6">
          {config?.branding?.showLogoInLobby && companyLogo && (
            <div 
              className="flex mb-4"
              style={{
                justifyContent: config?.branding?.logoPosition === "left" 
                  ? "flex-start" 
                  : config?.branding?.logoPosition === "right" 
                  ? "flex-end" 
                  : "center"
              }}
            >
              <img
                src={companyLogo}
                alt={companyName || "Logo"}
                loading="lazy"
                className="object-contain"
                data-testid="img-company-logo-lobby"
                style={{ 
                  maxHeight: config?.branding?.logoSize || 60,
                  maxWidth: "200px"
                }}
              />
            </div>
          )}
          {config?.branding?.showCompanyName && companyName && (
            <p 
              className="text-lg font-semibold mb-3"
              data-testid="text-company-name-lobby"
              style={{ color: config?.colors?.controlsText || "#ffffff" }}
            >
              {companyName}
            </p>
          )}
          <h1 className="text-2xl font-bold mb-2" data-testid="text-lobby-title" style={{ color: config?.colors?.controlsText || "#ffffff" }}>
            {lobbyConfig.title}
          </h1>
          <p className="text-sm font-medium opacity-70 mb-2" data-testid="text-meeting-title" style={{ color: config?.colors?.controlsText || "#ffffff" }}>
            {meetingTitle}
          </p>
          {lobbyConfig.subtitle && (
            <p style={{ color: config?.colors?.controlsText || "#ffffff" }}>{lobbyConfig.subtitle}</p>
          )}
        </div>

        {lobbyConfig.showCameraPreview !== false && (
          <div className="mb-6 relative aspect-video rounded-lg overflow-hidden bg-gray-900">
            {stream && isVideoEnabled ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ backgroundColor: config?.colors?.avatarBackground || "#3b82f6" }}
              >
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: config?.colors?.primaryButton || "#3b82f6",
                    color: config?.colors?.avatarText || "#ffffff",
                  }}
                >
                  <Camera className="w-12 h-12" />
                </div>
              </div>
            )}

            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
              <Button
                onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                variant="ghost"
                size="icon"
                className="rounded-full h-12 w-12"
                style={{
                  backgroundColor: isVideoEnabled
                    ? config?.colors?.controlsBackground || "#18181b"
                    : config?.colors?.dangerButton || "#ef4444",
                }}
              >
                {isVideoEnabled ? (
                  <VideoIcon className="w-5 h-5" style={{ color: config?.colors?.controlsText || "#ffffff" }} />
                ) : (
                  <VideoOff className="w-5 h-5" style={{ color: config?.colors?.controlsText || "#ffffff" }} />
                )}
              </Button>

              <Button
                onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                variant="ghost"
                size="icon"
                className="rounded-full h-12 w-12"
                style={{
                  backgroundColor: isAudioEnabled
                    ? config?.colors?.controlsBackground || "#18181b"
                    : config?.colors?.dangerButton || "#ef4444",
                }}
              >
                {isAudioEnabled ? (
                  <Mic className="w-5 h-5" style={{ color: config?.colors?.controlsText || "#ffffff" }} />
                ) : (
                  <MicOff className="w-5 h-5" style={{ color: config?.colors?.controlsText || "#ffffff" }} />
                )}
              </Button>
            </div>
          </div>
        )}

        <div className="mb-6">
          <Label htmlFor="userName" style={{ color: config?.colors?.controlsText || "#ffffff" }}>
            Como você quer ser chamado?
          </Label>
          <Input
            id="userName"
            value={participantName}
            onChange={(e) => onParticipantNameChange(e.target.value)}
            placeholder="Digite seu nome"
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            className="mt-2"
            style={{
              backgroundColor: config?.colors?.background || "#0f172a",
              color: config?.colors?.controlsText || "#ffffff",
              borderColor: config?.colors?.primaryButton || "#3b82f6",
            }}
          />
        </div>

        {error && (
          <div
            className="mb-4 p-3 rounded-lg text-center"
            style={{
              backgroundColor: (config?.colors?.dangerButton || "#ef4444") + "20",
              color: config?.colors?.dangerButton || "#ef4444",
            }}
          >
            {error}
          </div>
        )}

        <Button
          onClick={handleJoin}
          size="lg"
          className="w-full h-12 text-base font-bold"
          disabled={!participantName.trim() || !stream}
          data-testid="button-join-meeting"
          style={{
            backgroundColor: config?.colors?.primaryButton || "#3b82f6",
            color: "#ffffff",
          }}
        >
          {lobbyConfig.buttonText || "Participar agora"}
        </Button>

        {stream && (
          <div className="mt-4 text-center text-xs opacity-60" style={{ color: config?.colors?.controlsText || "#ffffff" }}>
            <p>
              Câmera: {stream.getVideoTracks().length > 0 ? "✓ Conectada" : "✗ Não detectada"}
            </p>
            <p>
              Microfone: {stream.getAudioTracks().length > 0 ? "✓ Conectado" : "✗ Não detectado"}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
