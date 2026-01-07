import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Video, Play, Trash2, Download, Loader2, Circle, Clock, Calendar, FileVideo, RefreshCw, CheckCircle } from "lucide-react";

interface Gravacao {
  id: string;
  reuniaoId: string;
  tenantId: string;
  roomId100ms: string;
  sessionId100ms: string;
  recordingId100ms: string;
  status: string;
  startedAt: string;
  stoppedAt: string | null;
  duration: number | null;
  fileUrl: string | null;
  fileSize: number | null;
  thumbnailUrl: string | null;
  createdAt: string;
  reuniao: {
    id: string;
    titulo: string;
    nome: string | null;
    email: string | null;
    dataInicio: string;
    dataFim: string;
  } | null;
}

import { MeetingHeader } from "@/components/MeetingHeader";

import { useGravacoes } from "@/features/reuniao-platform/hooks/useGravacoes";

export default function Gravacoes() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedGravacao, setSelectedGravacao] = useState<Gravacao | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [isLoadingPlayback, setIsLoadingPlayback] = useState(false);

  const { gravacoes = [], isLoading, refetch, deleteGravacao, getPlaybackUrl } = useGravacoes();

  const { data: activeRecordings = [] } = useQuery<any[]>({
    queryKey: ["/api/100ms/active-recordings"],
    refetchInterval: 5000,
  });

  const refreshMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/api/gravacoes/${id}/refresh`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["gravacoes"] });
      if (data.success && data.recording?.status === 'completed') {
        toast({
          title: "Gravação pronta",
          description: "A gravação está disponível para assistir.",
        });
      } else {
        toast({
          title: "Processando",
          description: data.message || "A gravação ainda está sendo processada.",
        });
      }
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o status da gravação.",
      });
    },
  });

  const handlePlayRecording = async (gravacao: Gravacao) => {
    setSelectedGravacao(gravacao);
    setIsLoadingPlayback(true);
    setPlaybackUrl(null);

    try {
      const response = await api.get(`/api/gravacoes/${gravacao.id}/playback`);
      setPlaybackUrl(response.data.url);
    } catch (error: any) {
      const errorData = error.response?.data;
      const errorMessage = errorData?.message || "Não foi possível carregar a gravação.";
      
      if (errorData?.status === 'failed') {
        queryClient.invalidateQueries({ queryKey: ["gravacoes"] });
      }
      
      toast({
        variant: "destructive",
        title: "Erro",
        description: errorMessage,
      });
      setSelectedGravacao(null);
    } finally {
      setIsLoadingPlayback(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "recording":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200 animate-pulse dark:bg-red-900 dark:text-red-300 dark:border-red-800">
            <Circle className="h-2 w-2 fill-current mr-1" />
            Gravando
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-800">
            Concluída
          </Badge>
        );
      case "processing":
      case "stopped":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-800">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Processando
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-800">
            Falhou
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">{status}</Badge>
        );
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Carregando gravações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <MeetingHeader 
          title="Gravações" 
          description="Visualize e gerencie as gravações das suas reuniões." 
        />
        <div className="flex items-center gap-2 px-3 py-1 bg-secondary/20 rounded-full border border-secondary/30">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-medium text-secondary-foreground">Supabase Sincronizado</span>
        </div>
      </div>

      {gravacoes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileVideo className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma gravação encontrada</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Quando você gravar uma reunião, as gravações aparecerão aqui.
              Para gravar, clique no botão de gravação durante uma reunião.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Suas Gravações
            </CardTitle>
            <CardDescription>
              {gravacoes.length} gravação{gravacoes.length !== 1 ? "ões" : ""} encontrada{gravacoes.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reunião</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gravacoes.map((gravacao) => (
                  <TableRow key={gravacao.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {gravacao.reuniao?.titulo || "Reunião sem título"}
                        </p>
                        {gravacao.reuniao?.nome && (
                          <p className="text-sm text-muted-foreground">
                            {gravacao.reuniao.nome}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(gravacao.startedAt || gravacao.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {format(new Date(gravacao.startedAt || gravacao.createdAt), "HH:mm", { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(gravacao.status)}
                    </TableCell>
                    <TableCell>
                      {formatDuration(gravacao.duration)}
                    </TableCell>
                    <TableCell>
                      {formatFileSize(gravacao.fileSize)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(gravacao.status === "completed" || gravacao.status === "stopped" || gravacao.status === "processing") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePlayRecording(gravacao)}
                            data-testid={`button-play-${gravacao.id}`}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Assistir
                          </Button>
                        )}
                        {(gravacao.status === "stopped" || gravacao.status === "processing") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refreshMutation.mutate(gravacao.id)}
                            disabled={refreshMutation.isPending}
                            data-testid={`button-refresh-${gravacao.id}`}
                          >
                            <RefreshCw className={`h-4 w-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                          </Button>
                        )}
                        {gravacao.status === "completed" && gravacao.fileUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a href={gravacao.fileUrl} download>
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {gravacao.status === "failed" && (
                          <span className="text-sm text-muted-foreground">
                            Falha no processamento
                          </span>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir gravação?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. A gravação será excluída permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteGravacao(gravacao.id)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedGravacao} onOpenChange={(open) => !open && setSelectedGravacao(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedGravacao?.reuniao?.titulo || "Gravação da Reunião"}
            </DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            {isLoadingPlayback ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            ) : playbackUrl ? (
              <video
                src={playbackUrl}
                controls
                autoPlay
                className="w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                <p>Não foi possível carregar o vídeo</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
