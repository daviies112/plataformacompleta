import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Mail, ArrowRight, Link as LinkIcon, Users, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InstantMeetingModalProps {
  open: boolean;
  onClose: () => void;
  meeting: {
    id: string;
    linkReuniao: string;
    titulo: string;
  } | null;
  onJoin: () => void;
}

export function InstantMeetingModal({ open, onClose, meeting, onJoin }: InstantMeetingModalProps) {
  const [copied, setCopied] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmails, setInviteEmails] = useState("");
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

  const handleSendInvites = () => {
    const emails = inviteEmails.split(",").map(e => e.trim()).filter(e => e);
    if (emails.length === 0) return;

    const subject = encodeURIComponent(`Convite para reunião: ${meeting?.titulo || "Reunião"}`);
    const body = encodeURIComponent(
      `Olá!\n\nVocê foi convidado(a) para participar de uma reunião.\n\n` +
      `Clique no link abaixo para entrar:\n${meeting?.linkReuniao}\n\n` +
      `Até já!`
    );
    
    window.open(`mailto:${emails.join(",")}?subject=${subject}&body=${body}`, "_blank");
    setInviteEmails("");
    setShowInviteForm(false);
  };

  const handleJoinNow = () => {
    if (meeting?.linkReuniao) {
      const url = meeting.linkReuniao.startsWith('http') 
        ? meeting.linkReuniao 
        : `${window.location.origin}${meeting.linkReuniao}`;
      
      window.open(url, "_blank");
      onClose();
    } else {
      onJoin();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-none shadow-2xl bg-white rounded-[24px]">
        <div className="p-8 space-y-8 flex flex-col items-center text-center">
          <div className="space-y-4 flex flex-col items-center">
            <div className="h-16 w-16 rounded-full bg-green-50 flex items-center justify-center border-4 border-white shadow-sm ring-1 ring-green-100">
              <Check className="h-8 w-8 text-green-500" strokeWidth={3} />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Reunião criada!</h2>
              <p className="text-sm text-zinc-500 max-w-[280px]">
                Compartilhe o link abaixo com os participantes para iniciarem.
              </p>
            </div>
          </div>
          
          <div className="w-full space-y-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <LinkIcon className="h-4 w-4 text-zinc-400" />
              </div>
              <Input
                readOnly
                value={meeting?.linkReuniao || ""}
                className="pl-11 pr-12 h-14 bg-zinc-50 border-zinc-200 text-zinc-600 rounded-2xl font-medium focus-visible:ring-zinc-200"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyLink}
                className="absolute right-2 top-2 h-10 w-10 rounded-xl hover:bg-white hover:shadow-sm text-zinc-500 transition-all"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            {!showInviteForm ? (
              <div className="grid grid-cols-2 gap-3 w-full">
                <Button
                  variant="outline"
                  className="h-12 rounded-2xl gap-2 font-semibold border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                  onClick={() => setShowInviteForm(true)}
                >
                  <Users className="h-4 w-4" />
                  Convidar
                </Button>
                <Button
                  variant="outline"
                  className="h-12 rounded-2xl gap-2 font-semibold border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                  onClick={handleCopyLink}
                >
                  <Copy className="h-4 w-4" />
                  Copiar
                </Button>
              </div>
            ) : (
              <div className="space-y-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-zinc-400" />
                    Convidar por email
                  </h4>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg text-zinc-400"
                    onClick={() => setShowInviteForm(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="exemplo@email.com"
                    value={inviteEmails}
                    onChange={(e) => setInviteEmails(e.target.value)}
                    className="h-10 bg-white border-zinc-200 rounded-xl"
                  />
                  <Button
                    onClick={handleSendInvites}
                    size="sm"
                    className="h-10 rounded-xl px-4 bg-zinc-900 hover:bg-zinc-800"
                  >
                    Enviar
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="w-full flex flex-col gap-2">
            <Button 
              onClick={handleJoinNow} 
              className="w-full h-14 rounded-2xl text-base font-bold gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Participar agora
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              onClick={onClose}
              className="w-full h-12 rounded-2xl text-zinc-400 font-medium hover:bg-transparent hover:text-zinc-600"
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
