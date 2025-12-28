import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, Copy, Check, Play, Calendar, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Meeting } from "../types";

interface ReuniaoCardProps {
  meeting: Meeting;
  onStart?: (id: string) => void;
  isStarting?: boolean;
}

const statusColors: Record<string, string> = {
  agendada: "bg-blue-100 text-blue-700 border-blue-200",
  em_andamento: "bg-green-100 text-green-700 border-green-200",
  concluida: "bg-gray-100 text-gray-700 border-gray-200",
  finalizada: "bg-gray-100 text-gray-700 border-gray-200",
  cancelada: "bg-red-100 text-red-700 border-red-200",
};

const statusLabels: Record<string, string> = {
  agendada: "Agendada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
};

export function ReuniaoCard({ meeting, onStart, isStarting }: ReuniaoCardProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    if (meeting.linkReuniao) {
      try {
        await navigator.clipboard.writeText(meeting.linkReuniao);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  const displayName = meeting.nome || meeting.titulo || "Reunião";
  const isActive = meeting.status === 'em_andamento';
  const canStart = meeting.status === 'agendada';

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-4">
      <div className="flex items-center gap-4 flex-1">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium truncate">{meeting.titulo || "Reunião"}</p>
            <Badge className={statusColors[meeting.status] || "bg-gray-100"}>
              {statusLabels[meeting.status] || meeting.status}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(meeting.dataInicio), "dd 'de' MMMM", { locale: ptBR })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {format(new Date(meeting.dataInicio), "HH:mm", { locale: ptBR })}
            </span>
            {meeting.nome && (
              <span className="hidden sm:inline">• {meeting.nome}</span>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        {meeting.linkReuniao && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyLink}
            className="gap-2"
            title="Copiar link da reunião"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-green-500" />
                <span className="text-green-500 text-xs">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span className="text-xs hidden sm:inline">Compartilhar</span>
              </>
            )}
          </Button>
        )}
        
        {canStart && onStart && (
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={() => onStart(meeting.id)}
            disabled={isStarting}
          >
            <Play className="h-3 w-3" />
            Iniciar
          </Button>
        )}
        
        {(isActive || meeting.roomId100ms) && (
          <Button 
            variant="default" 
            size="sm" 
            className="gap-2"
            onClick={() => navigate(`/reuniao/${meeting.id}`)}
          >
            Entrar <ArrowRight className="h-3 w-3" />
          </Button>
        )}
        
        {!isActive && !canStart && !meeting.roomId100ms && (
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={() => navigate(`/reuniao/${meeting.id}`)}
          >
            Ver detalhes <ArrowRight className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
