import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, Copy, Check, XCircle, CalendarClock, Loader2, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ReuniaoCardMeeting {
  id: string;
  titulo?: string | null;
  nome?: string | null;
  email?: string | null;
  data_inicio: string;
  data_fim?: string;
  status?: string;
  link_reuniao?: string | null;
  room_id_100ms?: string | null;
}

interface ReuniaoCardProps {
  meeting: ReuniaoCardMeeting;
  onUpdate?: () => void;
}

export function ReuniaoCard({ meeting, onUpdate }: ReuniaoCardProps) {
  const [copied, setCopied] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleCopyLink = async () => {
    if (meeting.link_reuniao) {
      try {
        await navigator.clipboard.writeText(meeting.link_reuniao);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  const cancelMeetingMutation = useMutation({
    mutationFn: async (meetingId: string) => {
      const response = await apiRequest('DELETE', `/api/reunioes/${meetingId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Reunião cancelada',
        description: 'A reunião foi cancelada com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reunioes'] });
      queryClient.invalidateQueries({ queryKey: ['reunioes-calendario'] });
      onUpdate?.();
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao cancelar',
        description: error.message || 'Não foi possível cancelar a reunião.',
      });
    },
  });

  const rescheduleMeetingMutation = useMutation({
    mutationFn: async ({ meetingId, dataInicio }: { meetingId: string; dataInicio: string }) => {
      const response = await apiRequest('PATCH', `/api/reunioes/${meetingId}`, {
        dataInicio,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Reunião reagendada',
        description: 'A reunião foi reagendada com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reunioes'] });
      queryClient.invalidateQueries({ queryKey: ['reunioes-calendario'] });
      setShowRescheduleDialog(false);
      setRescheduleDate('');
      setRescheduleTime('');
      onUpdate?.();
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao reagendar',
        description: error.message || 'Não foi possível reagendar a reunião.',
      });
    },
  });

  const handleCancelMeeting = () => {
    cancelMeetingMutation.mutate(meeting.id);
  };

  const handleRescheduleMeeting = () => {
    if (!rescheduleDate || !rescheduleTime) {
      toast({
        variant: 'destructive',
        title: 'Dados incompletos',
        description: 'Por favor, selecione a nova data e horário.',
      });
      return;
    }

    const newDateTime = new Date(`${rescheduleDate}T${rescheduleTime}`);
    if (isNaN(newDateTime.getTime())) {
      toast({
        variant: 'destructive',
        title: 'Data inválida',
        description: 'Por favor, verifique a data e horário selecionados.',
      });
      return;
    }

    rescheduleMeetingMutation.mutate({
      meetingId: meeting.id,
      dataInicio: newDateTime.toISOString(),
    });
  };

  const openRescheduleDialog = () => {
    const date = new Date(meeting.data_inicio);
    setRescheduleDate(format(date, 'yyyy-MM-dd'));
    setRescheduleTime(format(date, 'HH:mm'));
    setShowRescheduleDialog(true);
  };

  const displayName = meeting.nome || meeting.titulo || "Reunião";
  const isCancelled = meeting.status === 'cancelada';
  const isCompleted = meeting.status === 'concluida' || meeting.status === 'finalizada';
  const canModify = !isCancelled && !isCompleted;

  const getStatusBadge = () => {
    switch (meeting.status) {
      case 'agendada':
        return <Badge variant="secondary" className="text-xs">Agendada</Badge>;
      case 'em_andamento':
        return <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 text-xs">Em andamento</Badge>;
      case 'concluida':
      case 'finalizada':
        return <Badge variant="outline" className="text-xs">Concluída</Badge>;
      case 'cancelada':
        return <Badge variant="destructive" className="text-xs">Cancelada</Badge>;
      case 'reagendada':
        return <Badge className="bg-orange-500/20 text-orange-700 dark:text-orange-400 text-xs">Reagendada</Badge>;
      default:
        return null;
    }
  };

  return (
    <>
      <div
        className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${isCancelled ? 'opacity-60' : 'hover:bg-muted/50'}`}
        data-testid={`reuniao-card-${meeting.id}`}
      >
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {displayName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{meeting.titulo || "Reunião"}</p>
              {getStatusBadge()}
            </div>
            <p className="text-sm text-muted-foreground">
              {format(new Date(meeting.data_inicio), "dd 'de' MMMM, HH:mm", { locale: ptBR })} {meeting.nome && `• ${meeting.nome}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {meeting.link_reuniao && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyLink}
              className="gap-2"
              title="Copiar link da reunião"
              data-testid="button-copiar-link"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-green-500" />
                  <span className="text-green-500 text-xs">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span className="text-xs">Compartilhar</span>
                </>
              )}
            </Button>
          )}
          
          {canModify && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={openRescheduleDialog}
                title="Reagendar reunião"
                data-testid="button-reagendar-card"
              >
                <CalendarClock className="h-4 w-4" />
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Cancelar reunião"
                    data-testid="button-cancelar-card"
                  >
                    <XCircle className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancelar Reunião</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja cancelar esta reunião? Esta ação não pode ser desfeita.
                      A sala de vídeo também será desativada.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancelMeeting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {cancelMeetingMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Confirmar Cancelamento
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          
          <Link to={`/reuniao/${meeting.id}`}>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              disabled={isCancelled}
              data-testid="button-entrar-reuniao"
            >
              Entrar <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>

      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Reagendar Reunião
            </DialogTitle>
            <DialogDescription>
              Escolha a nova data e horário para a reunião.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reschedule-date-card">Nova Data</Label>
              <Input
                id="reschedule-date-card"
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                data-testid="input-reschedule-date-card"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reschedule-time-card">Novo Horário</Label>
              <Input
                id="reschedule-time-card"
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
                data-testid="input-reschedule-time-card"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRescheduleDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleRescheduleMeeting}
              disabled={rescheduleMeetingMutation.isPending || !rescheduleDate || !rescheduleTime}
              data-testid="button-confirmar-reagendamento-card"
            >
              {rescheduleMeetingMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CalendarClock className="mr-2 h-4 w-4" />
              )}
              Confirmar Reagendamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
