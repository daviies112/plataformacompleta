import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Video, Clock, AlertCircle, Calendar, Star, ThumbsUp, ThumbsDown, FileSignature } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { MeetingLobby } from "@/components/MeetingLobby";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { DesignConfig, RoomDesignConfig, DEFAULT_ROOM_DESIGN_CONFIG } from "@/types/reuniao";
import { publicApi } from "@/lib/api";

const Meeting100msWithProvider = lazy(() => 
  import("@/components/Meeting100ms").then(module => ({ 
    default: module.Meeting100msWithProvider 
  }))
);

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
  const [searchParams] = useSearchParams();
  const autoJoin = searchParams.get("autoJoin") === "true" || searchParams.get("auto_join") === "true";
  const isRecordingBot = searchParams.get("recording") === "true" || searchParams.get("recording_bot") === "true";
  
  const [step, setStep] = useState<RoomStep>(autoJoin ? "meeting" : "lobby");
  const [participantName, setParticipantName] = useState(isRecordingBot ? "Recording Bot" : "");
  const [mediaSettings, setMediaSettings] = useState({ audioEnabled: !isRecordingBot, videoEnabled: !isRecordingBot });
  const [feedback, setFeedback] = useState<"positive" | "negative" | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [contractToken, setContractToken] = useState<string | null>(null);
  const [isCreatingContract, setIsCreatingContract] = useState(false);

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

  const handleLeaveMeeting = async () => {
    setStep("ended");
    
    if (!isRecordingBot && !contractToken) {
      setIsCreatingContract(true);
      try {
        // Buscar dados do participante usando fsid (form_submission_id) ou pid da URL
        let participantDataFromForm: any = {};
        const meetingId = data?.reuniao?.id || roomId;
        const fsidFromUrl = searchParams.get("fsid"); // PRIORITY: form_submission_id - único por pessoa
        const pidFromUrl = searchParams.get("pid");   // FALLBACK: participant_id
        
        console.log("[PublicMeetingRoom] Buscando participant-data com meetingId:", meetingId, "fsid:", fsidFromUrl, "pid:", pidFromUrl);
        
        try {
          // Prioridade: usar fsid (form_submission_id) para identificação única - funciona mesmo com múltiplos participantes na mesma URL
          let queryParams = new URLSearchParams();
          if (fsidFromUrl) {
            // MELHOR: form_submission_id é único por pessoa, não depende de quando a reunião foi criada
            queryParams.set("fsid", fsidFromUrl);
          } else if (pidFromUrl) {
            queryParams.set("pid", pidFromUrl);
          } else {
            // Fallback para parâmetros legados
            const emailParam = searchParams.get("email");
            const phoneParam = searchParams.get("phone");
            const cpfParam = searchParams.get("cpf");
            const sessionIdParam = searchParams.get("session_id") || searchParams.get("form_id");
            
            if (emailParam) queryParams.set("email", emailParam);
            if (phoneParam) queryParams.set("phone", phoneParam);
            if (cpfParam) queryParams.set("cpf", cpfParam);
            if (sessionIdParam) queryParams.set("session_id", sessionIdParam);
          }

          const participantResponse = await fetch(`/api/public/reunioes/${meetingId}/participant-data?${queryParams.toString()}`, {
            credentials: 'include',
          });
          console.log("[PublicMeetingRoom] Resposta participant-data:", participantResponse.status);
          
          if (participantResponse.ok) {
            const result = await participantResponse.json();
            console.log("[PublicMeetingRoom] Resultado participant-data:", JSON.stringify(result, null, 2));
            
            if (result.found && result.data) {
              // Usar dados do form_submission (nova estrutura com 'data')
              participantDataFromForm = result.data;
              console.log("[PublicMeetingRoom] Dados do form_submission encontrados:", participantDataFromForm);
              console.log("[PublicMeetingRoom] Endereço no participantData:", participantDataFromForm.endereco);
            } else if (result.meetingInfo) {
              // Fallback para dados da reunião quando não há form_submission
              participantDataFromForm = {
                nome: result.meetingInfo.nome,
                email: result.meetingInfo.email,
                telefone: result.meetingInfo.telefone?.replace(/@s\.whatsapp\.net/g, '') || '',
              };
              console.log("[PublicMeetingRoom] Usando dados da reunião como fallback:", participantDataFromForm);
            }
          }
        } catch (e) {
          console.error("[PublicMeetingRoom] Erro ao buscar participant-data:", e);
        }
        
        // Criar contrato com dados pré-preenchidos
        // Campos retornados em português: nome, email, telefone, cpf, endereco
        const endereco = participantDataFromForm.endereco;
        console.log("[PublicMeetingRoom] Endereço final para contrato:", endereco);
        console.log("[PublicMeetingRoom] Enviando client_address:", endereco ? { 
          street: endereco.logradouro || endereco.rua, 
          number: endereco.numero, 
          city: endereco.cidade, 
          zipcode: endereco.cep 
        } : 'UNDEFINED - PROBLEMA!');
        const response = await fetch('/api/assinatura/public/contracts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_name: participantDataFromForm.nome || participantName || 'Novo Revendedor',
            client_cpf: participantDataFromForm.cpf || '',
            client_email: participantDataFromForm.email || '',
            client_phone: participantDataFromForm.telefone || '',
            client_address: endereco ? {
              street: endereco.logradouro || endereco.rua || '',
              number: endereco.numero || '',
              complement: endereco.complemento || '',
              neighborhood: endereco.bairro || '',
              city: endereco.cidade || '',
              state: endereco.estado || '',
              zipcode: endereco.cep || ''
            } : undefined,
          }),
        });
        
        if (response.ok) {
          const contract = await response.json();
          setContractToken(contract.access_token);
        }
      } catch (err) {
        console.error("[PublicMeetingRoom] Erro ao criar contrato:", err);
      } finally {
        setIsCreatingContract(false);
      }
    }
  };
  
  const handleGoToSignature = () => {
    if (contractToken) {
      window.location.href = `/assinar/${contractToken}`;
    }
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

            <div className="flex flex-col gap-3">
              {isCreatingContract ? (
                <Button disabled className="w-full bg-emerald-600">
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Preparando contrato...
                </Button>
              ) : contractToken ? (
                <Button
                  onClick={handleGoToSignature}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  data-testid="button-assinar-contrato-encerrada"
                >
                  <FileSignature className="h-5 w-5 mr-2" />
                  Assinar Contrato de Revendedor
                </Button>
              ) : null}
              
              {endConfig.redirectUrl ? (
                <Button
                  onClick={() => window.location.href = endConfig.redirectUrl!}
                  className="w-full"
                  variant="outline"
                  style={{ borderColor: roomDesignConfig.colors.primaryButton }}
                >
                  Continuar
                </Button>
              ) : (
                <Button
                  onClick={() => window.close()}
                  className="w-full"
                  variant="outline"
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

  if (step === "meeting" && (reuniao.roomId100ms || reuniao.linkReuniao?.includes('100ms.live'))) {
    let finalRoomId = reuniao.roomId100ms;
    if (!finalRoomId && reuniao.linkReuniao?.includes('100ms.live')) {
      const parts = reuniao.linkReuniao.split('/');
      finalRoomId = parts[parts.length - 1];
    }

    return (
      <MeetingWrapper
        reuniao={{...reuniao, roomId100ms: finalRoomId}}
        tenant={tenant}
        roomDesignConfig={roomDesignConfig}
        participantName={participantName}
        mediaSettings={mediaSettings}
        companySlug={companySlug}
        isRecordingBot={isRecordingBot}
        onLeave={handleLeaveMeeting}
      />
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

const getCachedToken = (roomId: string, userName: string): string | null => {
  try {
    const cacheKey = `meeting-token:${roomId}:${userName}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const { token, expiresAt } = JSON.parse(cached);
      if (Date.now() < expiresAt) {
        return token;
      }
      sessionStorage.removeItem(cacheKey);
    }
  } catch (e) {}
  return null;
};

const setCachedToken = (roomId: string, userName: string, token: string) => {
  try {
    const cacheKey = `meeting-token:${roomId}:${userName}`;
    sessionStorage.setItem(cacheKey, JSON.stringify({
      token,
      expiresAt: Date.now() + (23 * 60 * 60 * 1000)
    }));
  } catch (e) {}
};

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

        // Check cache first for performance
        const userName = participantName || 'Convidado';
        const cachedToken = getCachedToken(reuniao.roomId100ms, userName);
        if (cachedToken) {
          console.log("[PublicMeetingRoom] Usando token do cache");
          setAuthToken(cachedToken);
          return;
        }

        const pubResponse = await fetch(`/api/public/reunioes/${reuniao.id}/token-public`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userName })
        });
        const pubData = await pubResponse.json();
        
        if (!pubResponse.ok) {
          throw new Error(pubData.error || "Erro ao gerar token de acesso");
        }
        
        // Cache the token for future use
        setCachedToken(reuniao.roomId100ms, userName, pubData.token);
        setAuthToken(pubData.token);
      } catch (err: any) {
        console.error("Erro ao gerar token:", err);
        setTokenError(err.message || "Erro ao gerar token de acesso");
      }
    };

    if (tenant?.id && reuniao?.roomId100ms) {
      getToken();
    }
  }, [reuniao.roomId100ms, reuniao.id, tenant?.id, participantName]);

  if (tokenError) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: roomDesignConfig.colors.background }}
      >
        <Card 
          className="p-8 text-center max-w-md border-0"
          style={{ backgroundColor: roomDesignConfig.colors.controlsBackground }}
        >
          <h2 
            className="text-2xl font-bold mb-4"
            style={{ color: "#ef4444" }}
          >
            Erro ao conectar
          </h2>
          <p 
            className="mb-6"
            style={{ color: roomDesignConfig.colors.controlsText }}
          >
            {tokenError}
          </p>
          <Button 
            onClick={() => window.location.reload()}
            style={{ 
              backgroundColor: roomDesignConfig.colors.primaryButton,
              color: "#ffffff"
            }}
          >
            Tentar Novamente
          </Button>
        </Card>
      </div>
    );
  }

  if (!authToken) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center p-4"
        style={{ backgroundColor: roomDesignConfig.colors.background }}
      >
        <Loader2 
          className="h-12 w-12 animate-spin mb-6" 
          style={{ color: roomDesignConfig.colors.primaryButton }}
        />
        <h2 
          className="text-xl font-bold mb-2"
          style={{ color: roomDesignConfig.colors.controlsText }}
        >
          Gerando acesso...
        </h2>
        <p style={{ color: `${roomDesignConfig.colors.controlsText}99` }}>
          Preparando sua sessão na reunião
        </p>
      </div>
    );
  }

  return (
    <Suspense 
      fallback={
        <div 
          className="min-h-screen flex flex-col items-center justify-center p-4"
          style={{ backgroundColor: roomDesignConfig.colors.background }}
        >
          <Loader2 
            className="h-12 w-12 animate-spin mb-6" 
            style={{ color: roomDesignConfig.colors.primaryButton }}
          />
          <h2 
            className="text-xl font-bold mb-2"
            style={{ color: roomDesignConfig.colors.controlsText }}
          >
            Carregando sala de reunião...
          </h2>
        </div>
      }
    >
      <Meeting100msWithProvider
        roomId={reuniao.roomId100ms}
        authToken={authToken}
        userName={participantName}
        config={roomDesignConfig}
        onLeave={onLeave}
        meetingId={reuniao.id}
      />
    </Suspense>
  );
}
