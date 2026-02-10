import { useState, useEffect } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "../lib/utils";
import { apiRequest, USER_ID_WHATSAPP } from "../lib/apiClient";

interface ImageViewerProps {
  imageUrl?: string;
  imageBase64?: string;
  mediaDataUrl?: string; // Novo: data URL completo com mimeType
  caption?: string;
  isReceived?: boolean;
  messageKey?: any;
}

export function ImageViewer({ imageUrl, imageBase64, mediaDataUrl, caption, isReceived = false, messageKey }: ImageViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [proxiedUrl, setProxiedUrl] = useState<string | null>(null);
  const [storedMessageKey, setStoredMessageKey] = useState<any>(messageKey);

  useEffect(() => {
    if (messageKey) {
      console.log('🖼️ MessageKey recebido:', messageKey);
      setStoredMessageKey(messageKey);
    }
  }, [messageKey]);

  useEffect(() => {
    const loadImage = async () => {
      // PRIORIDADE 1: mediaDataUrl (formato normalizado do backend)
      if (mediaDataUrl) {
        console.log('✅ Usando mediaDataUrl do backend!');
        setProxiedUrl(mediaDataUrl);
        setIsLoading(false);
        setHasError(false);
        return;
      }

      // PRIORIDADE 2: Se já temos base64, criar data URL direto
      if (imageBase64) {
        console.log('✅ Usando base64 direto da mensagem!', {
          length: imageBase64.length
        });
        // Detectar formato da imagem pelo base64
        const mimeType = imageBase64.startsWith('/9j/') ? 'image/jpeg' :
                        imageBase64.startsWith('iVBOR') ? 'image/png' :
                        imageBase64.startsWith('R0lGO') ? 'image/gif' :
                        imageBase64.startsWith('UklGR') ? 'image/webp' :
                        'image/jpeg'; // Default
        const dataUrl = `data:${mimeType};base64,${imageBase64}`;
        setProxiedUrl(dataUrl);
        setIsLoading(false);
        setHasError(false);
        return;
      }

      // PRIORIDADE 3: Se já é uma data URL, usar diretamente
      if (imageUrl?.startsWith('data:')) {
        console.log('✅ Usando data URL direto');
        setProxiedUrl(imageUrl);
        setIsLoading(false);
        setHasError(false);
        return;
      }

      // PRIORIDADE 3: Tentar baixar via proxy se temos messageKey
      if (!storedMessageKey) {
        console.log('⏳ Aguardando messageKey para baixar imagem...');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        console.log('🖼️ Baixando imagem via proxy com messageKey:', storedMessageKey);

        const response = await apiRequest('/api/evolution/proxy-media', {
          method: 'POST',
          body: JSON.stringify({
            userId: USER_ID_WHATSAPP,
            messageKey: storedMessageKey,
          }),
        });

        if (!response?.success) {
          throw new Error(response?.error || 'Falha ao baixar imagem');
        }

        if (response.base64) {
          console.log('✅ Imagem baixada, criando data URL');
          const mimeType = response.mimetype || 'image/jpeg';
          const dataUrl = `data:${mimeType};base64,${response.base64}`;
          setProxiedUrl(dataUrl);
        } else {
          throw new Error('Base64 da imagem não retornado');
        }
      } catch (error) {
        console.error('❌ Erro ao baixar imagem:', error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();
  }, [imageUrl, imageBase64, mediaDataUrl, storedMessageKey]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px] rounded-lg bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasError || !proxiedUrl) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center min-h-[200px] rounded-lg p-4",
        isReceived ? "bg-destructive/10" : "bg-white/10"
      )}>
        <p className="text-sm font-medium mb-2">⚠️ Erro ao carregar imagem</p>
        {imageUrl && (
          <a 
            href={imageUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs underline opacity-70 hover:opacity-100"
          >
            Tentar abrir em nova aba
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="relative group">
      <img
        src={proxiedUrl}
        alt={caption || "Imagem"}
        className="rounded-lg max-w-full h-auto max-h-[400px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => window.open(proxiedUrl, "_blank")}
      />
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white"
        onClick={() => {
          const a = document.createElement('a');
          a.href = proxiedUrl;
          a.download = caption || 'imagem.jpg';
          a.click();
        }}
      >
        <Download className="h-4 w-4" />
      </Button>
      {caption && (
        <p className="text-sm mt-2">{caption}</p>
      )}
    </div>
  );
}
