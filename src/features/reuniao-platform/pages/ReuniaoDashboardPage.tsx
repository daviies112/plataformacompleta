import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useReuniao } from "../hooks/useReuniao";
import { ReuniaoCard } from "../components/ReuniaoCard";
import { Meeting100ms } from "../components/Meeting100ms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Plus,
  Loader2,
  Video,
  Calendar,
  FileText,
  Download,
  Play,
  Users,
  Clock,
  Share2,
  Copy,
  Check,
} from "lucide-react";
import { format, addHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

function CreateMeetingDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  isCreating 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isCreating: boolean;
}) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [nomeCliente, setNomeCliente] = useState("");
  const [emailCliente, setEmailCliente] = useState("");
  const [dataInicio, setDataInicio] = useState(() => {
    const now = new Date();
    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15);
    return format(now, "yyyy-MM-dd'T'HH:mm");
  });
  const [duracao, setDuracao] = useState(30);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeCliente || !emailCliente) {
      toast.error("Nome e e-mail do cliente são obrigatórios");
      return;
    }

    const inicio = new Date(dataInicio);
    const fim = addHours(inicio, duracao / 60);
    
    onSubmit({
      titulo: titulo || "Nova Reunião",
      descricao,
      nome: nomeCliente,
      email: emailCliente,
      dataInicio: inicio.toISOString(),
      dataFim: fim.toISOString(),
      duracao,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nova Reunião</DialogTitle>
            <DialogDescription>
              Agende uma nova reunião para sua equipe.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                placeholder="Ex: Reunião de alinhamento"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="nomeCliente">Nome do Cliente</Label>
                <Input
                  id="nomeCliente"
                  placeholder="Nome completo"
                  value={nomeCliente}
                  onChange={(e) => setNomeCliente(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="emailCliente">E-mail do Cliente</Label>
                <Input
                  id="emailCliente"
                  type="email"
                  placeholder="cliente@email.com"
                  value={emailCliente}
                  onChange={(e) => setEmailCliente(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="descricao">Descrição (opcional)</Label>
              <Textarea
                id="descricao"
                placeholder="Descreva o objetivo da reunião..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dataInicio">Data e hora</Label>
                <Input
                  id="dataInicio"
                  type="datetime-local"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="duracao">Duração</Label>
                <select
                  id="duracao"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={duracao}
                  onChange={(e) => setDuracao(Number(e.target.value))}
                >
                  <option value={15}>15 minutos</option>
                  <option value={30}>30 minutos</option>
                  <option value={45}>45 minutos</option>
                  <option value={60}>1 hora</option>
                  <option value={90}>1h 30min</option>
                  <option value={120}>2 horas</option>
                </select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating} className="gap-2">
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Criar reunião
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MeetingDetailView({ meetingId }: { meetingId: string }) {
  const navigate = useNavigate();
  const { meeting, loading, error, startMeeting, isStarting } = useReuniao(meetingId);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    if (meeting?.linkReuniao) {
      try {
        await navigator.clipboard.writeText(meeting.linkReuniao);
        setCopied(true);
        toast.success("Link copiado para a área de transferência!");
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        toast.error("Não foi possível copiar o link.");
      }
    }
  };

  const handleStartMeeting = async () => {
    try {
      await startMeeting(meetingId);
      toast.success("Reunião iniciada com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar reunião");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Carregando reunião...</p>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h1 className="text-2xl font-bold">Reunião não encontrada</h1>
        <Button onClick={() => navigate("/reuniao")}>Voltar ao Dashboard</Button>
      </div>
    );
  }

  if (meeting.status === 'em_andamento' && meeting.roomId100ms) {
    return (
      <div className="h-full flex flex-col gap-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/reuniao")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{meeting.titulo}</h1>
              <p className="text-sm text-muted-foreground">
                ID da Sala: {meeting.roomId100ms.substring(0, 8)}... • Status: {meeting.status}
              </p>
            </div>
          </div>
          {meeting.linkReuniao && (
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="gap-2"
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
            meetingId={meetingId}
            participantName={meeting.nome || "Participante"}
            onLeave={() => navigate("/reunioes")} 
          />
        </div>
      </div>
    );
  }

  if (meeting.status === 'concluida' || meeting.status === 'finalizada') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/reuniao")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{meeting.titulo}</h1>
              <Badge className="bg-green-100 text-green-700 border-green-200">Concluída</Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Participante: {meeting.nome} • {meeting.email}
            </p>
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
                  <TabsTrigger value="recording">Gravação de Vídeo</TabsTrigger>
                  <TabsTrigger value="transcript">Transcrição (IA)</TabsTrigger>
                  <TabsTrigger value="summary">Resumo Inteligente</TabsTrigger>
                </TabsList>
                
                <TabsContent value="recording" className="space-y-4">
                  <div className="aspect-video bg-black rounded-lg flex items-center justify-center relative group cursor-pointer overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-16 w-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Play className="h-8 w-8 text-white fill-current ml-1" />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Duração: {meeting.duracao || 45} min
                    </span>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" /> Download MP4
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="transcript" className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg h-[400px] overflow-y-auto space-y-4 text-sm font-mono leading-relaxed">
                    <p className="text-muted-foreground italic text-center py-8">
                      Transcrição será disponibilizada após processamento...
                    </p>
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
                        O resumo será gerado automaticamente após a transcrição da reunião.
                      </p>
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
                {meeting.roomId100ms && (
                  <div>
                    <span className="text-muted-foreground block">ID da Sala</span>
                    <span className="font-mono text-xs bg-muted px-2 py-1 rounded select-all">
                      {meeting.roomId100ms}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/reuniao")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{meeting.titulo}</h1>
          <p className="text-muted-foreground">
            {format(new Date(meeting.dataInicio), "dd 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Informações da Reunião</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {meeting.descricao && (
              <div>
                <Label>Descrição</Label>
                <p className="text-muted-foreground mt-1">{meeting.descricao}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p className="font-medium">
                    {format(new Date(meeting.dataInicio), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Horário</p>
                  <p className="font-medium">
                    {format(new Date(meeting.dataInicio), "HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </div>

            {meeting.status === 'agendada' && (
              <Button
                onClick={handleStartMeeting}
                disabled={isStarting}
                className="w-full gap-2 mt-4"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  <>
                    <Video className="h-4 w-4" />
                    Iniciar Reunião Agora
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Participante</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {meeting.nome && (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {meeting.nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{meeting.nome}</p>
                  {meeting.email && (
                    <p className="text-sm text-muted-foreground">{meeting.email}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MeetingsList() {
  const navigate = useNavigate();
  const { meetings, loading, error, addMeeting, isCreating, startMeeting, isStarting, createInstantMeeting } = useReuniao();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleCreateMeeting = async (data: any) => {
    try {
      const result = await addMeeting(data);
      setCreateDialogOpen(false);
      toast.success("Reunião criada com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar reunião");
    }
  };

  const handleCreateInstantMeeting = async () => {
    try {
      toast.loading("Criando reunião instantânea...");
      const result = await createInstantMeeting();
      toast.dismiss();
      toast.success("Reunião instantânea criada!");
      // 📌 Ajustado para o caminho correto de roteamento
      navigate(`/reuniao/${result.data.id}`);
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "Erro ao criar reunião instantânea");
    }
  };

  const handleStartMeeting = async (id: string) => {
    try {
      await startMeeting(id);
      toast.success("Reunião iniciada!");
      // 📌 Ajustado para o caminho correto de roteamento
      navigate(`/reuniao/${id}`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar reunião");
    }
  };

  const upcomingMeetings = meetings.filter(m => 
    m.status === 'agendada' || m.status === 'em_andamento'
  );
  const pastMeetings = meetings.filter(m => 
    m.status === 'concluida' || m.status === 'finalizada' || m.status === 'cancelada'
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Carregando reuniões...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reuniões</h1>
          <p className="text-muted-foreground">
            Gerencie suas videoconferências
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleCreateInstantMeeting} 
            disabled={isStarting}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            {isStarting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Video className="h-4 w-4" />
                Criar Reunião Agora
              </>
            )}
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Agendar Reunião
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upcomingMeetings.length}</p>
                <p className="text-sm text-muted-foreground">Próximas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Video className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {meetings.filter(m => m.status === 'em_andamento').length}
                </p>
                <p className="text-sm text-muted-foreground">Em andamento</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pastMeetings.length}</p>
                <p className="text-sm text-muted-foreground">Realizadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming" className="gap-2">
            <Calendar className="h-4 w-4" />
            Próximas ({upcomingMeetings.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="gap-2">
            <FileText className="h-4 w-4" />
            Histórico ({pastMeetings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-3">
          {upcomingMeetings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma reunião agendada</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Crie uma nova reunião para começar.
                </p>
                <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Agendar Reunião
                </Button>
              </CardContent>
            </Card>
          ) : (
            upcomingMeetings.map((meeting) => (
              <ReuniaoCard 
                key={meeting.id} 
                meeting={meeting}
                onStart={handleStartMeeting}
                isStarting={isStarting}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-3">
          {pastMeetings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma reunião realizada</h3>
                <p className="text-muted-foreground text-center">
                  O histórico de reuniões aparecerá aqui.
                </p>
              </CardContent>
            </Card>
          ) : (
            pastMeetings.map((meeting) => (
              <ReuniaoCard key={meeting.id} meeting={meeting} />
            ))
          )}
        </TabsContent>
      </Tabs>

      <CreateMeetingDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateMeeting}
        isCreating={isCreating}
      />
    </div>
  );
}

export function ReuniaoDashboardPage({ meetingId: propMeetingId }: { meetingId?: string | null }) {
  const navigate = useNavigate();
  const { id: urlMeetingId } = useParams<{ id?: string }>();
  const meetingId = propMeetingId || urlMeetingId;
  
  const { meetings, loading, error, addMeeting, isCreating, startMeeting, isStarting, createInstantMeeting } = useReuniao();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  if (meetingId) {
    return <MeetingDetailView meetingId={meetingId} />;
  }

  return <MeetingsList />;
}

export default ReuniaoDashboardPage;
