import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, formatTimestamp } from "../lib/utils";
import { FormStatusBadge } from "./FormStatusBadge";
import { TagBadge } from "./TagBadge";

interface ConversationItemProps {
  conversation: {
    id: string;
    numero: string;
    nome: string;
    ultimaMensagem: string;
    timestamp: string;
    naoLidas: number;
    formStatus?: string;
    qualificationStatus?: string;
    pontuacao?: number;
    tags?: string[]; // IDs das tags personalizadas
  };
  isActive: boolean;
  onClick: () => void;
}

export function ConversationItem({
  conversation,
  isActive,
  onClick,
}: ConversationItemProps) {
  const initials = conversation.nome
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 flex items-start gap-3 border-b border-border hover:bg-secondary/50 transition-all duration-200 text-left",
        isActive && "bg-secondary hover:bg-secondary"
      )}
    >
      <Avatar className="h-12 w-12 shrink-0">
        <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        {/* Nome e Horário/Badge de Não Lidas */}
        <div className="flex items-start justify-between mb-1 gap-2">
          <div className="flex-1 min-w-0">
            <h3
              className={cn(
                "font-semibold text-base truncate",
                conversation.naoLidas > 0 ? "text-foreground" : "text-foreground/90"
              )}
            >
              {conversation.nome}
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={cn(
                "text-xs whitespace-nowrap",
                conversation.naoLidas > 0
                  ? "text-primary font-medium"
                  : "text-muted-foreground"
              )}
            >
              {formatTimestamp(conversation.timestamp)}
            </span>
            {conversation.naoLidas > 0 && (
              <span 
                style={{ 
                  backgroundColor: '#25D366',
                  color: '#ffffff',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  marginLeft: '4px'
                }}
              >
                {conversation.naoLidas}
              </span>
            )}
          </div>
        </div>
        
        {/* Última Mensagem e Badge de Status (inline) */}
        <div className="flex items-center gap-2 mb-1">
          <p
            className={cn(
              "text-sm truncate flex-1",
              conversation.naoLidas > 0
                ? "text-foreground font-medium"
                : "text-muted-foreground"
            )}
          >
            {conversation.ultimaMensagem}
          </p>
        </div>
        
        {/* Badge de Status do Formulário - Pequeno e discreto */}
        <div className="flex items-center gap-1">
          <FormStatusBadge 
            telefone={conversation.id}
            formStatus={conversation.formStatus}
            qualificationStatus={conversation.qualificationStatus}
            pontuacao={conversation.pontuacao}
            className="text-[10px] px-1.5 py-0.5"
          />
          {/* Tags Personalizadas */}
          {conversation.tags && conversation.tags.length > 0 && (
            <>
              {conversation.tags.map((tagId) => (
                <TagBadge key={tagId} tagId={tagId} size="sm" />
              ))}
            </>
          )}
        </div>
      </div>
    </button>
  );
}
