import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { api, getAuthToken } from "@/lib/api";
import { DEFAULT_ROOM_DESIGN_CONFIG, type RoomDesignConfig } from "@/types/reuniao";

const Meeting100msWithProvider = lazy(() => 
  import("@/components/Meeting100ms").then(m => ({ default: m.Meeting100msWithProvider }))
);
const MeetingLobby = lazy(() => 
  import("@/components/MeetingLobby").then(m => ({ default: m.MeetingLobby }))
);

const MeetingLoader = () => (
  <div className="flex items-center justify-center h-screen bg-background">
    <div className="text-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
      <p className="text-muted-foreground">Carregando sala de reunião...</p>
    </div>
  </div>
);

type MeetingStep = "lobby" | "meeting" | "ended";

export default function ReuniaoPublica() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  
  // Extrair o ID da reunião corretamente, suportando /reuniao/:id ou /reuniao/:tenantId/:id
  // Clean the ID to remove any query string that might be included
  const meetingId = useMemo(() => {
    let rawId = '';
    // Se temos params.id, usamos ele (rota /reuniao/:id ou /reuniao-publica/:id)
    if (params.id) {
      rawId = params.id;
    } else {
      // Se a URL for /reuniao/:tenantId/:id, o id virá no final do path
      const pathParts = window.location.pathname.split('/');
      rawId = pathParts[pathParts.length - 1];
    }
    // Clean query string from the ID (handles both ? and %3F encoding)
    return rawId.split('?')[0].split('%3F')[0];
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

  // Pre-load design and meeting data to avoid blank screen
  const { data: meetingData, isLoading: meetingLoading, error: meetingError } = useQuery({
    queryKey: ["/api/public/reunioes", meetingId],
    queryFn: async () => {
      const response = await api.get(`/api/public/reunioes/${meetingId}/public`);
      return response.data;
    },
    enabled: !!meetingId,
    staleTime: 1000 * 60 * 5, // Cache de 5 minutos para dados públicos
    refetchOnMount: false,
  });

  // meetingData IS the meeting object directly (endpoint returns meeting fields directly, not wrapped)
  const meeting = meetingData;

  const { data: designData } = useQuery({
    queryKey: ["/api/public/reunioes", meetingId, "room-design-public"],
    queryFn: async () => {
      if (!meetingId) return { roomDesignConfig: null };
      try {
        const response = await api.get(`/api/public/reunioes/${meetingId}/room-design-public`);
        return response.data;
      } catch (error) {
        return { roomDesignConfig: null };
      }
    },
    enabled: !!meetingId,
    staleTime: 1000 * 60 * 10, // Cache de 10 minutos para design
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
      // Check if user is authenticated - if so, use authenticated endpoint for host role
      const authToken = getAuthToken();
      let response;
      
      if (authToken && !isRecordingBot) {
        // Authenticated user: gets "host" role (can record)
        console.log("[ReuniaoPublica] Usuário autenticado - usando endpoint autenticado para role host");
        try {
          response = await api.post(`/api/reunioes/${meetingId}/token`, {
            userName: userName || "Admin"
          });
          console.log("[ReuniaoPublica] Token gerado com role:", response.data.role);
        } catch (authErr: any) {
          // If authenticated endpoint fails (e.g., not owner of meeting), fallback to public
          console.log("[ReuniaoPublica] Fallback para endpoint público:", authErr.response?.status);
          response = await api.post(`/api/public/reunioes/${meetingId}/token-public`, {
            userName: userName || "Participante",
            role: "guest"
          });
        }
      } else {
        // Public user or recording bot: gets "guest" or "recorder" role
        console.log("[ReuniaoPublica] Usuário público - usando endpoint público para role guest");
        response = await api.post(`/api/public/reunioes/${meetingId}/token-public`, {
          userName: userName || "Participante",
          role: isRecordingBot ? "recorder" : "guest"
        });
      }
      
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

  // useEffect para detectar estado inconsistente e voltar ao lobby (deve estar antes de qualquer return)
  useEffect(() => {
    if (step === "meeting" && !token100ms && !tokenLoading && !autoJoin) {
      console.warn("[ReuniaoPublica] Step é 'meeting' mas falta token. Voltando ao lobby.");
      setStep("lobby");
    }
  }, [step, token100ms, tokenLoading, autoJoin]);

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
      <Suspense fallback={<MeetingLoader />}>
        <MeetingLobby
          meetingTitle={meeting.titulo || "Reuniao"}
          onJoin={handleJoinFromLobby}
          participantName={userName}
          onParticipantNameChange={setUserName}
          config={roomConfig}
          companyName={roomConfig.branding?.companyName}
          companyLogo={roomConfig.branding?.logo}
        />
      </Suspense>
    );
  }

  // Erro ao obter token - mostrar antes de tentar renderizar meeting
  if (tokenError) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-destructive mb-4">{tokenError}</p>
            <button 
              onClick={() => { setTokenError(null); setStep("lobby"); }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
            >
              Tentar novamente
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Conectando à reunião
  if (step === "meeting" && token100ms && meeting.roomId100ms) {
    console.log("[ReuniaoPublica] Renderizando Meeting100ms com:", {
      token: token100ms?.substring(0, 20) + "...",
      roomId: meeting.roomId100ms,
      userName: userName || "Participante"
    });
    return (
      <Suspense fallback={<MeetingLoader />}>
        <Meeting100msWithProvider
          authToken={token100ms}
          roomId={meeting.roomId100ms}
          userName={userName || "Participante"}
          onLeave={handleLeave}
          config={roomConfig}
        />
      </Suspense>
    );
  }

  if (step === "ended") {
    // Pegar fsid da URL ou dos metadados da reunião
    const fsid = searchParams.get('fsid') || meeting?.metadata?.formSubmissionId;
    const redirectUrl = roomConfig.endScreen.redirectUrl || 
      (fsid ? `/assinatura/from-meeting?meetingId=${meetingId}&fsid=${fsid}` : null);

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
            
            {redirectUrl && (
              <Button 
                onClick={() => window.location.href = redirectUrl}
                style={{ backgroundColor: roomConfig.colors.primaryButton }}
                className="mt-4 w-full"
                data-testid="button-continue-signature"
              >
                Continuar para Assinatura
              </Button>
            )}
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
