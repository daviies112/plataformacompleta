import { Phone, Video, MoreVertical, Send, Loader2, RefreshCw, AlertCircle, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { MessageBubble } from "./MessageBubble";
import { QRCodeDisplay } from "./QRCodeDisplay";
import { AudioRecorder } from "./AudioRecorder";
import MediaSender from "./MediaSender";
import { TagSelector } from "./TagSelector";
import { TagBadge } from "./TagBadge";
import { LeadStatusLabel } from "./LeadStatusLabel";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { configManager } from "../lib/config";

interface Message {
  id: string;
  texto: string;
  tipo: "recebida" | "enviada";
  enviadaPor: "cliente" | "ia" | "atendente";
  timestamp: string;
  mediaType?: "audio" | "image" | "video" | "document";
  mediaUrl?: string;
  caption?: string;
}

interface ChatAreaProps {
  conversation: {
    id: string;
    nome: string;
    numero: string;
    tags?: string[];
  } | null;
  messages: Message[];
  onSendMessage: (message: string) => Promise<void>;
  onSendAudio?: (audioBlob: Blob) => Promise<void>;
  onSendMedia?: (mediaData: {
    mediatype: 'image' | 'video' | 'document';
    mimetype: string;
    media: string;
    caption?: string;
    fileName?: string;
  }) => Promise<void>;
  connectionState?: { connected: boolean; state: string } | null;
  onCheckConnection?: () => Promise<{ connected: boolean; state: string }>;
  onUpdateName?: (conversationId: string, newName: string) => void;
  onTagsChange?: (conversationId: string, tagIds: string[]) => void;
}

export function ChatArea({ conversation, messages, onSendMessage, onSendAudio, onSendMedia, connectionState, onCheckConnection, onUpdateName, onTagsChange }: ChatAreaProps) {
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [conversationTags, setConversationTags] = useState<string[]>([]);
  const [isUserNearBottom, setIsUserNearBottom] = useState(true);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);

  // 🎯 OTIMIZAÇÃO: Detectar se usuário está próximo do fim da conversa
  const checkIfNearBottom = () => {
    const container = scrollContainerRef.current;
    if (!container) return true;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom < 100; // 100px do fim
  };

  // 🎯 OTIMIZAÇÃO: Handler para scroll - detectar posição do usuário
  const handleScroll = () => {
    const nearBottom = checkIfNearBottom();
    setIsUserNearBottom(nearBottom);
  };

  // 🎯 OTIMIZAÇÃO: Scroll condicional - só rola se usuário estiver próximo do fim
  const scrollToBottom = () => {
    if (isUserNearBottom && !isLoadingOlderMessages) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Carregar tags da conversa quando mudar
  useEffect(() => {
    if (conversation) {
      const tags = conversation.tags || configManager.getConversationTags(conversation.id);
      setConversationTags(tags);
    }
  }, [conversation]);

  const handleTagsChange = (newTagIds: string[]) => {
    if (!conversation) return;
    
    setConversationTags(newTagIds);
    configManager.setConversationTags(conversation.id, newTagIds);
    
    if (onTagsChange) {
      onTagsChange(conversation.id, newTagIds);
    }
  };

  const handleCheckConnection = async () => {
    if (!onCheckConnection) return;
    
    setIsCheckingConnection(true);
    try {
      const state = await onCheckConnection();
      if (state.connected) {
        toast.success("WhatsApp conectado!", {
          description: "Você pode enviar mensagens normalmente",
        });
      } else {
        toast.error("WhatsApp desconectado", {
          description: "Conecte sua instância no Evolution API Manager para enviar mensagens",
        });
      }
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const handleSend = async () => {
    if (!messageInput.trim() || isSending) return;

    // Verificar se está desconectado
    if (connectionState && !connectionState.connected) {
      toast.error("Não é possível enviar", {
        description: "WhatsApp desconectado. Clique no ícone de alerta no header para mais informações.",
        duration: 5000,
      });
      return;
    }

    const messageToSend = messageInput.trim();
    setMessageInput("");
    setIsSending(true);

    try {
      await onSendMessage(messageToSend);
      toast.success("Mensagem enviada!", {
        duration: 2000,
      });
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      const errorMsg = error instanceof Error ? error.message : "Erro desconhecido";
      
      if (errorMsg.includes("não está conectado") || errorMsg.includes("Connection Closed")) {
        toast.error("WhatsApp desconectado", {
          description: "Reconecte sua instância no Evolution API Manager",
          duration: 5000,
        });
      } else {
        toast.error("Erro ao enviar mensagem", {
          description: errorMsg,
          duration: 3000,
        });
      }
      setMessageInput(messageToSend);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStartEditName = () => {
    if (conversation) {
      setNewName(conversation.nome);
      setIsEditingName(true);
    }
  };

  const handleSaveName = () => {
    if (conversation && newName.trim() && onUpdateName) {
      onUpdateName(conversation.id, newName.trim());
      setIsEditingName(false);
      toast.success("Nome atualizado!", {
        description: `Agora esta conversa aparece como "${newName.trim()}"`,
        duration: 3000,
      });
    }
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setNewName("");
  };

  const handleNameKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveName();
    } else if (e.key === "Escape") {
      handleCancelEditName();
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-chat-bg overflow-auto">
        <div className="w-full max-w-3xl mx-auto p-8 space-y-8 animate-in fade-in-50 duration-500">
          <div className="text-center space-y-4">
            <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <svg
                className="w-12 h-12 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Dashboard de Atendimento</h2>
              <p className="text-lg text-muted-foreground">
                Selecione uma conversa para começar a atender
              </p>
            </div>
          </div>

          {/* QR Code Component */}
          <div className="mt-8">
            <QRCodeDisplay />
          </div>
        </div>
      </div>
    );
  }

  const initials = conversation.nome
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-col h-full bg-chat-bg">
      {/* Header */}
      <header className="bg-card border-b border-border p-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={handleNameKeyPress}
                    className="h-7 w-48"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" onClick={handleSaveName} className="h-7 w-7">
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={handleCancelEditName} className="h-7 w-7">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <h2 className="font-semibold text-foreground">{conversation.nome}</h2>
                  {onUpdateName && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setNewName(conversation.nome);
                        setIsEditingName(true);
                      }}
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Editar nome"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  )}
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{conversation.numero}</p>
            
            {/* Status do Lead (Formulário/Qualificação) */}
            <div className="mt-2">
              <LeadStatusLabel phoneNumber={conversation.numero} refreshInterval={10000} />
            </div>
            
            {/* Tags da conversa */}
            {conversationTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {conversationTags.map((tagId) => (
                  <TagBadge
                    key={tagId}
                    tagId={tagId}
                    size="sm"
                    showRemove
                    onRemove={() => {
                      handleTagsChange(conversationTags.filter(id => id !== tagId));
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Tag Selector */}
          <TagSelector
            selectedTagIds={conversationTags}
            onTagsChange={handleTagsChange}
            variant="ghost"
            size="sm"
          />
          
          {connectionState && (
            <Button 
              variant={connectionState.connected ? "ghost" : "destructive"}
              size="icon" 
              title={connectionState.connected ? "WhatsApp Conectado" : "WhatsApp Desconectado - Clique para verificar"}
              onClick={handleCheckConnection}
              disabled={isCheckingConnection}
            >
              {isCheckingConnection ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : connectionState.connected ? (
                <div className="relative">
                  <Phone className="h-5 w-5" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                </div>
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
            </Button>
          )}
          <Button variant="ghost" size="icon" title="Mais opções">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Messages - SCROLLABLE AREA */}
      <div className="flex-1 overflow-hidden">
        <div ref={scrollContainerRef} className="h-full overflow-y-auto p-4" onScroll={handleScroll}>
          <div className="space-y-3 pb-4">
            {messages.length === 0 ? (
              <div className="text-center py-12 animate-in fade-in-50 duration-500">
                <p className="text-muted-foreground">Nenhuma mensagem ainda</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Envie a primeira mensagem para começar a conversa
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>


      {/* Input */}
      <div className="bg-card border-t border-border p-4 shadow-lg shrink-0">
        {connectionState && !connectionState.connected && (
          <div className="mb-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-destructive">WhatsApp Desconectado</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Você pode ver conversas antigas, mas não pode enviar mensagens.
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleCheckConnection}
              disabled={isCheckingConnection}
              className="shrink-0"
            >
              {isCheckingConnection ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </Button>
          </div>
        )}
        
        <div className="flex items-end gap-2 max-w-5xl mx-auto">
          {onSendMedia && (
            <MediaSender
              onSendMedia={onSendMedia}
              disabled={connectionState && !connectionState.connected}
            />
          )}
          {onSendAudio && (
            <AudioRecorder 
              onSendAudio={onSendAudio}
              disabled={connectionState && !connectionState.connected}
            />
          )}
          <Input
            placeholder={
              connectionState && !connectionState.connected 
                ? "Não é possível enviar (desconectado)" 
                : "Digite sua mensagem..."
            }
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isSending || (connectionState && !connectionState.connected)}
            className="flex-1 resize-none"
          />
          <Button
            onClick={handleSend}
            disabled={!messageInput.trim() || isSending || (connectionState && !connectionState.connected)}
            className="shrink-0"
            size="icon"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {connectionState && !connectionState.connected 
            ? "Conecte o WhatsApp no Evolution API Manager para enviar" 
            : "Pressione Enter para enviar ou clique no microfone para gravar áudio"}
        </p>
      </div>
    </div>
  );
}
