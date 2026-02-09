import { Search, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConversationItem } from "./ConversationItem";
import { useState } from "react";

interface Conversation {
  id: string;
  numero: string;
  nome: string;
  ultimaMensagem: string;
  timestamp: string;
  naoLidas: number;
  formStatus?: string;
  qualificationStatus?: string;
  pontuacao?: number;
  tags?: string[];
}

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
}

export function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
}: ConversationListProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredConversations = conversations.filter((conv) =>
    conv.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.numero.includes(searchTerm)
  );

  const totalUnread = conversations.reduce((acc, conv) => acc + conv.naoLidas, 0);

  return (
    <div className="flex h-full flex-col bg-card border-r border-border overflow-hidden">
      <header className="p-4 border-b border-border bg-card shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Conversas</h1>
          </div>
          {totalUnread > 0 && (
            <div className="flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-unread text-white text-xs font-bold">
              {totalUnread}
            </div>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversa..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center animate-in fade-in-50 duration-500">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                {searchTerm ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}
              </p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={activeConversationId === conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
              />
            ))
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
