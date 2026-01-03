import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Meeting100ms } from "@/components/Meeting100ms";
import { useReuniao } from "@/hooks/useReuniao";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Download, Play, Loader2, Copy, Check, Share2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

export default function Reuniao() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const meetingId = params.id;
  const { meeting, loading, error } = useReuniao(meetingId);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopyLink = async () => {
    if (meeting?.linkReuniao) {
      try {
        await navigator.clipboard.writeText(meeting.linkReuniao);
        setCopied(true);
        toast({
          title: "Link copiado!",
          description: "O link da reunião foi copiado para a área de transferência.",
        });
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        toast({
          title: "Erro",
          description: "Não foi possível copiar o link.",
          variant: "destructive",
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Carregando reunião...</p>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h1 className="text-2xl font-bold">Reunião não encontrada</h1>
        <Button onClick={() => setLocation("/dashboard")}>Voltar ao Dashboard</Button>
      </div>
    );
  }

  if (meeting.status === 'concluida') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
             <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{meeting.titulo}</h1>
              <Badge className="bg-green-100 text-green-700 border-green-200">Concluída</Badge>
             </div>
             <p className="text-muted-foreground mt-1">Participante: {meeting.nome} • {meeting.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>Gravação e Transcrição</CardTitle>
              <CardDescription>Acesse o conteúdo gravado da reunião.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="recording">
                <TabsList className="mb-4">
                  <TabsTrigger value="recording">Gravação de Vídeo</TabsTrigger>
                  <TabsTrigger value="transcript">Transcrição (IA)</TabsTrigger>
                  <TabsTrigger value="summary">Resumo Inteligente</TabsTrigger>
                </TabsList>
                
                <TabsContent value="recording" className="space-y-4">
                  <div className="aspect-video bg-black rounded-lg flex items-center justify-center relative group cursor-pointer overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=60" className="w-full h-full object-cover opacity-60" alt="Thumbnail" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-16 w-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Play className="h-8 w-8 text-white fill-current ml-1" />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Duração: {meeting.duracao || 45} min</span>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" /> Download MP4
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="transcript" className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg h-[400px] overflow-y-auto space-y-4 text-sm font-mono leading-relaxed">
                    <p><span className="text-blue-600 font-bold">00:00 [Você]:</span> Olá, bom dia! Vamos começar nossa reunião de alinhamento?</p>
                    <p><span className="text-green-600 font-bold">00:15 [Cliente]:</span> Bom dia! Sim, estou pronto. Gostaria de discutir os prazos.</p>
                    <p><span className="text-blue-600 font-bold">00:30 [Você]:</span> Perfeito. Sobre os prazos, temos novidades...</p>
                    <p className="text-muted-foreground italic text-center py-8">... transcrição completa carregada via n8n ...</p>
                  </div>
                </TabsContent>

                <TabsContent value="summary">
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200">
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-yellow-600" />
                        Resumo Executivo
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        A reunião focou no alinhamento de expectativas quanto aos prazos de entrega do projeto.
                        Ficou decidido que o MVP será entregue em 2 semanas. O cliente concordou com o escopo reduzido para a primeira fase.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Próximos Passos (Action Items)</h4>
                      <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                        <li>Enviar cronograma atualizado por email (Responsável: Você)</li>
                        <li>Validar acesso ao ambiente de homologação (Responsável: Cliente)</li>
                        <li>Agendar follow-up para dia 15 (Responsável: Você)</li>
                      </ul>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Detalhes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <span className="text-muted-foreground block">Data</span>
                  <span className="font-medium">
                    {format(new Date(meeting.dataInicio), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Horário</span>
                  <span className="font-medium">
                    {format(new Date(meeting.dataInicio), "HH:mm", { locale: ptBR })} - {format(new Date(meeting.dataFim), "HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <div>
                   <span className="text-muted-foreground block">ID da Sala</span>
                   <span className="font-mono text-xs bg-muted px-2 py-1 rounded select-all">{meeting.roomId100ms || "N/A"}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#0f1115] overflow-hidden fixed inset-0 z-[100]">
      <div className="h-full w-full">
         <Meeting100ms 
           roomId={meeting.roomId100ms || "room-test"} 
           meetingId={meetingId!}
           onLeave={() => window.close()} 
         />
      </div>
    </div>
  );
}
