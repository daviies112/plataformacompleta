import { useState, useRef } from "react";
import { Mic, Square, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "../lib/utils";
import { toast } from "sonner";

interface AudioRecorderProps {
  onSendAudio: (audioBlob: Blob) => Promise<void>;
  disabled?: boolean;
}

export function AudioRecorder({ onSendAudio, disabled }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        
        // Parar todas as tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Enviar o áudio
        if (audioBlob.size > 0) {
          setIsSending(true);
          try {
            await onSendAudio(audioBlob);
            toast.success("Áudio enviado!", { duration: 2000 });
          } catch (error) {
            console.error('Erro ao enviar áudio:', error);
            toast.error("Erro ao enviar áudio", {
              description: error instanceof Error ? error.message : "Erro desconhecido"
            });
          } finally {
            setIsSending(false);
          }
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Timer para mostrar tempo de gravação
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      toast.info("Gravando áudio...", { duration: 1000 });
    } catch (error) {
      console.error('Erro ao acessar microfone:', error);
      toast.error("Erro ao acessar microfone", {
        description: "Permita o acesso ao microfone para gravar áudio"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isRecording) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 rounded-lg border border-destructive/20">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
          <span className="text-sm font-medium text-destructive">
            Gravando {formatTime(recordingTime)}
          </span>
        </div>
        <Button
          onClick={stopRecording}
          size="icon"
          variant="destructive"
          disabled={isSending}
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Square className="h-4 w-4 fill-current" />
          )}
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={startRecording}
      disabled={disabled || isSending}
      size="icon"
      variant="ghost"
      className="shrink-0"
      title="Gravar áudio"
    >
      <Mic className="h-5 w-5" />
    </Button>
  );
}
