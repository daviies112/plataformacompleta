import { useState } from "react";
import { useGravacoes } from "@/features/reuniao-platform/hooks/useGravacoes";
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
import { Video, Play, Trash2, Download, Loader2, Circle, Clock, Calendar, FileVideo } from "lucide-react";

interface Gravacao {
  id: string;
  reuniao_id: string;
  tenant_id: string;
  room_id_100ms: string;
  session_id_100ms: string;
  recording_id_100ms: string;
  status: string;
  started_at: string;
  stopped_at: string | null;
  duration: number | null;
  file_url: string | null;
  file_size: number | null;
  thumbnail_url: string | null;
  created_at: string;
  reuniao?: {
    id: string;
    titulo: string;
    nome: string | null;
    email: string | null;
    dataInicio: string;
    dataFim: string;
  } | null;
}

export default function Gravacoes() {
  const { toast } = useToast();
  const { gravacoes, isLoading, deleteGravacao, getPlaybackUrl, isFetchingUrl, isDeleting } = useGravacoes();
  const [selectedGravacao, setSelectedGravacao] = useState<Gravacao | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);

  const handlePlayRecording = async (gravacao: Gravacao) => {
    setSelectedGravacao(gravacao);
    setPlaybackUrl(null);

    try {
      getPlaybackUrl(gravacao.id, {
        onSuccess: (response: any) => {
          setPlaybackUrl(response.url || response.data?.url);
        },
        onError: (error: any) => {
          const errorMessage = error?.message || "Não foi possível carregar a gravação.";
          toast({
            variant: "destructive",
            title: "Erro",
            description: errorMessage,
          });
          setSelectedGravacao(null);
        },
      } as any);
    } catch (error: any) {
      const errorMessage = error?.message || "Não foi possível carregar a gravação.";
      toast({
        variant: "destructive",
        title: "Erro",
        description: errorMessage,
      });
      setSelectedGravacao(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "recording":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200 animate-pulse">
            <Circle className="h-2 w-2 fill-current mr-1" />
            Gravando
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            Concluída
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
            Processando
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gravações</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie as gravações das suas reuniões.
          </p>
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
                        {format(new Date(gravacao.started_at || gravacao.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {format(new Date(gravacao.started_at || gravacao.created_at), "HH:mm", { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(gravacao.status)}
                    </TableCell>
                    <TableCell>
                      {formatDuration(gravacao.duration)}
                    </TableCell>
                    <TableCell>
                      {formatFileSize(gravacao.file_size)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {gravacao.status === "completed" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePlayRecording(gravacao)}
                              disabled={isFetchingUrl}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Assistir
                            </Button>
                            {gravacao.file_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                              >
                                <a href={gravacao.file_url} download>
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </>
                        )}
                        {gravacao.status === "failed" && (
                          <span className="text-sm text-muted-foreground">
                            Gravação muito curta
                          </span>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" disabled={isDeleting}>
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
                                disabled={isDeleting}
                              >
                                {isDeleting ? "Excluindo..." : "Excluir"}
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
            {isFetchingUrl ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            ) : playbackUrl ? (
              <video
                key={playbackUrl}
                controls
                autoPlay
                className="w-full h-full"
                playsInline
                controlsList="nodownload"
                onError={(e) => {
                  console.error('[VIDEO] Erro ao carregar vídeo:', e);
                  console.error('[VIDEO] URL:', playbackUrl);
                  toast({
                    variant: "destructive",
                    title: "Erro ao carregar vídeo",
                    description: "O navegador não conseguiu carregar o vídeo. Pode ser um problema de CORS ou a URL expirou.",
                  });
                }}
              >
                <source src={playbackUrl} type="video/mp4" />
                <source src={playbackUrl} type="video/webm" />
                Seu navegador não suporta a reprodução de vídeos.
              </video>
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
