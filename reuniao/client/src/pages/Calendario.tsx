import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useReuniao, Meeting } from "@/hooks/useReuniao";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/Calendar";

export default function CalendarioPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    titulo: "",
    nome: "",
    email: "",
    horario: "09:00",
    descricao: ""
  });

  const { meetings, addMeeting, isCreating } = useReuniao();
  const { toast } = useToast();

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setIsDialogOpen(true);
  };

  const handleCreateMeeting = async () => {
    if (!selectedDate) return;

    const [hours, minutes] = formData.horario.split(':');
    const startDateTime = new Date(selectedDate);
    startDateTime.setHours(parseInt(hours), parseInt(minutes));
    
    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(endDateTime.getHours() + 1);

    try {
      await addMeeting({
        titulo: formData.titulo,
        nome: formData.nome,
        email: formData.email,
        telefone: "",
        descricao: formData.descricao,
        dataInicio: startDateTime.toISOString(),
        dataFim: endDateTime.toISOString(),
      });

      setIsDialogOpen(false);
      setFormData({ titulo: "", nome: "", email: "", horario: "09:00", descricao: "" });
      
      toast({
        title: "Reunião Agendada!",
        description: "A reunião foi criada com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao agendar",
        description: error.response?.data?.message || "Não foi possível criar a reunião.",
        variant: "destructive",
      });
    }
  };

  const calendarMeetings = meetings.map((m: Meeting) => ({
    id: m.id,
    titulo: m.titulo,
    nome: m.nome,
    email: m.email,
    telefone: m.telefone || "",
    data_inicio: m.dataInicio,
    data_fim: m.dataFim,
    status: m.status,
    link_reuniao: m.linkReuniao,
    room_id_100ms: m.roomId100ms,
    tenant_id: m.tenantId,
    usuario_id: m.usuarioId || "",
  }));

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendário</h1>
          <p className="text-muted-foreground">Gerencie seus agendamentos.</p>
        </div>
        <div className="flex items-center gap-2">
           <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
             <DialogTrigger asChild>
               <Button onClick={() => setSelectedDate(new Date())}>
                 <Plus className="mr-2 h-4 w-4" /> Nova Reunião
               </Button>
             </DialogTrigger>
             <DialogContent className="sm:max-w-[500px]">
               <DialogHeader>
                 <DialogTitle>Agendar Nova Reunião</DialogTitle>
                 <DialogDescription>
                   Preencha os detalhes para criar um agendamento e gerar o link da sala.
                 </DialogDescription>
               </DialogHeader>
               
               <div className="grid gap-4 py-4">
                 <div className="grid grid-cols-4 items-center gap-4">
                   <Label htmlFor="date" className="text-right">Data</Label>
                   <div className="col-span-3 font-medium">
                     {selectedDate ? format(selectedDate, "dd 'de' MMMM, yyyy", { locale: ptBR }) : "Selecione uma data"}
                   </div>
                 </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                   <Label htmlFor="titulo" className="text-right">Título</Label>
                   <Input 
                     id="titulo" 
                     className="col-span-3" 
                     placeholder="Ex: Reunião de Alinhamento"
                     value={formData.titulo}
                     onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                   />
                 </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                   <Label htmlFor="cliente" className="text-right">Cliente</Label>
                   <Input 
                     id="cliente" 
                     className="col-span-3" 
                     placeholder="Nome do cliente"
                     value={formData.nome}
                     onChange={(e) => setFormData({...formData, nome: e.target.value})}
                   />
                 </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                   <Label htmlFor="email" className="text-right">Email</Label>
                   <Input 
                     id="email" 
                     className="col-span-3" 
                     placeholder="cliente@email.com"
                     value={formData.email}
                     onChange={(e) => setFormData({...formData, email: e.target.value})}
                   />
                 </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                   <Label htmlFor="horario" className="text-right">Horário</Label>
                   <Input 
                     id="horario" 
                     type="time" 
                     className="col-span-3"
                     value={formData.horario}
                     onChange={(e) => setFormData({...formData, horario: e.target.value})}
                   />
                 </div>
               </div>

               <DialogFooter>
                 <Button type="submit" onClick={handleCreateMeeting} disabled={isCreating}>
                   {isCreating ? (
                     <>
                       <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                       Agendando...
                     </>
                   ) : (
                     "Agendar e Enviar Convite"
                   )}
                 </Button>
               </DialogFooter>
             </DialogContent>
           </Dialog>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <Calendar meetings={calendarMeetings} onDateClick={handleDayClick} />
      </div>
    </div>
  );
}
