import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useReuniao, Meeting } from "@/hooks/useReuniao";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Video, Clock, Plus, Loader2, Zap } from "lucide-react";
import { Link, useLocation } from "wouter";
import { ReuniaoCard } from "@/components/ReuniaoCard";
import { useToast } from "@/hooks/use-toast";
import { InstantMeetingModal } from "@/components/InstantMeetingModal";

interface CreatedMeeting {
  id: string;
  linkReuniao: string;
  titulo: string;
}

export default function Dashboard() {
  const { tenant } = useAuth();
  const { meetings, loading, createInstantMeeting, isCreatingInstant } = useReuniao();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [createdMeeting, setCreatedMeeting] = useState<CreatedMeeting | null>(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);

  const meetingsArray = Array.isArray(meetings) ? meetings : [];
  
  const upcomingMeetings = meetingsArray
    .filter((m: Meeting) => new Date(m.dataInicio) > new Date() && m.status === 'agendada')
    .sort((a: Meeting, b: Meeting) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime())
    .slice(0, 3);

  const handleInstantMeeting = async () => {
    try {
      const meeting = await createInstantMeeting({ titulo: 'Reunião Instantânea' });
      setCreatedMeeting({
        id: meeting.id,
        linkReuniao: meeting.linkReuniao || '',
        titulo: meeting.titulo || 'Reunião Instantânea',
      });
      setShowMeetingModal(true);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Não foi possível criar a reunião.",
        variant: "destructive",
      });
    }
  };

  const handleJoinMeeting = () => {
    if (createdMeeting) {
      setShowMeetingModal(false);
      setLocation(`/reuniao/${createdMeeting.id}`);
    }
  };

  const handleCloseModal = () => {
    setShowMeetingModal(false);
  };

  const stats = [
    {
      title: "Total Reuniões",
      value: meetingsArray.length,
      description: "Neste mês",
      icon: Video,
      color: "text-blue-500",
    },
    {
      title: "Agendadas",
      value: meetingsArray.filter((m: Meeting) => m.status === "agendada").length,
      description: "Próximos 7 dias",
      icon: Calendar,
      color: "text-green-500",
    },
    {
      title: "Em Andamento",
      value: meetingsArray.filter((m: Meeting) => m.status === "em_andamento").length,
      description: "Reuniões ativas",
      icon: Clock,
      color: "text-orange-500",
    },
    {
      title: "Finalizadas",
      value: meetingsArray.filter((m: Meeting) => m.status === "finalizada" || m.status === "concluida").length,
      description: "Este mês",
      icon: Users,
      color: "text-purple-500",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo ao MeetFlow. Aqui está o resumo de hoje.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleInstantMeeting} 
            disabled={isCreatingInstant}
            variant="default"
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            {isCreatingInstant ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Reunião Instantânea
          </Button>
          <Link href="/calendario">
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" /> Agendar Reunião
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Próximas Reuniões</CardTitle>
            <CardDescription>
              Você tem {upcomingMeetings.length} reuniões agendadas em breve.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingMeetings.length === 0 ? (
                <div className="text-center py-8">
                  <Video className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">Nenhuma reunião agendada.</p>
                  <Button onClick={handleInstantMeeting} disabled={isCreatingInstant} className="gap-2">
                    <Zap className="h-4 w-4" /> Criar Reunião Agora
                  </Button>
                </div>
              ) : (
                upcomingMeetings.map((meeting: Meeting) => (
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
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>API Pública para n8n</CardTitle>
            <CardDescription>
              Endpoints disponíveis para automação.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-green-600">POST /api/public/reunioes</p>
                <p className="text-xs text-muted-foreground mt-1">Criar reunião via webhook</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-blue-600">GET /api/public/reunioes</p>
                <p className="text-xs text-muted-foreground mt-1">Listar reuniões</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-purple-600">POST /api/webhooks/reuniao-iniciada</p>
                <p className="text-xs text-muted-foreground mt-1">Webhook quando reunião inicia</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-orange-600">POST /api/webhooks/reuniao-finalizada</p>
                <p className="text-xs text-muted-foreground mt-1">Webhook quando reunião termina</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <InstantMeetingModal
        isOpen={showMeetingModal}
        onClose={handleCloseModal}
        meeting={createdMeeting}
      />
    </div>
  );
}
