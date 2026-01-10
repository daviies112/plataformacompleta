import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Meeting100ms } from "@/components/Meeting100ms";
import { MeetingLobby } from "@/components/MeetingLobby";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { DEFAULT_ROOM_DESIGN_CONFIG, type RoomDesignConfig } from "@/types/reuniao";

type MeetingStep = "lobby" | "meeting" | "ended";

export default function ReuniaoPublica() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  
  // Extrair o ID da reunião corretamente, suportando /reuniao/:id ou /reuniao/:tenantId/:id
  const meetingId = useMemo(() => {
    // Se temos params.id, usamos ele (rota /reuniao/:id ou /reuniao-publica/:id)
    if (params.id) return params.id;
    
    // Se a URL for /reuniao/:tenantId/:id, o id virá no final do path
    const pathParts = window.location.pathname.split('/');
    return pathParts[pathParts.length - 1];
  }, [params.id]);
  
  const isRecordingBot = searchParams.get("recording_bot") === "true" || 
                         searchParams.get("recording") === "true";
  const autoJoin = searchParams.get("auto_join") === "true" || isRecordingBot;
  const skipPreview = searchParams.get("skip_preview") === "true" || isRecordingBot;
  
  const [step, setStep] = useState<MeetingStep>(autoJoin ? "meeting" : "lobby");
  const [token100ms, setToken100ms] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>(isRecordingBot ? "Recording Bot" : "");
  const [mediaSettings, setMediaSettings] = useState({ 
    audioEnabled: !isRecordingBot, 
    videoEnabled: !isRecordingBot 
  });
  
  const hasAutoJoinedRef = useRef(false);

  const { data: meetingData, isLoading: meetingLoading, error: meetingError } = useQuery({
    queryKey: ["/api/reunioes-public", meetingId],
    queryFn: async () => {
      const response = await api.get(`/api/reunioes/${meetingId}/public`);
      return response.data;
    },
    enabled: !!meetingId,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const meeting = meetingData?.meeting;

  const { data: designData } = useQuery({
    queryKey: ["/api/reunioes", meetingId, "room-design-public"],
    queryFn: async () => {
      if (!meetingId) {
        return { roomDesignConfig: null };
      }
      try {
        const response = await api.get(`/api/reunioes/${meetingId}/room-design-public`);
        return response.data;
      } catch (error: any) {
        console.error("[ReuniaoPublica] Erro ao carregar room design:", error);
        return { roomDesignConfig: null };
      }
    },
    enabled: !!meetingId,
    staleTime: 0,
  });

  const roomConfig: RoomDesignConfig = useMemo(() => {
    if (!designData?.roomDesignConfig) {
      return DEFAULT_ROOM_DESIGN_CONFIG;
    }
    const serverConfig = designData.roomDesignConfig;
    return {
      branding: { ...DEFAULT_ROOM_DESIGN_CONFIG.branding, ...serverConfig.branding },
      colors: { ...DEFAULT_ROOM_DESIGN_CONFIG.colors, ...serverConfig.colors },
      lobby: { ...DEFAULT_ROOM_DESIGN_CONFIG.lobby, ...serverConfig.lobby },
      meeting: { ...DEFAULT_ROOM_DESIGN_CONFIG.meeting, ...serverConfig.meeting },
      endScreen: { ...DEFAULT_ROOM_DESIGN_CONFIG.endScreen, ...serverConfig.endScreen },
    };
  }, [designData]);

  const fetchTokenAndJoin = useCallback(async () => {
    if (!meetingId || !meeting) {
      return;
    }

    if (!meeting.roomId100ms) {
      setTokenError("Esta reunião não possui uma sala 100ms configurada.");
      return;
    }

    setTokenLoading(true);
    setTokenError(null);

    try {
      const response = await api.post(`/api/reunioes/${meetingId}/token-public`, {
        userName: userName || "Participante",
        role: isRecordingBot ? "recorder" : "guest"
      });
      
      if (response.data.token) {
        setToken100ms(response.data.token);
        setStep("meeting");
      } else {
        setTokenError("Token não retornado pela API.");
      }
    } catch (err: any) {
      console.error("[ReuniaoPublica] Erro ao buscar token 100ms:", err);
      setTokenError(err.response?.data?.error || err.message || "Erro ao obter token de acesso.");
    } finally {
      setTokenLoading(false);
    }
  }, [meetingId, meeting, userName, isRecordingBot]);

  useEffect(() => {
    if (autoJoin && meeting && !hasAutoJoinedRef.current && !token100ms && !tokenLoading) {
      console.log("[ReuniaoPublica] Auto-join ativado, entrando na reunião...");
      hasAutoJoinedRef.current = true;
      fetchTokenAndJoin();
    }
  }, [autoJoin, meeting, token100ms, tokenLoading, fetchTokenAndJoin]);

  const handleJoinFromLobby = useCallback((settings: { audioEnabled: boolean; videoEnabled: boolean }) => {
    setMediaSettings(settings);
    fetchTokenAndJoin();
  }, [fetchTokenAndJoin]);

  const handleLeave = useCallback(() => {
    setStep("ended");
    setToken100ms(null);
  }, []);

  if (meetingLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (meetingError || !meeting) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">Reunião não encontrada ou indisponível.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tokenLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Conectando à reunião...</p>
        </div>
      </div>
    );
  }

  if (step === "lobby" && !autoJoin) {
    return (
      <MeetingLobby
        meetingTitle={meeting.titulo || "Reuniao"}
        onJoin={handleJoinFromLobby}
        participantName={userName}
        onParticipantNameChange={setUserName}
        config={roomConfig}
      />
    );
  }

  if (step === "meeting" && token100ms && meeting.roomId100ms) {
    return (
      <Meeting100ms
        authToken={token100ms}
        roomId={meeting.roomId100ms}
        userName={userName || "Participante"}
        onLeave={handleLeave}
        config={roomConfig}
      />
    );
  }

  if (step === "ended") {
    return (
      <div 
        className="flex items-center justify-center h-screen"
        style={{ 
          backgroundColor: roomConfig.colors.background 
        }}
      >
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <h2 
              className="text-2xl font-bold mb-4"
              style={{ color: roomConfig.colors.controlsText }}
            >
              {roomConfig.endScreen.title}
            </h2>
            <p 
              className="text-muted-foreground"
              style={{ color: roomConfig.colors.controlsText }}
            >
              {roomConfig.endScreen.message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">{tokenError}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
