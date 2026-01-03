import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, ArrowRight, Users, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InstantMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: {
    id: string;
    linkReuniao: string;
    titulo: string;
  } | null;
}

export function InstantMeetingModal({ isOpen, onClose, meeting }: InstantMeetingModalProps) {
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
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
        setTimeout(() => setCopied(false), 3000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  const handleJoinNow = () => {
    console.log("handleJoinNow - meeting data:", meeting);
    if (meeting?.linkReuniao) {
      const url = meeting.linkReuniao.startsWith('http') 
        ? meeting.linkReuniao 
        : `${window.location.origin}${meeting.linkReuniao}`;
      
      console.log("Opening URL:", url);
      window.open(url, "_blank");
      onClose();
    } else {
      console.error("Meeting link missing!");
      toast({
        title: "Erro",
        description: "Link da reunião não encontrado.",
        variant: "destructive"
      });
    }
  };

  const handleInvite = () => {
    const url = meeting?.linkReuniao 
      ? (meeting.linkReuniao.startsWith('http') ? meeting.linkReuniao : `${window.location.origin}${meeting.linkReuniao}`)
      : "";
    
    if (url) {
      const text = encodeURIComponent(`Olá! Você foi convidado para uma reunião: ${meeting?.titulo || 'Reunião'}\nEntre pelo link: ${url}`);
      window.open(`https://wa.me/?text=${text}`, "_blank");
      
      toast({
        title: "Convite",
        description: "Abrindo compartilhamento via WhatsApp.",
      });
    }
  };

  const displayUrl = meeting?.linkReuniao 
    ? (meeting.linkReuniao.startsWith('http') ? meeting.linkReuniao : `${window.location.origin}${meeting.linkReuniao}`)
    : "";

  console.log("Modal Render - meeting:", meeting);
  console.log("Modal Render - displayUrl:", displayUrl);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 p-6 rounded-3xl border-none shadow-2xl z-[9999]">
        <DialogHeader className="flex flex-col items-center gap-4 py-4">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Check className="h-10 w-10 text-green-600 dark:text-green-500" />
          </div>
          <DialogTitle className="text-2xl font-bold text-center">Reunião criada!</DialogTitle>
          <p className="text-muted-foreground text-center text-sm px-4">
            Compartilhe o link abaixo com os participantes para iniciarem.
          </p>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
              <span className="text-xs">🔗</span>
            </div>
            <Input
              readOnly
              value={displayUrl}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 pl-10 pr-10 h-12 rounded-xl font-mono text-sm text-blue-600 select-all focus-visible:ring-1"
            />
            <Button 
              size="icon" 
              variant="ghost" 
              className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 hover:bg-transparent"
              onClick={handleCopyLink}
            >
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-zinc-400" />}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="h-12 rounded-xl gap-2 border-zinc-200"
              onClick={handleInvite}
            >
              <Users className="h-4 w-4" />
              Convidar
            </Button>
            <Button 
              variant="outline" 
              className="h-12 rounded-xl gap-2 border-zinc-200"
              onClick={handleCopyLink}
            >
              <Copy className="h-4 w-4" />
              Copiar
            </Button>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-3 sm:justify-center pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <Button 
            onClick={handleJoinNow}
            className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold shadow-lg shadow-blue-500/20 gap-2 group transition-all"
          >
            Participar agora
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button 
            variant="ghost" 
            className="text-zinc-500 hover:text-zinc-800"
            onClick={onClose}
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
