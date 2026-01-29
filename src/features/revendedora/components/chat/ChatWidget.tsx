import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Phone, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useChat, ChatMessage } from '@/hooks/useChat';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

const CATEGORIES = [
  { id: 'suporte', label: 'Suporte', color: 'bg-red-500' },
  { id: 'produto', label: 'Produtos', color: 'bg-green-500' },
  { id: 'pedido', label: 'Pedidos', color: 'bg-blue-500' },
  { id: 'financeiro', label: 'Financeiro', color: 'bg-yellow-500' },
];

function MessageBubble({ message }: { message: ChatMessage }) {
  const isSent = message.type === 'sent';
  const time = format(new Date(message.created_at), 'HH:mm', { locale: ptBR });
  
  return (
    <div className={cn(
      'flex w-full mb-2',
      isSent ? 'justify-end' : 'justify-start'
    )}>
      <div className={cn(
        'max-w-[80%] rounded-lg px-3 py-2 shadow-sm',
        isSent 
          ? 'bg-primary text-primary-foreground rounded-br-none' 
          : 'bg-muted rounded-bl-none'
      )}>
        <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
        <div className={cn(
          'flex items-center gap-1 mt-1',
          isSent ? 'justify-end' : 'justify-start'
        )}>
          <span className={cn(
            'text-[10px]',
            isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}>
            {time}
          </span>
          {isSent && (
            <span className={cn(
              'text-[10px]',
              message.status === 'failed' ? 'text-red-300' :
              message.status === 'pending' ? 'text-primary-foreground/50' :
              'text-primary-foreground/70'
            )}>
              {message.status === 'pending' && '⏳'}
              {message.status === 'sent' && '✓'}
              {message.status === 'delivered' && '✓✓'}
              {message.status === 'read' && '✓✓'}
              {message.status === 'failed' && '✕'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('suporte');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const {
    messages,
    loading,
    sending,
    error,
    isConnected,
    hasSupabase,
    sendMessage
  } = useChat();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim() || sending) return;
    
    const message = inputValue;
    setInputValue('');
    await sendMessage(message, selectedCategory);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 h-10 w-10 rounded-full shadow-lg z-40 hover:scale-105 transition-transform lg:bottom-6 lg:right-6 lg:h-14 lg:w-14"
          size="icon"
        >
          <MessageCircle className="h-5 w-5 lg:h-6 lg:w-6" />
        </Button>
      )}

      {isOpen && (
        <div className="fixed bottom-20 right-4 w-[320px] h-[400px] bg-background border rounded-lg shadow-2xl z-40 flex flex-col overflow-hidden lg:bottom-6 lg:right-6 lg:w-[360px] lg:h-[500px]">
          <div className="flex items-center justify-between p-3 border-b bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              <div>
                <h3 className="font-semibold text-sm">Chat com a Empresa</h3>
                <div className="flex items-center gap-1">
                  {isConnected ? (
                    <>
                      <Wifi className="h-3 w-3 text-green-300" />
                      <span className="text-[10px] text-primary-foreground/80">WhatsApp conectado</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3 w-3 text-yellow-300" />
                      <span className="text-[10px] text-primary-foreground/80">Chat interno</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-1 p-2 border-b overflow-x-auto">
            {CATEGORIES.map((cat) => (
              <Badge
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer text-[10px] px-2 py-0.5 whitespace-nowrap',
                  selectedCategory === cat.id && cat.color
                )}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.label}
              </Badge>
            ))}
          </div>

          <ScrollArea className="flex-1 p-3" ref={scrollRef}>
            {!hasSupabase ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <WifiOff className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground font-medium">
                  Chat não configurado
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Configure as credenciais do Supabase para habilitar o chat com WhatsApp.
                </p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma mensagem ainda.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Envie uma mensagem para iniciar a conversa!
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
              </div>
            )}
          </ScrollArea>

          {error && (
            <div className="px-3 py-2 bg-destructive/10 border-t border-destructive/20">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          <div className="p-3 border-t bg-muted/30">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={hasSupabase ? "Digite sua mensagem..." : "Configure o Supabase primeiro"}
                disabled={sending || !hasSupabase}
                className="flex-1 text-sm"
              />
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || sending || !hasSupabase}
                size="icon"
                className="shrink-0"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
