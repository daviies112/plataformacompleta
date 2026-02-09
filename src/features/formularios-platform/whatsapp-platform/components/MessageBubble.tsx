import { Badge } from "@/components/ui/badge";
import { Bot, User, FileText, Image as ImageIcon, Video, File, Download, Check, CheckCheck, Clock, AlertCircle } from "lucide-react";
import { cn, formatMessageTime } from "../lib/utils";
import { AudioPlayer } from "./AudioPlayer";
import { ImageViewer } from "./ImageViewer";

interface MessageBubbleProps {
  message: {
    id: string;
    texto: string;
    tipo: "recebida" | "enviada";
    enviadaPor: "cliente" | "ia" | "atendente";
    timestamp: string;
    mediaType?: "audio" | "image" | "video" | "document";
    mediaUrl?: string;
    mediaBase64?: string; // Base64 da mídia
    caption?: string;
    status?: "sending" | "sent" | "error";
    duration?: number;
    fileName?: string;
    fileSize?: number;
    messageKey?: any; // Key da mensagem para baixar mídia
  };
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isReceived = message.tipo === "recebida";
  const isIA = message.enviadaPor === "ia";
  const mediaType = message.mediaType || "text";

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    const mb = bytes / (1024 * 1024);
    return mb > 1 ? `${mb.toFixed(2)} MB` : `${(bytes / 1024).toFixed(2)} KB`;
  };

  const renderStatusIcon = () => {
    if (isReceived) return null;

    switch (message.status) {
      case "sending":
        return <Clock className="w-3 h-3" />;
      case "sent":
        return <CheckCheck className="w-3 h-3" />;
      case "error":
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      default:
        return <Check className="w-3 h-3" />;
    }
  };

  return (
    <div
      className={cn(
        "flex gap-2 items-end animate-in fade-in-50 slide-in-from-bottom-2 duration-300",
        isReceived ? "justify-start" : "justify-end"
      )}
    >
      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-2 shadow-sm",
          isReceived
            ? "bg-message-received text-foreground rounded-bl-sm"
            : "bg-message-sent text-message-sent-foreground rounded-br-sm"
        )}
      >
        {!isReceived && (
          <Badge
            variant="secondary"
            className={cn(
              "mb-1.5 text-xs font-medium",
              isIA
                ? "bg-badge-ia text-white hover:bg-badge-ia/90"
                : "bg-badge-atendente text-white hover:bg-badge-atendente/90"
            )}
          >
            {isIA ? (
              <>
                <Bot className="h-3 w-3 mr-1" />
                IA
              </>
            ) : (
              <>
                <User className="h-3 w-3 mr-1" />
                Você
              </>
            )}
          </Badge>
        )}
        
        {/* Media Content */}
        {mediaType === "audio" && (message.mediaUrl || message.mediaBase64) ? (
          <div className="mb-2">
            <AudioPlayer 
              audioUrl={message.mediaUrl} 
              audioBase64={message.mediaBase64}
              isReceived={isReceived}
              messageKey={message.messageKey}
            />
          </div>
        ) : mediaType === "image" && (message.mediaUrl || message.mediaBase64) ? (
          <div className="mb-2">
            <ImageViewer
              imageUrl={message.mediaUrl}
              imageBase64={message.mediaBase64}
              caption={message.caption}
              isReceived={isReceived}
              messageKey={message.messageKey}
            />
          </div>
        ) : mediaType === "video" && (message.mediaUrl || message.mediaBase64) ? (
          <div className="mb-2">
            <video 
              src={message.mediaBase64 ? `data:video/mp4;base64,${message.mediaBase64}` : message.mediaUrl}
              controls
              preload="metadata"
              className="rounded-lg max-w-full h-auto max-h-[300px]"
              onError={(e) => {
                console.error("❌ Erro ao carregar vídeo:", message.mediaUrl || 'base64');
              }}
            >
              <source 
                src={message.mediaBase64 ? `data:video/mp4;base64,${message.mediaBase64}` : message.mediaUrl} 
                type="video/mp4" 
              />
              Seu navegador não suporta vídeo.
            </video>
            {message.caption && (
              <p className="text-sm mt-2">{message.caption}</p>
            )}
          </div>
        ) : mediaType === "document" && (message.mediaUrl || message.mediaBase64) ? (
          <div className="mb-2">
            <a 
              href={message.mediaBase64 ? `data:application/octet-stream;base64,${message.mediaBase64}` : message.mediaUrl}
              download={message.fileName}
              className="flex items-center gap-3 p-3 bg-background/10 rounded-lg hover:bg-background/20 transition-colors"
            >
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                isReceived ? "bg-primary/20" : "bg-white/20"
              )}>
                <Download className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {message.fileName || "Documento"}
                </p>
                {message.fileSize && (
                  <p className="text-xs opacity-70">
                    {formatFileSize(message.fileSize)}
                  </p>
                )}
              </div>
              <Download className="w-5 h-5 opacity-50 flex-shrink-0" />
            </a>
            {message.caption && (
              <p className="text-sm mt-2">{message.caption}</p>
            )}
          </div>
        ) : null}

        {/* Text/Caption */}
        {message.texto && mediaType === "text" && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.texto}
          </p>
        )}
        
        {/* Footer com timestamp e status */}
        <div className={cn(
          "flex items-center gap-1 mt-1 text-xs",
          isReceived ? "text-muted-foreground" : "text-message-sent-foreground/70"
        )}>
          <span>{formatMessageTime(message.timestamp)}</span>
          {renderStatusIcon()}
        </div>
      </div>
    </div>
  );
}
