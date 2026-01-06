import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Calendar, Clock, Video, MapPin, Users, Mail, Plus, X, Loader2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

import api from '@/lib/api';
import { useReuniao } from '@/hooks/useReuniao';

interface Attendee {
  email: string;
  name: string;
}

interface CreateEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
}

export const CreateEventModal = ({ open, onOpenChange, defaultDate }: CreateEventModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { addMeeting } = useReuniao();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [date, setDate] = useState(defaultDate || format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState(60);
  const [meetingType, setMeetingType] = useState<'video' | 'presential'>('video');
  const [location, setLocation] = useState('');
  const [sendNotifications, setSendNotifications] = useState(true);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [newAttendeeEmail, setNewAttendeeEmail] = useState('');
  const [newAttendeeName, setNewAttendeeName] = useState('');

  // Sincronizar data do modal com a data selecionada no calendário sempre que o modal abrir
  useEffect(() => {
    if (open && defaultDate) {
      setDate(defaultDate);
    }
  }, [open, defaultDate]);

  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      // Usar useReuniao para criar a reunião que gera o link do 100ms
      const dataInicio = new Date(`${eventData.date}T${eventData.startTime}:00`).toISOString();
      const dataFim = new Date(new Date(dataInicio).getTime() + eventData.duration * 60000).toISOString();
      
      // Se for vídeo, usar o endpoint de reunião para garantir integração com 100ms
      if (eventData.meetingType === 'video') {
        const payload = {
          titulo: eventData.title,
          nome: eventData.clientName,
          email: eventData.clientEmail,
          descricao: eventData.description,
          dataInicio,
          dataFim,
          tipo: 'online',
          participantes: eventData.attendees
        };
        
        // Usar o endpoint direto de criação de reunião que já lida com 100ms
        const response = await api.post('/api/reunioes', payload);
        return response.data;
      }

      // Se for presencial, usar o endpoint de evento manual (Google Calendar se configurado)
      const response = await apiRequest('POST', '/api/dashboard/create-manual-event', eventData);
      return await response.json();
    },
    onSuccess: (data) => {
      // O backend retorna { success: true, meeting: { ... } } ou direto o objeto da reunião
      const meetingData = data.meeting || data;
      
      toast({
        title: 'Reunião criada!',
        description: (
          <div className="space-y-2">
            <p>Sua reunião foi agendada com sucesso via 100ms.</p>
            {meetingData.linkReuniao && (
              <a
                href={meetingData.linkReuniao}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <Video className="w-4 h-4" />
                Abrir Sala de Reunião
              </a>
            )}
          </div>
        ),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reunioes'] });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar reunião',
        description: error.message || 'Não foi possível criar a reunião. Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const handleAddAttendee = () => {
    if (!newAttendeeEmail) {
      toast({
        title: 'Email obrigatório',
        description: 'Digite um email para adicionar um participante.',
        variant: 'destructive',
      });
      return;
    }

    if (attendees.some(att => att.email === newAttendeeEmail)) {
      toast({
        title: 'Participante já adicionado',
        description: 'Este email já está na lista de participantes.',
        variant: 'destructive',
      });
      return;
    }

    setAttendees([...attendees, { email: newAttendeeEmail, name: newAttendeeName || newAttendeeEmail }]);
    setNewAttendeeEmail('');
    setNewAttendeeName('');
  };

  const handleRemoveAttendee = (email: string) => {
    setAttendees(attendees.filter(att => att.email !== email));
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      toast({
        title: 'Título obrigatório',
        description: 'Digite um título para a reunião.',
        variant: 'destructive',
      });
      return;
    }

    const eventData = {
      title: title.trim(),
      clientName: clientName.trim() || undefined,
      clientEmail: clientEmail.trim() || undefined,
      description: description.trim() || undefined,
      date,
      startTime,
      duration,
      attendees,
      location: location.trim() || undefined,
      meetingType,
      sendNotifications,
    };

    createEventMutation.mutate(eventData);
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setClientName('');
    setClientEmail('');
    setDate(defaultDate || format(new Date(), 'yyyy-MM-dd'));
    setStartTime('09:00');
    setDuration(60);
    setMeetingType('presential');
    setLocation('');
    setSendNotifications(true);
    setAttendees([]);
    setNewAttendeeEmail('');
    setNewAttendeeName('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Nova Reunião
          </DialogTitle>
          <DialogDescription>
            Crie uma nova reunião utilizando a plataforma 100ms
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">Título da Reunião *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Reunião de Planejamento"
              className="w-full"
            />
          </div>

          {/* Nome e Email do Cliente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Nome do Cliente
              </Label>
              <Input
                id="clientName"
                data-testid="input-client-name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nome do participante principal"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientEmail" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email do Cliente
              </Label>
              <Input
                id="clientEmail"
                data-testid="input-client-email"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="w-full"
              />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione detalhes sobre a reunião..."
              rows={3}
              className="w-full resize-none"
            />
          </div>

          {/* Data e Hora */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Data *
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startTime" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Horário *
              </Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Duração */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duração</Label>
            <Select value={duration.toString()} onValueChange={(value) => setDuration(parseInt(value))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutos</SelectItem>
                <SelectItem value="30">30 minutos</SelectItem>
                <SelectItem value="45">45 minutos</SelectItem>
                <SelectItem value="60">1 hora</SelectItem>
                <SelectItem value="90">1 hora e 30 minutos</SelectItem>
                <SelectItem value="120">2 horas</SelectItem>
                <SelectItem value="180">3 horas</SelectItem>
                <SelectItem value="240">4 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de Reunião */}
          <div className="space-y-2">
            <Label>Tipo de Reunião</Label>
            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                variant={meetingType === 'video' ? 'default' : 'outline'}
                onClick={() => setMeetingType('video')}
                className="w-full"
              >
                <Video className="w-4 h-4 mr-2" />
                Online (100ms)
              </Button>
              <Button
                type="button"
                variant={meetingType === 'presential' ? 'default' : 'outline'}
                onClick={() => setMeetingType('presential')}
                className="w-full"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Presencial
              </Button>
            </div>
          </div>

          {/* Localização (se presencial) */}
          {meetingType === 'presential' && (
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Local (opcional)
              </Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Sala de Reuniões, Endereço..."
                className="w-full"
              />
            </div>
          )}

          {/* Participantes */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Participantes (opcional)
            </Label>

            {attendees.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {attendees.map((attendee) => (
                  <Badge key={attendee.email} variant="secondary" className="px-3 py-1">
                    <Mail className="w-3 h-3 mr-1" />
                    {attendee.name}
                    <button
                      onClick={() => handleRemoveAttendee(attendee.email)}
                      className="ml-2 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Input
                  value={newAttendeeName}
                  onChange={(e) => setNewAttendeeName(e.target.value)}
                  placeholder="Nome do participante"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddAttendee();
                    }
                  }}
                />
                <Input
                  type="email"
                  value={newAttendeeEmail}
                  onChange={(e) => setNewAttendeeEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddAttendee();
                    }
                  }}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleAddAttendee}
                className="mt-auto"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Enviar Notificações */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="notifications">Enviar convites por email</Label>
              <p className="text-sm text-muted-foreground">
                Os participantes receberão um convite por email
              </p>
            </div>
            <Switch
              id="notifications"
              checked={sendNotifications}
              onCheckedChange={setSendNotifications}
            />
          </div>

          {/* Info sobre 100ms */}
          {meetingType === 'video' && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-3">
                <Video className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Link do 100ms será criado automaticamente
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Os participantes receberão o link de acesso no convite
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={createEventMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createEventMutation.isPending}
          >
            {createEventMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Criar Reunião
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
