import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Meeting100ms } from "@/components/Meeting100ms";
import { useReuniao } from "@/hooks/useReuniao";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Download, Play, Loader2, Copy, Check, Share2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { DEFAULT_ROOM_DESIGN_CONFIG, type RoomDesignConfig } from "@/types/reuniao";

export default function Reuniao() {
  const params = useParams();
  const navigate = useNavigate();
  const meetingId = params.id;
  const { meeting, loading, error, getToken100ms } = useReuniao(meetingId);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const [token100ms, setToken100ms] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Participante");
  
  const lastAttemptedRoomIdRef = useRef<string | null>(null);
  const hasAttemptedFetchRef = useRef(false);

  const { data: designData } = useQuery({
    queryKey: ["/api/reunioes/room-design"],
    queryFn: async () => {
      const response = await api.get("/api/reunioes/room-design");
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const roomConfig: RoomDesignConfig = useMemo(() => {
    return designData?.roomDesignConfig || DEFAULT_ROOM_DESIGN_CONFIG;
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

  const fetchTokenInternal = useCallback(async () => {
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
    hasAttemptedFetchRef.current = true;

    try {
      const response = await getToken100ms(meetingId);
      if (response.token) {
        setToken100ms(response.token);
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

  useEffect(() => {
    if (token100ms) {
      return;
    }

    if (tokenLoading) {
      return;
    }

    const currentRoomId = meeting?.roomId100ms;
    const roomIdChanged = currentRoomId && currentRoomId !== lastAttemptedRoomIdRef.current;
    
    if (roomIdChanged) {
      setTokenError(null);
      hasAttemptedFetchRef.current = false;
    }

    if (tokenError) {
      return;
    }

    if (hasAttemptedFetchRef.current && lastAttemptedRoomIdRef.current === currentRoomId) {
      return;
    }

    fetchTokenInternal();
  }, [meetingId, meeting?.roomId100ms, meeting?.status, token100ms, tokenLoading, tokenError, fetchTokenInternal]);

  const handleRetryToken = useCallback(() => {
    hasAttemptedFetchRef.current = false;
    setTokenError(null);
    fetchTokenInternal();
  }, [fetchTokenInternal]);

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4" data-testid="loading-meeting">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Carregando reunião...</p>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4" data-testid="error-meeting">
        <h1 className="text-2xl font-bold">Reunião não encontrada</h1>
        <Button onClick={() => navigate("/reuniao")} data-testid="button-back-dashboard">Voltar ao Dashboard</Button>
      </div>
    );
  }

  if (meeting.status === 'concluida') {
    return (
      <div className="space-y-6" data-testid="meeting-completed">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/reuniao")} data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
             <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold" data-testid="text-meeting-title">{meeting.titulo}</h1>
              <Badge className="bg-green-100 text-green-700 border-green-200">Concluída</Badge>
             </div>
             <p className="text-muted-foreground mt-1">Participante: {meeting.nome} - {meeting.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <Card className="col-span-2">
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
                  <div className="flex justify-between items-center">
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

  if (tokenLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4" data-testid="loading-token">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Preparando sala de reunião...</p>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4" data-testid="error-token">
        <h1 className="text-2xl font-bold text-destructive">Erro ao acessar reunião</h1>
        <p className="text-muted-foreground text-center max-w-md">{tokenError}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/reuniao")} data-testid="button-back-error">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button onClick={handleRetryToken} data-testid="button-retry">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  if (!token100ms || !meeting.roomId100ms) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4" data-testid="no-room">
        <h1 className="text-2xl font-bold">Sala não disponível</h1>
        <p className="text-muted-foreground">Esta reunião não possui uma sala de vídeo configurada.</p>
        <Button onClick={() => navigate("/reuniao")} data-testid="button-back-noroom">Voltar ao Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4" data-testid="meeting-room">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/reuniao")} data-testid="button-back-meeting">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold" data-testid="text-meeting-title-active">{meeting.titulo}</h1>
            <p className="text-sm text-muted-foreground">Participante: {meeting.nome}</p>
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
      
      <div className="flex-1 min-h-0 border rounded-lg overflow-hidden shadow-2xl">
         <Meeting100ms 
           roomId={meeting.roomId100ms} 
           userName={userName}
           authToken={token100ms}
           onLeave={() => navigate("/reuniao")} 
           config={roomConfig}
         />
      </div>
    </div>
  );
}
