import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useReuniao, Meeting } from "@/hooks/useReuniao";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Video, Clock, Plus, Loader2, Zap, Palette, CheckCircle, XCircle } from "lucide-react";
import { ReuniaoCard } from "@/components/ReuniaoCard";
import { useToast } from "@/hooks/use-toast";
import { InstantMeetingModal } from "@/components/InstantMeetingModal";
import { CreateEventModal } from "@/components/calendar/CreateEventModal";
import { MeetingHeader } from "@/components/MeetingHeader";
import { api } from "@/lib/api";

interface CreatedMeeting {
  id: string;
  linkReuniao: string;
  titulo: string;
}

export default function ReuniaoDashboard() {
  const { meetings, loading } = useReuniao();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [createdMeeting, setCreatedMeeting] = useState<CreatedMeeting | null>(null);
  const [isCreatingInstant, setIsCreatingInstant] = useState(false);

  const meetingsArray = Array.isArray(meetings) ? meetings : [];
  
  const upcomingMeetings = meetingsArray
    .filter((m: Meeting) => {
      const meetingDate = new Date(m.dataInicio);
      const today = new Date();
      return (
        meetingDate.getDate() === today.getDate() &&
        meetingDate.getMonth() === today.getMonth() &&
        meetingDate.getFullYear() === today.getFullYear() &&
        (m.status === 'agendada' || m.status === 'reagendada' || m.status === 'em_andamento')
      );
    })
    .sort((a: Meeting, b: Meeting) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime());

  const completedMeetings = meetingsArray.filter((m: Meeting) => m.status === 'finalizada' || m.status === 'concluida');
  const cancelledMeetings = meetingsArray.filter((m: Meeting) => m.status === 'cancelada');
  const inProgressMeetings = meetingsArray.filter((m: Meeting) => m.status === 'em_andamento');

  const stats = [
    {
      title: "Total de Reunioes",
      value: meetingsArray.length,
      description: "reunioes registradas",
      icon: Video,
      color: "text-blue-500"
    },
    {
      title: "Agendadas",
      value: upcomingMeetings.length,
      description: "proximas reunioes",
      icon: Calendar,
      color: "text-green-500"
    },
    {
      title: "Concluidas",
      value: completedMeetings.length,
      description: "reunioes encerradas",
      icon: CheckCircle,
      color: "text-purple-500"
    },
    {
      title: "Canceladas",
      value: cancelledMeetings.length,
      description: "reunioes canceladas",
      icon: XCircle,
      color: "text-red-500"
    }
  ];

  const handleInstantMeeting = async () => {
    setIsCreatingInstant(true);
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      const response = await api.post('/api/reunioes/instantanea', {
        titulo: "Reuniao Instantanea - " + timeStr
      });
      
      const meetingData = response.data?.data || response.data;
      
      if (meetingData && meetingData.id) {
        setCreatedMeeting({
          id: meetingData.id,
          linkReuniao: meetingData.linkReuniao || meetingData.link_reuniao,
          titulo: meetingData.titulo
        });
        setShowMeetingModal(true);
        toast({
          title: "Reuniao criada!",
          description: "Sua reuniao instantanea foi criada com sucesso."
        });
      }
    } catch (error: any) {
      console.error("Erro ao criar reuniao instantanea:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.response?.data?.error || "Nao foi possivel criar a reuniao."
      });
    } finally {
      setIsCreatingInstant(false);
    }
  };

  const handleCloseModal = () => {
    setShowMeetingModal(false);
    setCreatedMeeting(null);
  };

  const handleJoinMeeting = () => {
    if (createdMeeting?.linkReuniao) {
      window.open(createdMeeting.linkReuniao, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <MeetingHeader 
        title="Reunioes" 
        description="Gerencie suas videoconferencias e agendamentos." 
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index} data-testid={"card-stat-" + index}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={"h-4 w-4 " + stat.color} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Proximas Reunioes de Hoje</CardTitle>
            <CardDescription>
              Voce tem {upcomingMeetings.length} reunioes agendadas para hoje.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingMeetings.length === 0 ? (
                <div className="text-center py-8">
                  <Video className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">Nenhuma reuniao agendada.</p>
                  <Button onClick={handleInstantMeeting} disabled={isCreatingInstant} className="gap-2" data-testid="button-create-instant">
                    {isCreatingInstant ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    Criar Reuniao Agora
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcomingMeetings.map((meeting: Meeting) => (
                    <ReuniaoCard key={meeting.id} meeting={{
                      id: meeting.id,
                      titulo: meeting.titulo,
                      nome: meeting.nome || '',
                      email: meeting.email || '',
                      data_inicio: meeting.dataInicio,
                      data_fim: meeting.dataFim,
                      status: meeting.status,
                      link_reuniao: meeting.linkReuniao,
                      room_id_100ms: meeting.roomId100ms,
                    }} />
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <InstantMeetingModal
        open={showMeetingModal}
        onClose={handleCloseModal}
        meeting={createdMeeting}
        onJoin={handleJoinMeeting}
      />

      <CreateEventModal 
        open={showScheduleModal} 
        onOpenChange={setShowScheduleModal} 
      />
    </div>
  );
}
