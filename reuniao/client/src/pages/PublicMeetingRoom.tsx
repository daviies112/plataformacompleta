import { useState, useMemo, useEffect } from "react";
import { useParams, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Video, Clock, AlertCircle, Calendar, Star, ThumbsUp, ThumbsDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Meeting100ms } from "@/components/Meeting100ms";
import { MeetingLobby } from "@/components/MeetingLobby";
import { HMSProvider } from "@/contexts/HMSContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { DesignConfig, RoomDesignConfig, DEFAULT_ROOM_DESIGN_CONFIG } from "@/types/reuniao";
import { publicApi } from "@/lib/api";

interface PublicMeetingData {
  reuniao: {
    id: string;
    titulo: string;
    descricao?: string;
    dataInicio: string;
    dataFim: string;
    duracao: number;
    status: string;
    roomId100ms: string;
    roomCode100ms?: string;
    linkReuniao?: string;
    nome?: string;
    email?: string;
  };
  tenant: {
    id: string;
    nome: string;
    slug: string;
    logoUrl?: string;
  };
  designConfig: DesignConfig;
  roomDesignConfig?: RoomDesignConfig;
}

type RoomStep = "lobby" | "meeting" | "ended";

export default function PublicMeetingRoom() {
  const { companySlug, roomId } = useParams<{ companySlug: string; roomId: string }>();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const autoJoin = searchParams.get("autoJoin") === "true" || searchParams.get("auto_join") === "true";
  const isRecordingBot = searchParams.get("recording") === "true" || searchParams.get("recording_bot") === "true";
  
  const [step, setStep] = useState<RoomStep>(autoJoin ? "meeting" : "lobby");
  const [participantName, setParticipantName] = useState(isRecordingBot ? "Recording Bot" : "");
  const [mediaSettings, setMediaSettings] = useState({ audioEnabled: !isRecordingBot, videoEnabled: !isRecordingBot });
  const [feedback, setFeedback] = useState<"positive" | "negative" | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");

  const { data, isLoading, error } = useQuery<PublicMeetingData>({
    queryKey: ["/api/public/reuniao", companySlug, roomId],
    queryFn: async () => {
      const response = await publicApi.getMeetingRoom(companySlug || "", roomId || "");
      return response.data;
    },
    enabled: !!companySlug && !!roomId,
    staleTime: 60 * 1000,
  });

  const roomDesignConfig = useMemo(() => {
    return data?.roomDesignConfig || DEFAULT_ROOM_DESIGN_CONFIG;
  }, [data?.roomDesignConfig]);

  const handleJoinMeeting = (settings: { audioEnabled: boolean; videoEnabled: boolean }) => {
    setMediaSettings(settings);
    setStep("meeting");
  };

  const handleLeaveMeeting = () => {
    setStep("ended");
  };

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: roomDesignConfig.colors.background }}
      >
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-white/60 mt-4">Carregando reunião...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Card className="w-full max-w-md mx-4 bg-slate-800 border-slate-700">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2 text-white">Reunião não encontrada</h2>
            <p className="text-slate-400">
              Verifique se o link está correto ou entre em contato com o organizador.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { reuniao, tenant } = data;

  if (step === "ended") {
    const endConfig = roomDesignConfig.endScreen;

    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: roomDesignConfig.colors.background }}
      >
        <Card
          className="w-full max-w-md border-0"
          style={{ backgroundColor: roomDesignConfig.colors.controlsBackground }}
        >
          <CardHeader className="text-center">
            {tenant.logoUrl && (
              <img
                src={tenant.logoUrl}
                alt={tenant.nome}
                className="h-12 w-auto mx-auto mb-4"
              />
            )}
            <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <Video className="h-8 w-8 text-green-500" />
            </div>
            <CardTitle style={{ color: roomDesignConfig.colors.controlsText }}>
              {endConfig.title || "Reunião Encerrada"}
            </CardTitle>
            <CardDescription style={{ color: `${roomDesignConfig.colors.controlsText}99` }}>
              {endConfig.message || "Obrigado por participar!"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p
              className="text-center text-sm"
              style={{ color: `${roomDesignConfig.colors.controlsText}cc` }}
            >
              A reunião "{reuniao.titulo}" foi encerrada.
            </p>

            {endConfig.showFeedback && (
              <div className="space-y-4">
                <p
                  className="text-center text-sm"
                  style={{ color: `${roomDesignConfig.colors.controlsText}cc` }}
                >
                  Como foi sua experiência?
                </p>
                <div className="flex justify-center gap-4">
                  <Button
                    variant={feedback === "positive" ? "default" : "outline"}
                    size="lg"
                    onClick={() => setFeedback("positive")}
                    className={feedback === "positive" ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    <ThumbsUp className="h-5 w-5 mr-2" />
                    Boa
                  </Button>
                  <Button
                    variant={feedback === "negative" ? "default" : "outline"}
                    size="lg"
                    onClick={() => setFeedback("negative")}
                    className={feedback === "negative" ? "bg-red-600 hover:bg-red-700" : ""}
                  >
                    <ThumbsDown className="h-5 w-5 mr-2" />
                    Ruim
                  </Button>
                </div>
                {feedback && (
                  <Textarea
                    placeholder="Comentário opcional..."
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    className="bg-zinc-700/50 border-zinc-600 text-white"
                  />
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              {endConfig.redirectUrl ? (
                <Button
                  onClick={() => window.location.href = endConfig.redirectUrl!}
                  className="w-full"
                  style={{ backgroundColor: roomDesignConfig.colors.primaryButton }}
                >
                  Continuar
                </Button>
              ) : (
                <Button
                  onClick={() => window.close()}
                  className="w-full"
                  style={{ backgroundColor: roomDesignConfig.colors.primaryButton }}
                >
                  Fechar janela
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "meeting" && reuniao.roomId100ms) {
    return (
      <HMSProvider>
        <MeetingWrapper
          reuniao={reuniao}
          tenant={tenant}
          roomDesignConfig={roomDesignConfig}
          participantName={participantName}
          mediaSettings={mediaSettings}
          companySlug={companySlug}
          isRecordingBot={isRecordingBot}
          onLeave={handleLeaveMeeting}
        />
      </HMSProvider>
    );
  }

  return (
    <MeetingLobby
      meetingTitle={reuniao.titulo || "Reunião"}
      meetingDescription={reuniao.descricao}
      meetingDate={reuniao.dataInicio}
      companyName={tenant.nome}
      companyLogo={tenant.logoUrl}
      participantName={participantName}
      onParticipantNameChange={setParticipantName}
      onJoin={handleJoinMeeting}
      roomDesignConfig={roomDesignConfig}
      config={roomDesignConfig}
    />
  );
}

interface MeetingWrapperProps {
  reuniao: any;
  tenant: any;
  roomDesignConfig: RoomDesignConfig;
  participantName: string;
  mediaSettings: { audioEnabled: boolean; videoEnabled: boolean };
  companySlug: string;
  isRecordingBot: boolean;
  onLeave: () => void;
}

function MeetingWrapper({
  reuniao,
  tenant,
  roomDesignConfig,
  participantName,
  mediaSettings,
  companySlug,
  isRecordingBot,
  onLeave,
}: MeetingWrapperProps) {
  const [authToken, setAuthToken] = useState<string>("");
  const [tokenError, setTokenError] = useState<string>("");

  useEffect(() => {
    const getToken = async () => {
      try {
        // Se houver um auth_token na URL (usado pelo Recording Bot), use-o diretamente
        const urlParams = new URLSearchParams(window.location.search);
        const urlAuthToken = urlParams.get("auth_token");
        
        if (urlAuthToken) {
          console.log("[PublicMeetingRoom] Usando token de autenticação da URL");
          setAuthToken(urlAuthToken);
          return;
        }

        const response = await api.post("/api/100ms/get-token", {
          roomId: reuniao.roomId100ms,
          name: participantName || `guest-${Date.now()}`,
          role: "host",
          tenantSlug: companySlug,
        });
        setAuthToken(response.data.token);
      } catch (err: any) {
        console.error("Erro ao gerar token:", err);
        setTokenError(err.response?.data?.message || "Erro ao gerar token de acesso");
      }
    };

    if (tenant?.id && reuniao?.roomId100ms) {
      getToken();
    }
  }, [reuniao.roomId100ms, tenant?.id]);

  if (tokenError) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Erro</h2>
        <p className="text-gray-600 mb-4">{tokenError}</p>
        <Button onClick={() => window.location.reload()}>
          Tentar Novamente
        </Button>
      </Card>
    );
  }

  if (!authToken) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Gerando acesso...</h2>
        <p className="text-gray-600">Preparando sua sessão</p>
      </Card>
    );
  }

  return (
    <Meeting100ms
      roomId={reuniao.roomId100ms}
      authToken={authToken}
      userName={participantName}
      config={roomDesignConfig}
      onLeave={onLeave}
    />
  );
}
