import { useNavigate } from "react-router-dom";
import { useReuniao } from "@/hooks/useReuniao";
import { Button } from "@/components/ui/button";
import { Video, Plus, Zap, Palette, Loader2, Clock } from "lucide-react";
import { useState } from "react";
import { InstantMeetingModal } from "@/components/InstantMeetingModal";
import { CreateEventModal } from "@/components/calendar/CreateEventModal";
import { useToast } from "@/hooks/use-toast";

interface MeetingHeaderProps {
  title: string;
  description: string;
}

export function MeetingHeader({ title, description }: MeetingHeaderProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createInstantMeeting, isCreatingInstant } = useReuniao();
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [createdMeeting, setCreatedMeeting] = useState<any>(null);

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
      navigate(`/reuniao/${createdMeeting.id}`);
    }
  };

  return (
    <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="flex gap-2 flex-wrap">
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
        <Button 
          variant="outline" 
          className="gap-2"
          onClick={() => setShowScheduleModal(true)}
        >
          <Plus className="h-4 w-4" /> Agendar Reunião
        </Button>
        <Button 
          variant="outline" 
          className="gap-2"
          onClick={() => navigate("/gravacoes")}
        >
          <Video className="h-4 w-4" /> Gravações
        </Button>
        <Button 
          variant="outline" 
          className="gap-2"
          onClick={() => navigate("/horarios-disponiveis")}
          data-testid="button-horarios"
        >
          <Clock className="h-4 w-4" /> Horários
        </Button>
        <Button 
          variant="outline" 
          className="gap-2"
          onClick={() => navigate("/room-design")}
        >
          <Palette className="h-4 w-4" /> Design
        </Button>
      </div>

      <InstantMeetingModal
        open={showMeetingModal}
        onClose={() => setShowMeetingModal(false)}
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
