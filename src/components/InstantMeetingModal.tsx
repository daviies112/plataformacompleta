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
    if (meeting?.linkReuniao) {
      const url = meeting.linkReuniao.startsWith('http') 
        ? meeting.linkReuniao 
        : `${window.location.origin}${meeting.linkReuniao}`;
      
      window.open(url, "_blank");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 p-6 rounded-3xl border-none shadow-2xl">
        <DialogHeader className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-500" />
          </div>
          <DialogTitle className="text-2xl font-bold text-center">Reunião Criada!</DialogTitle>
          <p className="text-muted-foreground text-center">
            Sua reunião instantânea "{meeting?.titulo}" está pronta.
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Link da Reunião</label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={meeting?.linkReuniao || ""}
                className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
              />
              <Button size="icon" variant="outline" onClick={handleCopyLink}>
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Convidar por E-mail</label>
            <div className="flex gap-2">
              <Input
                placeholder="email@exemplo.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
              />
              <Button variant="outline" className="gap-2">
                <Users className="h-4 w-4" />
                Convidar
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-center pt-2">
          <Button 
            onClick={handleJoinNow}
            className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold shadow-lg shadow-blue-500/30 gap-2 group transition-all"
          >
            Participar agora
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
