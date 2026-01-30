import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MeetingLobby } from "@/components/MeetingLobby";
import { useReuniao } from "@/hooks/useReuniao";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Download, Play, Loader2, Copy, Check, Share2, RefreshCw, Video, ThumbsUp, ThumbsDown, Home } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { DEFAULT_ROOM_DESIGN_CONFIG, type RoomDesignConfig } from "@/types/reuniao";

const Meeting100msWithProvider = lazy(() => 
  import("@/components/Meeting100ms").then(module => ({ 
    default: module.Meeting100msWithProvider 
  }))
);

type MeetingStep = "lobby" | "meeting" | "ended";

export default function Reuniao() {
  const params = useParams();
  const navigate = useNavigate();
  // Clean meeting ID - remove any query string that might be included
  const meetingId = params.id?.split('?')[0];
  const { meeting: privateMeeting, loading: privateLoading, error: privateError, getToken100ms } = useReuniao(meetingId);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // ALWAYS fetch from public endpoint first (this is a public page)
  const { data: publicMeeting, isLoading: publicLoading, error: publicError } = useQuery({
    queryKey: ["/api/public/reunioes", meetingId, "public"],
    queryFn: async () => {
      if (!meetingId) return null;
      console.log("[Reuniao] Buscando reunião via endpoint público:", meetingId);
      const response = await api.get(`/api/public/reunioes/${meetingId}/public`);
      console.log("[Reuniao] Resposta endpoint público:", response.data);
      return response.data;
    },
    enabled: !!meetingId,
    retry: 2,
    staleTime: 30000,
  });

  // Use public meeting as primary, private as fallback
  const meeting = publicMeeting || privateMeeting;
  const loading = publicLoading || (!publicMeeting && privateLoading);
  const error = publicError && privateError;

  const [step, setStep] = useState<MeetingStep>("lobby");
  const [token100ms, setToken100ms] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [mediaSettings, setMediaSettings] = useState({ audioEnabled: true, videoEnabled: true });
  const [feedback, setFeedback] = useState<"positive" | "negative" | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  
  const lastAttemptedRoomIdRef = useRef<string | null>(null);

  // Use public endpoint to get room design based on meeting ID (no auth required)
  const { data: designData } = useQuery({
    queryKey: ["/api/reunioes", meetingId, "room-design-public"],
    queryFn: async () => {
      if (!meetingId) {
        return { roomDesignConfig: null };
      }
      try {
        console.log("[Reuniao] Buscando configuração de design para reunião:", meetingId);
        // Usar o endpoint público que é mais resiliente e não requer autenticação de tenant
        const response = await api.get(`/api/public/reunioes/${meetingId}/room-design-public`);
        return response.data;
      } catch (error: any) {
        console.error("[Reuniao] Erro ao carregar room design:", error);
        return { roomDesignConfig: null };
      }
    },
    enabled: !!meetingId,
    staleTime: 0, // Always refetch when component mounts
    refetchOnMount: 'always', // Ensure data is fresh
  });

  const roomConfig: RoomDesignConfig = useMemo(() => {
    if (!designData?.roomDesignConfig) {
      return DEFAULT_ROOM_DESIGN_CONFIG;
    }
    // Deep merge with defaults to ensure all fields exist
    const serverConfig = designData.roomDesignConfig;
    return {
      branding: { 
        ...DEFAULT_ROOM_DESIGN_CONFIG.branding, 
        ...(serverConfig.branding || {}) 
      },
      colors: { 
        ...DEFAULT_ROOM_DESIGN_CONFIG.colors, 
        ...(serverConfig.colors || {}) 
      },
      lobby: { 
        ...DEFAULT_ROOM_DESIGN_CONFIG.lobby, 
        ...(serverConfig.lobby || {}) 
      },
      meeting: { 
        ...DEFAULT_ROOM_DESIGN_CONFIG.meeting, 
        ...(serverConfig.meeting || {}) 
      },
      endScreen: { 
        ...DEFAULT_ROOM_DESIGN_CONFIG.endScreen, 
        ...(serverConfig.endScreen || {}) 
      },
    };
  }, [designData]);

  useEffect(() => {
    const userData = localStorage.getItem("userData");
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        if (parsed.nome) {
          setUserName(parsed.nome);
        } else if (parsed.name) {
          setUserName(parsed.name);
        } else if (parsed.email) {
          setUserName(parsed.email.split("@")[0]);
        }
      } catch (e) {
        console.warn("Erro ao parsear userData:", e);
      }
    }
  }, []);

  const fetchTokenAndJoin = useCallback(async () => {
    if (!meetingId || !meeting || meeting.status === 'concluida' || meeting.status === 'cancelada') {
      return;
    }

    if (!meeting.roomId100ms) {
      setTokenError("Esta reunião não possui uma sala 100ms configurada.");
      return;
    }

    setTokenLoading(true);
    setTokenError(null);
    lastAttemptedRoomIdRef.current = meeting.roomId100ms;

    try {
      const response = await getToken100ms(meetingId);
      if (response.token) {
        setToken100ms(response.token);
        setStep("meeting");
      } else {
        setTokenError("Token não retornado pela API.");
      }
    } catch (err: any) {
      console.error("[Reuniao] Erro ao buscar token 100ms:", err);
      setTokenError(err.message || "Erro ao obter token de acesso.");
    } finally {
      setTokenLoading(false);
    }
  }, [meetingId, meeting, getToken100ms]);

  const handleJoinFromLobby = useCallback((settings: { audioEnabled: boolean; videoEnabled: boolean }) => {
    setMediaSettings(settings);
    fetchTokenAndJoin();
  }, [fetchTokenAndJoin]);

  const handleLeaveMeeting = useCallback(() => {
    setStep("ended");
  }, []);

  const handleRetryToken = useCallback(() => {
    setTokenError(null);
    fetchTokenAndJoin();
  }, [fetchTokenAndJoin]);

  const handleCopyLink = async () => {
    if (meeting?.linkReuniao) {
      try {
        await navigator.clipboard.writeText(meeting.linkReuniao);
        setCopied(true);
        toast({
          title: "Link copiado!",
          description: "O link da reunião foi copiado para a área de transferência.",
        });
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        toast({
          title: "Erro",
          description: "Não foi possível copiar o link.",
          variant: "destructive",
        });
      }
    }
  };

  const handleBackToDashboard = useCallback(() => {
    navigate("/reuniao");
  }, [navigate]);

  if (loading && !meeting) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center gap-4" 
        style={{ backgroundColor: roomConfig.colors.background }}
        data-testid="loading-meeting"
      >
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: roomConfig.colors.controlsText }} />
        <p style={{ color: `${roomConfig.colors.controlsText}99` }}>Carregando reunião...</p>
      </div>
    );
  }

  if (error || (!loading && !meeting)) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center gap-4" 
        style={{ backgroundColor: roomConfig.colors.background }}
        data-testid="error-meeting"
      >
        <h1 className="text-2xl font-bold" style={{ color: roomConfig.colors.controlsText }}>Reunião não encontrada</h1>
        <p style={{ color: `${roomConfig.colors.controlsText}80` }}>Verifique se o link está correto ou entre em contato com o organizador.</p>
        <Button onClick={() => navigate("/reuniao")} variant="outline" className="mt-4">
          Voltar para o Dashboard
        </Button>
      </div>
    );
  }

  if (meeting.status === 'concluida') {
    return (
      <div className="space-y-6 p-6" data-testid="meeting-completed">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handleBackToDashboard} data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
             <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold" data-testid="text-meeting-title">{meeting.titulo}</h1>
              <Badge className="bg-green-100 text-green-700 border-green-200">Concluída</Badge>
             </div>
             <p className="text-muted-foreground mt-1">Participante: {meeting.nome} - {meeting.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Gravação e Transcrição</CardTitle>
              <CardDescription>Acesse o conteúdo gravado da reunião.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="recording">
                <TabsList className="mb-4">
                  <TabsTrigger value="recording" data-testid="tab-recording">Gravação de Vídeo</TabsTrigger>
                  <TabsTrigger value="transcript" data-testid="tab-transcript">Transcrição (IA)</TabsTrigger>
                  <TabsTrigger value="summary" data-testid="tab-summary">Resumo Inteligente</TabsTrigger>
                </TabsList>
                
                <TabsContent value="recording" className="space-y-4">
                  <div className="aspect-video bg-black rounded-lg flex items-center justify-center relative group cursor-pointer overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=60" className="w-full h-full object-cover opacity-60" alt="Thumbnail" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-16 w-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Play className="h-8 w-8 text-white fill-current ml-1" />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <span className="text-sm text-muted-foreground">Duração: {meeting.duracao || 45} min</span>
                    <Button variant="outline" size="sm" className="gap-2" data-testid="button-download-mp4">
                      <Download className="h-4 w-4" /> Download MP4
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="transcript" className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg h-[400px] overflow-y-auto space-y-4 text-sm font-mono leading-relaxed">
                    <p><span className="text-blue-600 font-bold">00:00 [Você]:</span> Olá, bom dia! Vamos começar nossa reunião de alinhamento?</p>
                    <p><span className="text-green-600 font-bold">00:15 [Cliente]:</span> Bom dia! Sim, estou pronto. Gostaria de discutir os prazos.</p>
                    <p><span className="text-blue-600 font-bold">00:30 [Você]:</span> Perfeito. Sobre os prazos, temos novidades...</p>
                    <p className="text-muted-foreground italic text-center py-8">... transcrição completa carregada via n8n ...</p>
                  </div>
                </TabsContent>

                <TabsContent value="summary">
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200">
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-yellow-600" />
                        Resumo Executivo
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        A reunião focou no alinhamento de expectativas quanto aos prazos de entrega do projeto.
                        Ficou decidido que o MVP será entregue em 2 semanas. O cliente concordou com o escopo reduzido para a primeira fase.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Próximos Passos (Action Items)</h4>
                      <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                        <li>Enviar cronograma atualizado por email (Responsável: Você)</li>
                        <li>Validar acesso ao ambiente de homologação (Responsável: Cliente)</li>
                        <li>Agendar follow-up para dia 15 (Responsável: Você)</li>
                      </ul>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Detalhes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <span className="text-muted-foreground block">Data</span>
                  <span className="font-medium">
                    {format(new Date(meeting.dataInicio), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Horário</span>
                  <span className="font-medium">
                    {format(new Date(meeting.dataInicio), "HH:mm", { locale: ptBR })} - {format(new Date(meeting.dataFim), "HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <div>
                   <span className="text-muted-foreground block">ID da Sala</span>
                   <span className="font-mono text-xs bg-muted px-2 py-1 rounded select-all">{meeting.roomId100ms || "N/A"}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (step === "ended") {
    const endConfig = roomConfig.endScreen;

    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: roomConfig.colors.background }}
        data-testid="meeting-ended"
      >
        <Card
          className="w-full max-w-md border-0"
          style={{ backgroundColor: roomConfig.colors.controlsBackground }}
        >
          <CardHeader className="text-center">
            {roomConfig.branding?.logo && (
              <img
                src={roomConfig.branding.logo}
                alt={roomConfig.branding.companyName || "Logo"}
                className="h-12 w-auto mx-auto mb-4"
              />
            )}
            <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <Video className="h-8 w-8 text-green-500" />
            </div>
            <CardTitle style={{ color: roomConfig.colors.controlsText }}>
              {endConfig.title || "Reunião Encerrada"}
            </CardTitle>
            <CardDescription style={{ color: `${roomConfig.colors.controlsText}99` }}>
              {endConfig.message || "Obrigado por participar!"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p
              className="text-center text-sm"
              style={{ color: `${roomConfig.colors.controlsText}cc` }}
            >
              A reunião "{meeting.titulo}" foi encerrada.
            </p>

            {endConfig.showFeedback && (
              <div className="space-y-4">
                <p
                  className="text-center text-sm"
                  style={{ color: `${roomConfig.colors.controlsText}cc` }}
                >
                  Como foi sua experiência?
                </p>
                <div className="flex justify-center gap-4">
                  <Button
                    variant={feedback === "positive" ? "default" : "outline"}
                    size="lg"
                    onClick={() => setFeedback("positive")}
                    className={feedback === "positive" ? "bg-green-600" : ""}
                    data-testid="button-feedback-positive"
                  >
                    <ThumbsUp className="h-5 w-5 mr-2" />
                    Boa
                  </Button>
                  <Button
                    variant={feedback === "negative" ? "default" : "outline"}
                    size="lg"
                    onClick={() => setFeedback("negative")}
                    className={feedback === "negative" ? "bg-red-600" : ""}
                    data-testid="button-feedback-negative"
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
                    data-testid="input-feedback-comment"
                  />
                )}
              </div>
            )}

            {endConfig.redirectUrl && (
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => window.location.href = endConfig.redirectUrl!}
                  className="w-full"
                  style={{ backgroundColor: roomConfig.colors.primaryButton }}
                  data-testid="button-redirect"
                >
                  Continuar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tokenLoading) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center gap-4" 
        style={{ backgroundColor: roomConfig.colors.background }}
        data-testid="loading-token"
      >
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: roomConfig.colors.controlsText }} />
        <p style={{ color: `${roomConfig.colors.controlsText}99` }}>Preparando sala de reunião...</p>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center gap-4 p-4" 
        style={{ backgroundColor: roomConfig.colors.background }}
        data-testid="error-token"
      >
        <Card
          className="w-full max-w-md border-0"
          style={{ backgroundColor: roomConfig.colors.controlsBackground }}
        >
          <CardContent className="pt-6 text-center space-y-4">
            <h1 className="text-xl font-bold" style={{ color: "#ef4444" }}>Erro ao acessar reunião</h1>
            <p style={{ color: `${roomConfig.colors.controlsText}99` }}>{tokenError}</p>
            <div className="flex gap-2 justify-center flex-wrap">
              <Button variant="outline" onClick={handleBackToDashboard} data-testid="button-back-error">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <Button onClick={handleRetryToken} data-testid="button-retry">
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "meeting" && token100ms && meeting.roomId100ms) {
    return (
      <div 
        className="min-h-screen flex flex-col" 
        style={{ backgroundColor: roomConfig.colors.background }}
        data-testid="meeting-room"
      >
        <div 
          className="flex items-center justify-between p-4 border-b"
          style={{ 
            backgroundColor: roomConfig.colors.controlsBackground,
            borderColor: `${roomConfig.colors.controlsText}20`
          }}
        >
          <div className="flex items-center gap-4 flex-wrap">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleLeaveMeeting} 
              data-testid="button-leave-meeting"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 
                className="text-lg font-bold" 
                style={{ color: roomConfig.colors.controlsText }}
                data-testid="text-meeting-title-active"
              >
                {meeting.titulo}
              </h1>
              <p 
                className="text-sm" 
                style={{ color: `${roomConfig.colors.controlsText}99` }}
              >
                Participante: {meeting.nome}
              </p>
            </div>
          </div>
          {meeting.linkReuniao && (
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="gap-2"
              data-testid="button-share-link"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  Copiado!
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" />
                  Compartilhar
                </>
              )}
            </Button>
          )}
        </div>
        
        <div className="flex-1 min-h-0">
           <Suspense 
             fallback={
               <div 
                 className="w-full h-full min-h-[50vh] flex flex-col items-center justify-center p-4"
                 style={{ 
                   backgroundColor: roomConfig.colors.controlsBackground,
                   borderRadius: '8px',
                   margin: '16px'
                 }}
               >
                 <Loader2 
                   className="h-12 w-12 animate-spin mb-6" 
                   style={{ color: roomConfig.colors.primaryButton }}
                 />
                 <h2 
                   className="text-xl font-bold mb-2 text-center"
                   style={{ color: roomConfig.colors.controlsText }}
                 >
                   Carregando sala de reunião...
                 </h2>
                 <p 
                   className="text-sm opacity-70 text-center"
                   style={{ color: roomConfig.colors.controlsText }}
                 >
                   Preparando sua videoconferência
                 </p>
               </div>
             }
           >
             <Meeting100msWithProvider 
               roomId={meeting.roomId100ms} 
               userName={userName}
               authToken={token100ms}
               onLeave={handleLeaveMeeting} 
               config={roomConfig}
             />
           </Suspense>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: roomConfig.colors.background }}>
      <MeetingLobby
        meetingTitle={meeting.titulo || "Reunião"}
        meetingDescription={meeting.descricao}
        meetingDate={meeting.dataInicio}
        companyName={roomConfig.branding?.companyName}
        companyLogo={roomConfig.branding?.logo}
        participantName={userName}
        onParticipantNameChange={setUserName}
        onJoin={handleJoinFromLobby}
        roomDesignConfig={roomConfig}
        config={roomConfig}
      />
    </div>
  );
}
