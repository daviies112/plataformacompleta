import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, Copy, Check } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

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
}

export function ReuniaoCard({ meeting }: ReuniaoCardProps) {
  const [copied, setCopied] = useState(false);

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

  const displayName = meeting.nome || meeting.titulo || "Reunião";

  return (
    <div
      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
          {displayName.charAt(0)}
        </div>
        <div>
          <p className="font-medium">{meeting.titulo || "Reunião"}</p>
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
        <Link href={`/reuniao/${meeting.id}`}>
          <Button variant="outline" size="sm" className="gap-2">
            Entrar <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
