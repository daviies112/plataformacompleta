import { Badge } from "./ui/badge";
import { CheckCircle2, XCircle, Clock, Eye, Send, FileText } from "lucide-react";
import { cn } from "../lib/utils";

interface LeadStatusBadgeProps {
  lead: {
    formularioEnviado?: boolean;
    formularioAberto?: boolean;
    formularioIniciado?: boolean;
    formularioConcluido?: boolean;
    statusQualificacao?: string;
    pontuacao?: number;
  };
  progressoPercentual?: number;
  className?: string;
}

export function LeadStatusBadge({ lead, progressoPercentual = 0, className }: LeadStatusBadgeProps) {
  const getStatusInfo = () => {
    if (lead.formularioConcluido && lead.statusQualificacao === 'aprovado') {
      return {
        variant: 'approved' as const,
        icon: CheckCircle2,
        text: `APROVADO (${lead.pontuacao || 0} pts)`,
        className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100'
      };
    }

    if (lead.formularioConcluido && lead.statusQualificacao === 'reprovado') {
      return {
        variant: 'rejected' as const,
        icon: XCircle,
        text: `Reprovado (${lead.pontuacao || 0} pts)`,
        className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100'
      };
    }

    if (lead.formularioIniciado) {
      return {
        variant: 'in_progress' as const,
        icon: Clock,
        text: `Em andamento (${progressoPercentual}%)`,
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100'
      };
    }

    if (lead.formularioAberto) {
      return {
        variant: 'viewed' as const,
        icon: Eye,
        text: 'Visualizou',
        className: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100'
      };
    }

    if (lead.formularioEnviado) {
      return {
        variant: 'sent' as const,
        icon: Send,
        text: 'Enviado (não visualizado)',
        className: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100'
      };
    }

    return {
      variant: 'no_form' as const,
      icon: FileText,
      text: 'Sem formulário',
      className: 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-50'
    };
  };

  const status = getStatusInfo();
  const Icon = status.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold',
        status.className,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {status.text}
    </Badge>
  );
}
