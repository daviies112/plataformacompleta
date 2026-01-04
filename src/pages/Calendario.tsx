import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function CalendarioPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { toast } = useToast();

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendário</h1>
          <p className="text-muted-foreground">Gerencie seus agendamentos.</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center border-2 border-dashed rounded-lg">
        <p className="text-muted-foreground text-center">
          Integração com Google Calendar e Calendário Nativo disponível em breve.
        </p>
      </div>
    </div>
  );
}
