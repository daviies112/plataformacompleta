import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Settings,
  Volume2,
  ChevronDown,
  Loader2,
  Users,
  Clock,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RoomDesignConfig, DEFAULT_ROOM_DESIGN_CONFIG } from "@/types/reuniao";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DeviceInfo {
  deviceId: string;
  label: string;
}

interface MeetingLobbyProps {
  meetingTitle: string;
  meetingDescription?: string;
  meetingDate?: string;
  companyName: string;
  companyLogo?: string | null;
  participantName: string;
  onParticipantNameChange: (name: string) => void;
  onJoin: (settings: { audioEnabled: boolean; videoEnabled: boolean }) => void;
  isJoining?: boolean;
  roomDesignConfig?: RoomDesignConfig;
}

export function MeetingLobby({
  meetingTitle,
  meetingDescription,
  meetingDate,
  companyName,
  companyLogo,
  participantName,
  onParticipantNameChange,
  onJoin,
  isJoining = false,
  roomDesignConfig = DEFAULT_ROOM_DESIGN_CONFIG,
}: MeetingLobbyProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioDevices, setAudioDevices] = useState<DeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<DeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<DeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("");
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>("");
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  const config = roomDesignConfig || DEFAULT_ROOM_DESIGN_CONFIG;

  const getMediaDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter((d) => d.kind === "audioinput")
        .map((d) => ({ deviceId: d.deviceId, label: d.label || `Microfone ${d.deviceId.slice(0, 4)}` }));
      const videoInputs = devices
        .filter((d) => d.kind === "videoinput")
        .map((d) => ({ deviceId: d.deviceId, label: d.label || `Câmera ${d.deviceId.slice(0, 4)}` }));
      const audioOutputs = devices
        .filter((d) => d.kind === "audiooutput")
        .map((d) => ({ deviceId: d.deviceId, label: d.label || `Alto-falante ${d.deviceId.slice(0, 4)}` }));

      setAudioDevices(audioInputs);
      setVideoDevices(videoInputs);
      setAudioOutputDevices(audioOutputs);

      if (audioInputs.length > 0 && !selectedAudioDevice) {
        setSelectedAudioDevice(audioInputs[0].deviceId);
      }
      if (videoInputs.length > 0 && !selectedVideoDevice) {
        setSelectedVideoDevice(videoInputs[0].deviceId);
      }
      if (audioOutputs.length > 0 && !selectedAudioOutput) {
        setSelectedAudioOutput(audioOutputs[0].deviceId);
      }
    } catch (err) {
      console.error("Error enumerating devices:", err);
    }
  }, [selectedAudioDevice, selectedVideoDevice, selectedAudioOutput]);

  const startMediaStream = useCallback(async () => {
    try {
      setPermissionError(null);

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        audio: audioEnabled
          ? { deviceId: selectedAudioDevice ? { exact: selectedAudioDevice } : undefined }
          : false,
        video: videoEnabled
          ? { deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined }
          : false,
      };

      if (!audioEnabled && !videoEnabled) {
        setStream(null);
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current && videoEnabled) {
        videoRef.current.srcObject = mediaStream;
      }

      if (audioEnabled && mediaStream.getAudioTracks().length > 0) {
        setupAudioAnalyzer(mediaStream);
      }

      await getMediaDevices();
    } catch (err: any) {
      console.error("Error starting media:", err);
      if (err.name === "NotAllowedError") {
        setPermissionError("Permissão negada. Por favor, permita o acesso à câmera e microfone.");
      } else if (err.name === "NotFoundError") {
        setPermissionError("Nenhum dispositivo de mídia encontrado.");
      } else {
        setPermissionError("Erro ao acessar dispositivos de mídia.");
      }
    } finally {
      setIsLoadingDevices(false);
    }
  }, [audioEnabled, videoEnabled, selectedAudioDevice, selectedVideoDevice, getMediaDevices, stream]);

  const setupAudioAnalyzer = useCallback((mediaStream: MediaStream) => {
    try {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(mediaStream);
      source.connect(analyser);
      analyser.fftSize = 256;

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const updateAudioLevel = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average / 255);
        animationRef.current = requestAnimationFrame(updateAudioLevel);
      };

      updateAudioLevel();
    } catch (err) {
      console.error("Error setting up audio analyzer:", err);
    }
  }, []);

  useEffect(() => {
    startMediaStream();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedAudioDevice || selectedVideoDevice) {
      startMediaStream();
    }
  }, [selectedAudioDevice, selectedVideoDevice]);

  const toggleAudio = useCallback(() => {
    if (stream) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !audioEnabled;
      });
    }
    setAudioEnabled(!audioEnabled);
  }, [stream, audioEnabled]);

  const toggleVideo = useCallback(() => {
    if (stream) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = !videoEnabled;
      });
    }
    setVideoEnabled(!videoEnabled);
    if (videoRef.current && videoEnabled) {
      videoRef.current.srcObject = null;
    }
  }, [stream, videoEnabled]);

  const handleJoin = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    onJoin({ audioEnabled, videoEnabled });
  };

  const cssVariables = {
    "--lobby-bg": config.colors.background,
    "--lobby-controls-bg": config.colors.controlsBackground,
    "--lobby-controls-text": config.colors.controlsText,
    "--lobby-primary": config.colors.primaryButton,
    "--lobby-danger": config.colors.dangerButton,
    "--lobby-avatar-bg": config.colors.avatarBackground,
    "--lobby-avatar-text": config.colors.avatarText,
  } as React.CSSProperties;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        ...cssVariables,
        backgroundColor: config.colors.background,
        backgroundImage: config.lobby.backgroundImage ? `url(${config.lobby.backgroundImage})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-6 md:gap-8">
        <div className="relative">
          <Card
            className="overflow-hidden border-0"
            style={{ backgroundColor: config.colors.controlsBackground }}
          >
            <CardContent className="p-0 relative aspect-video">
              {isLoadingDevices ? (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              ) : permissionError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 p-6 text-center">
                  <AlertCircle className="h-12 w-12 text-yellow-500 mb-4" />
                  <p className="text-white text-sm">{permissionError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={startMediaStream}
                  >
                    Tentar novamente
                  </Button>
                </div>
              ) : videoEnabled && config.lobby.showCameraPreview !== false ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform scale-x-[-1]"
                />
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ backgroundColor: config.colors.background }}
                >
                  <div
                    className="h-24 w-24 rounded-full flex items-center justify-center text-4xl font-bold border-4 border-white/10 shadow-xl"
                    style={{
                      backgroundColor: config.colors.avatarBackground,
                      color: config.colors.avatarText,
                    }}
                  >
                    {participantName?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                </div>
              )}

              <div className="absolute top-4 left-4 flex items-center gap-2">
                {companyLogo && (
                  <img
                    src={companyLogo}
                    alt={companyName}
                    className="h-8 w-auto"
                    style={{ maxWidth: config.branding.logoSize || 40 }}
                  />
                )}
                {config.branding.showCompanyName !== false && (
                  <span className="text-white text-sm font-medium drop-shadow-lg">
                    {companyName}
                  </span>
                )}
              </div>

              {audioEnabled && audioLevel > 0.01 && (
                <div className="absolute bottom-16 left-4 flex items-center gap-1">
                  <div className="flex gap-0.5 items-end h-4">
                    {[0.1, 0.3, 0.5, 0.7, 0.9].map((threshold, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-1 rounded-full transition-all duration-75",
                          audioLevel > threshold ? "bg-green-500" : "bg-zinc-600"
                        )}
                        style={{ height: `${(i + 1) * 20}%` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "rounded-full h-12 w-12",
                    !audioEnabled
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "bg-zinc-700/80 hover:bg-zinc-600 text-white"
                  )}
                  onClick={toggleAudio}
                >
                  {audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "rounded-full h-12 w-12",
                    !videoEnabled
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "bg-zinc-700/80 hover:bg-zinc-600 text-white"
                  )}
                  onClick={toggleVideo}
                >
                  {videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {config.lobby.showDeviceSelectors !== false && (
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              <Select value={selectedAudioDevice} onValueChange={setSelectedAudioDevice}>
                <SelectTrigger className="w-auto min-w-[140px] bg-zinc-800 border-zinc-700 text-white text-xs">
                  <Mic className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Microfone" />
                </SelectTrigger>
                <SelectContent>
                  {audioDevices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedAudioOutput} onValueChange={setSelectedAudioOutput}>
                <SelectTrigger className="w-auto min-w-[140px] bg-zinc-800 border-zinc-700 text-white text-xs">
                  <Volume2 className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Alto-falante" />
                </SelectTrigger>
                <SelectContent>
                  {audioOutputDevices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedVideoDevice} onValueChange={setSelectedVideoDevice}>
                <SelectTrigger className="w-auto min-w-[140px] bg-zinc-800 border-zinc-700 text-white text-xs">
                  <Video className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Câmera" />
                </SelectTrigger>
                <SelectContent>
                  {videoDevices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center">
          <div className="text-center md:text-left">
            {companyLogo && (
              <img
                src={companyLogo}
                alt={companyName}
                className="h-12 w-auto mb-4 mx-auto md:mx-0"
              />
            )}
            <h1
              className="text-2xl md:text-3xl font-bold mb-2"
              style={{ color: config.colors.controlsText }}
            >
              {config.lobby.title || "Pronto para participar?"}
            </h1>
            {config.lobby.subtitle && (
              <p
                className="text-sm mb-4"
                style={{ color: `${config.colors.controlsText}99` }}
              >
                {config.lobby.subtitle}
              </p>
            )}
          </div>

          <Card
            className="mt-4 border-0"
            style={{ backgroundColor: `${config.colors.controlsBackground}cc` }}
          >
            <CardContent className="p-4 space-y-4">
              <div>
                <h3
                  className="font-semibold text-lg"
                  style={{ color: config.colors.controlsText }}
                >
                  {meetingTitle}
                </h3>
                {meetingDescription && (
                  <p
                    className="text-sm mt-1"
                    style={{ color: `${config.colors.controlsText}99` }}
                  >
                    {meetingDescription}
                  </p>
                )}
              </div>

              {meetingDate && (
                <div className="flex items-center gap-2">
                  <Clock
                    className="h-4 w-4"
                    style={{ color: `${config.colors.controlsText}80` }}
                  />
                  <span
                    className="text-sm"
                    style={{ color: `${config.colors.controlsText}99` }}
                  >
                    {format(new Date(meetingDate), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </span>
                </div>
              )}

              <div>
                <Label
                  htmlFor="name"
                  className="text-sm"
                  style={{ color: `${config.colors.controlsText}cc` }}
                >
                  Seu nome
                </Label>
                <Input
                  id="name"
                  placeholder="Como você quer ser chamado?"
                  value={participantName}
                  onChange={(e) => onParticipantNameChange(e.target.value)}
                  className="mt-1 bg-zinc-700/50 border-zinc-600 text-white placeholder:text-zinc-400"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && participantName.trim()) {
                      handleJoin();
                    }
                  }}
                />
              </div>

              <Button
                onClick={handleJoin}
                disabled={!participantName.trim() || isJoining}
                className="w-full h-12 text-base font-medium"
                style={{
                  backgroundColor: config.colors.primaryButton,
                  color: "#ffffff",
                }}
              >
                {isJoining ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  config.lobby.buttonText || "Participar agora"
                )}
              </Button>
            </CardContent>
          </Card>

          <p
            className="text-xs text-center mt-4"
            style={{ color: `${config.colors.controlsText}60` }}
          >
            Ao entrar, você concorda com os termos de uso do serviço.
          </p>
        </div>
      </div>
    </div>
  );
}
