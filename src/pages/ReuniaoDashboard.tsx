import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useReuniao, Meeting } from "@/hooks/useReuniao";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Video, Clock, Plus, Loader2, Zap, Palette } from "lucide-react";
import { ReuniaoCard } from "@/components/ReuniaoCard";
import { useToast } from "@/hooks/use-toast";
import { InstantMeetingModal } from "@/components/InstantMeetingModal";
import { CreateEventModal } from "@/components/calendar/CreateEventModal";

interface CreatedMeeting {
  id: string;
  linkReuniao: string;
  titulo: string;
}

import { MeetingHeader } from "@/components/MeetingHeader";

export default function ReuniaoDashboard() {
  const { meetings, loading } = useReuniao();
  const navigate = useNavigate();

  const meetingsArray = Array.isArray(meetings) ? meetings : [];
  
  const upcomingMeetings = meetingsArray
    .filter((m: Meeting) => new Date(m.dataInicio) > new Date() && m.status === 'agendada')
    .sort((a: Meeting, b: Meeting) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime())
    .slice(0, 5);

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
        title="Reuniões" 
        description="Gerencie suas videoconferências e agendamentos." 
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index} data-testid={`card-stat-${index}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
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
            <CardTitle>Proximas Reunioes</CardTitle>
            <CardDescription>
              Voce tem {upcomingMeetings.length} reunioes agendadas em breve.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingMeetings.length === 0 ? (
                <div className="text-center py-8">
                  <Video className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">Nenhuma reuniao agendada.</p>
                  <Button onClick={handleInstantMeeting} disabled={isCreatingInstant} className="gap-2">
                    <Zap className="h-4 w-4" /> Criar Reuniao Agora
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
            <CardTitle>API Publica para n8n</CardTitle>
            <CardDescription>
              Endpoints disponiveis para automacao.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-green-600">POST /api/public/reunioes</p>
                <p className="text-xs text-muted-foreground mt-1">Criar reuniao via webhook</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-blue-600">GET /api/public/reunioes</p>
                <p className="text-xs text-muted-foreground mt-1">Listar reunioes</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-purple-600">POST /api/webhooks/reuniao-iniciada</p>
                <p className="text-xs text-muted-foreground mt-1">Webhook quando reuniao inicia</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-orange-600">POST /api/webhooks/reuniao-finalizada</p>
                <p className="text-xs text-muted-foreground mt-1">Webhook quando reuniao termina</p>
              </div>
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
