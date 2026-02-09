import { useState, useRef, useEffect } from "react";
import { Play, Pause, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "../lib/utils";
import { apiRequest, USER_ID_WHATSAPP } from "../lib/apiClient";

interface AudioPlayerProps {
  audioUrl?: string;
  audioBase64?: string;
  mediaDataUrl?: string; // Novo: data URL completo com mimeType
  isReceived?: boolean;
  messageKey?: any; // Key da mensagem para baixar mídia
}

export function AudioPlayer({ audioUrl, audioBase64, mediaDataUrl, isReceived = false, messageKey }: AudioPlayerProps) {
  // Atualizar messageKey quando recebido
  const [storedMessageKey, setStoredMessageKey] = useState<any>(messageKey);
  
  useEffect(() => {
    if (messageKey) {
      console.log('🔑 MessageKey recebido:', messageKey);
      setStoredMessageKey(messageKey);
    }
  }, [messageKey]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [proxiedUrl, setProxiedUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);


  // Baixar áudio via proxy ao montar
  useEffect(() => {
    const loadAudio = async () => {
      // PRIORIDADE 1: mediaDataUrl (formato normalizado do backend)
      if (mediaDataUrl) {
        console.log('✅ Usando mediaDataUrl do backend!');
        setProxiedUrl(mediaDataUrl);
        setIsLoading(false);
        setHasError(false);
        return;
      }

      // PRIORIDADE 2: Se já temos base64, criar data URL direto
      if (audioBase64) {
        console.log('✅ Usando base64 direto da mensagem!', {
          length: audioBase64.length
        });
        // Detectar formato do áudio pelo base64
        const mimeType = audioBase64.startsWith('/9j/') ? 'audio/mp3' :
                        audioBase64.startsWith('T2dn') ? 'audio/ogg' :
                        'audio/ogg'; // Default para WhatsApp
        const dataUrl = `data:${mimeType};base64,${audioBase64}`;
        setProxiedUrl(dataUrl);
        setIsLoading(false);
        setHasError(false);
        return;
      }

      // PRIORIDADE 3: Se já é uma data URL, usar diretamente
      if (audioUrl?.startsWith('data:')) {
        console.log('✅ Usando data URL direto');
        setProxiedUrl(audioUrl);
        setIsLoading(false);
        setHasError(false);
        return;
      }

      // PRIORIDADE 3: Tentar baixar via proxy se temos messageKey
      if (!storedMessageKey) {
        console.log('⏳ Aguardando messageKey para baixar áudio...');
        setErrorMessage('Áudio em processamento...');
        setHasError(true);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        console.log('🎵 Baixando áudio via proxy com messageKey:', storedMessageKey);

        const response = await apiRequest('/api/evolution/proxy-media', {
          method: 'POST',
          body: JSON.stringify({
            userId: USER_ID_WHATSAPP,
            messageKey: storedMessageKey,
          }),
        });

        if (!response?.success) {
          throw new Error(response?.error || 'Falha ao baixar áudio');
        }

        if (response.base64) {
          console.log('✅ Áudio baixado, criando data URL');
          const mimeType = response.mimetype || 'audio/ogg';
          const dataUrl = `data:${mimeType};base64,${response.base64}`;
          setProxiedUrl(dataUrl);
        } else {
          throw new Error('Base64 do áudio não retornado');
        }
      } catch (error) {
        console.error('❌ Erro ao baixar áudio:', error);
        setHasError(true);
        setErrorMessage('Erro ao carregar áudio');
      } finally {
        setIsLoading(false);
      }
    };

    loadAudio();
  }, [audioUrl, audioBase64, mediaDataUrl, storedMessageKey]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !proxiedUrl) return;

    console.log('🎵 AudioPlayer configurado com URL:', { 
      url: proxiedUrl?.substring(0, 100),
      urlLength: proxiedUrl?.length,
    });

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      console.log('🎵 Duração carregada:', audio.duration);
      setDuration(audio.duration);
    };
    const handleEnded = () => setIsPlaying(false);
    
    const handleError = (e: Event) => {
      const audioElement = e.target as HTMLAudioElement;
      const error = audioElement.error;
      
      let errorMsg = "Erro ao carregar áudio";
      if (error) {
        switch (error.code) {
          case error.MEDIA_ERR_ABORTED:
            errorMsg = "Carregamento do áudio foi cancelado";
            break;
          case error.MEDIA_ERR_NETWORK:
            errorMsg = "Erro de rede ao carregar áudio";
            break;
          case error.MEDIA_ERR_DECODE:
            errorMsg = "Erro ao decodificar áudio";
            break;
          case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMsg = "Formato de áudio não suportado";
            break;
        }
      }
      
      console.error('🎵 ERRO NO ÁUDIO:', {
        errorCode: error?.code,
        errorMessage: error?.message,
        errorMsg,
        url: audioUrl,
        networkState: audioElement.networkState,
        readyState: audioElement.readyState
      });
      
      setHasError(true);
      setErrorMessage(errorMsg);
    };

    const handleCanPlay = () => {
      console.log('🎵 Áudio pode ser reproduzido');
      setHasError(false);
    };

    const handleLoadStart = () => {
      console.log('🎵 Iniciando carregamento do áudio');
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadstart', handleLoadStart);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('loadstart', handleLoadStart);
    };
  }, [proxiedUrl]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('🎵 Erro ao tocar:', error);
      setIsPlaying(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!audioUrl && !audioBase64 && !mediaDataUrl) {
    return <div className="text-sm text-muted-foreground">❌ Áudio não disponível</div>;
  }

  if (isLoading) {
    return (
      <div className={cn(
        "flex items-center gap-3 min-w-[240px]",
        isReceived ? "text-foreground" : "text-message-sent-foreground"
      )}>
        <div className="h-10 w-10 rounded-full bg-primary/10 animate-pulse" />
        <div className="flex-1">
          <div className="h-1 rounded-full bg-muted animate-pulse" />
          <div className="text-xs mt-1 text-muted-foreground">Carregando áudio...</div>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={cn(
        "flex items-center gap-2 p-2 rounded-lg",
        isReceived ? "bg-destructive/10" : "bg-white/10"
      )}>
        <div className="text-sm">
          <p className="font-medium">⚠️ Erro ao carregar áudio</p>
          <p className="text-xs opacity-70">{errorMessage}</p>
          <a 
            href={audioUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs underline opacity-70 hover:opacity-100"
          >
            Tentar abrir em nova aba
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-3 min-w-[240px]",
      isReceived ? "text-foreground" : "text-message-sent-foreground"
    )}>
      <audio 
        ref={audioRef} 
        src={proxiedUrl || undefined} 
        preload="metadata"
      />
      
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-10 w-10 rounded-full shrink-0",
          isReceived ? "hover:bg-primary/10 text-primary" : "hover:bg-white/10 text-white"
        )}
        onClick={togglePlayPause}
      >
        {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
      </Button>

      <div className="flex-1 min-w-0">
        <div className={cn("h-1 rounded-full overflow-hidden", isReceived ? "bg-muted" : "bg-white/20")}>
          <div 
            className={cn("h-full transition-all", isReceived ? "bg-primary" : "bg-white")}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className={cn("text-xs mt-1", isReceived ? "text-muted-foreground" : "text-message-sent-foreground/70")}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8 shrink-0", isReceived ? "hover:bg-primary/10 text-muted-foreground" : "hover:bg-white/10 text-message-sent-foreground/70")}
        onClick={() => {
          const a = document.createElement('a');
          a.href = proxiedUrl || audioUrl || '';
          a.download = 'audio.ogg';
          a.click();
        }}
      >
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
}
